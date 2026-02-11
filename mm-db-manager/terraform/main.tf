resource "google_project_service" "required" {
  for_each = toset([
    "cloudfunctions.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "run.googleapis.com",
    "storage.googleapis.com",
  ])

  service            = each.key
  disable_on_destroy = false
}

resource "google_storage_bucket" "source" {
  name                        = "${var.project_id}-${var.function_name}-src"
  location                    = var.region
  uniform_bucket_level_access = true

  depends_on = [google_project_service.required]
}

resource "google_storage_bucket_object" "source" {
  name   = "${var.function_name}-${data.archive_file.source.output_md5}.zip"
  bucket = google_storage_bucket.source.name
  source = data.archive_file.source.output_path
}

data "archive_file" "source" {
  type        = "zip"
  source_dir  = var.source_dir
  output_path = "${path.module}/${var.function_name}.zip"
  excludes = [
    ".venv",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".git",
    ".DS_Store",
  ]
}

resource "google_cloudfunctions2_function" "flask" {
  name     = var.function_name
  location = var.region

  build_config {
    runtime     = var.runtime
    entry_point = var.entry_point

    source {
      storage_source {
        bucket = google_storage_bucket.source.name
        object = google_storage_bucket_object.source.name
      }
    }
  }

  service_config {
    available_memory      = var.memory
    timeout_seconds       = var.timeout_seconds
    min_instance_count    = var.min_instance_count
    max_instance_count    = var.max_instance_count
    ingress_settings      = var.ingress_settings
    environment_variables = var.environment_variables
  }

  depends_on = [google_project_service.required]
}

resource "google_cloudfunctions2_function_iam_member" "invoker" {
  count          = var.allow_unauthenticated ? 1 : 0
  project        = var.project_id
  location       = var.region
  cloud_function = google_cloudfunctions2_function.flask.name
  role           = "roles/cloudfunctions.invoker"
  member         = "allUsers"
}
