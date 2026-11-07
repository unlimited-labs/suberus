from fastapi import APIRouter, Depends, Response

from core.security import require_token
from idml import build_idml
from idml_models import PrintDocument

router = APIRouter(prefix="/v1", dependencies=[Depends(require_token)])


@router.post("/idml")
def idml(doc: PrintDocument) -> Response:
    return Response(build_idml(doc), media_type="application/vnd.adobe.indesign-idml-package")
