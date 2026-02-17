variable "REGISTRY" {
  default = "registry.wimiip.eu"
}

variable "IMAGE_NAME" {
  default = "suberus/app"
}

variable "TAG" {
  default = "latest"
}

group "default" {
  targets = ["app", "migrate"]
}

target "app" {
  context    = "."
  dockerfile = "Dockerfile"
  tags = [
    "${REGISTRY}/${IMAGE_NAME}:${TAG}",
    "${REGISTRY}/${IMAGE_NAME}:latest",
  ]
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
