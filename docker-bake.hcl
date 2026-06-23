variable "REGISTRY" {}

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
  targets = ["app", "migrate", "pdf-api", "docx-api", "planner"]
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

target "pdf-api" {
  context    = "./services/pdf-api"
  dockerfile = "Dockerfile"
  tags = [
    "${REGISTRY}/suberus/pdf-api:${TAG}",
    "${REGISTRY}/suberus/pdf-api:latest",
  ]
  cache-from = ["type=registry,ref=${REGISTRY}/suberus/pdf-api:cache"]
  cache-to   = ["type=registry,ref=${REGISTRY}/suberus/pdf-api:cache,mode=max"]
}


target "docx-api" {
  context    = "./services/docx-api"
  dockerfile = "Dockerfile"
  tags = [
    "${REGISTRY}/suberus/docx-api:${TAG}",
    "${REGISTRY}/suberus/docx-api:latest",
  ]
  cache-from = ["type=registry,ref=${REGISTRY}/suberus/docx-api:cache"]
  cache-to   = ["type=registry,ref=${REGISTRY}/suberus/docx-api:cache,mode=max"]
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
