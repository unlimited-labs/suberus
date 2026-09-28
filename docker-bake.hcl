variable "REGISTRY" {}

variable "IMAGE_NAME" {
  default = "suberus/app"
}

variable "TAG" {
  default = "latest"
}

variable "CALVER" {
  default = ""
}

variable "GIT_COMMIT" {
  default = "unknown"
}

variable "BUILD_DATE" {
  default = "unknown"
}

# Set by GitHub Actions. Never cache to our registry: BuildKit's registry cache export
# opens blob PUTs before taking a connection slot, so they idle past proxy timeouts.
variable "CI" {
  default = ""
}

function "cache_from" {
  params = [scopes]
  result = equal(CI, "true") ? [for s in scopes : "type=gha,scope=${s}"] : []
}

function "cache_to" {
  params = [scope]
  result = equal(CI, "true") ? ["type=gha,scope=${scope},mode=max"] : []
}

group "default" {
  targets = ["app", "migrate", "pdf-api", "docx-api", "planner"]
}

target "_labels" {
  labels = {
    "org.opencontainers.image.revision" = GIT_COMMIT
    "org.opencontainers.image.created"  = BUILD_DATE
  }
}

target "app" {
  inherits   = ["_labels"]
  context    = "."
  dockerfile = "Dockerfile"
  tags = concat([
    "${REGISTRY}/${IMAGE_NAME}:${TAG}",
    "${REGISTRY}/${IMAGE_NAME}:latest",
  ], notequal("", CALVER) ? ["${REGISTRY}/${IMAGE_NAME}:${CALVER}"] : [])
  args = {
    GIT_COMMIT = "${GIT_COMMIT}"
    BUILD_DATE = "${BUILD_DATE}"
  }
  cache-from = cache_from(["app"])
  cache-to   = cache_to("app")
}

target "migrate" {
  inherits   = ["_labels"]
  context    = "."
  dockerfile = "Dockerfile"
  target     = "migrate"
  tags = concat([
    "${REGISTRY}/${IMAGE_NAME}:migrate-${TAG}",
    "${REGISTRY}/${IMAGE_NAME}:migrate-latest",
  ], notequal("", CALVER) ? ["${REGISTRY}/${IMAGE_NAME}:migrate-${CALVER}"] : [])
  cache-from = cache_from(["migrate"])
  cache-to   = cache_to("migrate")
}

target "pdf-api" {
  inherits   = ["_labels"]
  context    = "./services/pdf-api"
  dockerfile = "Dockerfile"
  tags = concat([
    "${REGISTRY}/suberus/pdf-api:${TAG}",
    "${REGISTRY}/suberus/pdf-api:latest",
  ], notequal("", CALVER) ? ["${REGISTRY}/suberus/pdf-api:${CALVER}"] : [])
  cache-from = cache_from(["pdf-api"])
  cache-to   = cache_to("pdf-api")
}

target "docx-api" {
  inherits   = ["_labels"]
  context    = "./services/docx-api"
  dockerfile = "Dockerfile"
  target     = "runtime"
  tags = concat([
    "${REGISTRY}/suberus/docx-api:${TAG}",
    "${REGISTRY}/suberus/docx-api:latest",
  ], notequal("", CALVER) ? ["${REGISTRY}/suberus/docx-api:${CALVER}"] : [])
  cache-from = cache_from(["docx-api"])
  cache-to   = cache_to("docx-api")
}

target "planner" {
  inherits   = ["_labels"]
  context    = "./services/planner-api"
  dockerfile = "Dockerfile"
  tags = concat([
    "${REGISTRY}/suberus/planner:${TAG}",
    "${REGISTRY}/suberus/planner:latest",
  ], notequal("", CALVER) ? ["${REGISTRY}/suberus/planner:${CALVER}"] : [])
  cache-from = cache_from(["planner"])
  cache-to   = cache_to("planner")
}
