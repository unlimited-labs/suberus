variable "REGISTRY" {
  default = "registry.wimiip.eu"
}

variable "IMAGE_NAME" {
  default = "suberus/app"
}

variable "TAG" {
  default = "latest"
}

variable "GIT_COMMIT" {
  default = "unknown"
}

variable "BUILD_DATE" {
  default = "unknown"
}

group "default" {
  targets = ["app", "migrate", "docling", "planner"]
}

target "app" {
  context    = "."
  dockerfile = "Dockerfile"
  tags = [
    "${REGISTRY}/${IMAGE_NAME}:${TAG}",
    "${REGISTRY}/${IMAGE_NAME}:latest",
  ]
  args = {
    GIT_COMMIT = "${GIT_COMMIT}"
    BUILD_DATE = "${BUILD_DATE}"
  }
  cache-from = ["type=registry,ref=${REGISTRY}/${IMAGE_NAME}:cache"]
  cache-to   = ["type=registry,ref=${REGISTRY}/${IMAGE_NAME}:cache,mode=max"]
}

target "migrate" {
  context    = "."
  dockerfile = "Dockerfile"
  target     = "migrate"
  tags = [
    "${REGISTRY}/${IMAGE_NAME}:migrate-${TAG}",
    "${REGISTRY}/${IMAGE_NAME}:migrate-latest",
  ]
  cache-from = ["type=registry,ref=${REGISTRY}/${IMAGE_NAME}:migrate-cache"]
  cache-to   = ["type=registry,ref=${REGISTRY}/${IMAGE_NAME}:migrate-cache,mode=max"]
}

target "docling" {
  context    = "./services/docling-api"
  dockerfile = "Dockerfile"
  tags = [
    "${REGISTRY}/suberus/docling:${TAG}",
    "${REGISTRY}/suberus/docling:latest",
  ]
  cache-from = ["type=registry,ref=${REGISTRY}/suberus/docling:cache"]
  cache-to   = ["type=registry,ref=${REGISTRY}/suberus/docling:cache,mode=max"]
}

target "planner" {
  context    = "./services/planner-api"
  dockerfile = "Dockerfile"
  tags = [
    "${REGISTRY}/suberus/planner:${TAG}",
    "${REGISTRY}/suberus/planner:latest",
  ]
  cache-from = ["type=registry,ref=${REGISTRY}/suberus/planner:cache"]
  cache-to   = ["type=registry,ref=${REGISTRY}/suberus/planner:cache,mode=max"]
}
