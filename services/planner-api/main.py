"""
Planner API: constrained k-means clustering for conference session assignment.

Endpoints:
  GET  /            → health check (unversioned)
  POST /v1/cluster  → given N items with embeddings, partition into K clusters
                      each of size in [ceil(N/K) - tol, ceil(N/K) + tol]

Functional endpoints are versioned under /v1 so a future contract change can ship /v2
while older app deploys keep calling /v1. Health stays unversioned at /.

Stateless. Expects embeddings as input (TS side owns pgvector cache).
"""

import math
import os
from typing import Annotated

import numpy as np
from fastapi import APIRouter, FastAPI, HTTPException
from k_means_constrained import KMeansConstrained
from pydantic import BaseModel, Field

app = FastAPI(title="Suberus Planner API")
v1 = APIRouter(prefix="/v1")


class Item(BaseModel):
    id: str
    embedding: list[float] = Field(min_length=1)


class ClusterRequest(BaseModel):
    items: list[Item] = Field(min_length=1)
    session_count: int = Field(ge=1)
    tolerance: int = Field(default=1, ge=0)


class Cluster(BaseModel):
    session_index: int
    member_ids: list[str]


class ClusterResponse(BaseModel):
    clusters: list[Cluster]
    target_per_session: int
    size_min: int
    size_max: int


@app.get("/")
def health() -> dict[str, str]:
    return {"status": "healthy"}


@v1.post("/cluster", response_model=ClusterResponse)
def cluster(req: Annotated[ClusterRequest, ...]) -> ClusterResponse:
    n = len(req.items)
    k = req.session_count

    if k > n:
        raise HTTPException(
            400, f"session_count ({k}) exceeds item count ({n})"
        )

    target = math.ceil(n / k)
    size_min = max(1, target - req.tolerance)
    size_max = target + req.tolerance

    if k * size_min > n:
        raise HTTPException(
            400,
            f"infeasible: {k} clusters with min size {size_min} requires >={k * size_min} items, have {n}",
        )
    if k * size_max < n:
        raise HTTPException(
            400,
            f"infeasible: {k} clusters with max size {size_max} allows <={k * size_max} items, have {n}",
        )

    dim = len(req.items[0].embedding)
    for it in req.items:
        if len(it.embedding) != dim:
            raise HTTPException(
                400, f"embedding dim mismatch for {it.id}: {len(it.embedding)} vs {dim}"
            )

    x = np.array([it.embedding for it in req.items], dtype=np.float32)

    # Normalize so euclidean ≈ cosine-equivalent ordering
    norms = np.linalg.norm(x, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    x = x / norms

    kmc = KMeansConstrained(
        n_clusters=k,
        size_min=size_min,
        size_max=size_max,
        random_state=42,
        n_init=10,
    )
    labels = kmc.fit_predict(x)

    clusters: list[Cluster] = []
    for idx in range(k):
        member_ids = [req.items[i].id for i in range(n) if labels[i] == idx]
        clusters.append(Cluster(session_index=idx, member_ids=member_ids))

    return ClusterResponse(
        clusters=clusters,
        target_per_session=target,
        size_min=size_min,
        size_max=size_max,
    )


app.include_router(v1)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8110"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
