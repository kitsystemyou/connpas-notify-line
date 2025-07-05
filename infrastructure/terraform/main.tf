terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "asia-northeast1"
}

variable "line_channel_access_token" {
  description = "LINE Channel Access Token"
  type        = string
  sensitive   = true
}

# Firestore Database
resource "google_firestore_database" "database" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
}

# Secret Manager for LINE Token
resource "google_secret_manager_secret" "line_token" {
  project   = var.project_id
  secret_id = "line-channel-access-token"
  
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "line_token_version" {
  secret      = google_secret_manager_secret.line_token.id
  secret_data = var.line_channel_access_token
}

# Cloud Scheduler Job
resource "google_cloud_scheduler_job" "reminder_job" {
  name     = "connpass-reminder-job"
  schedule = "0 */6 * * *"  # Every 6 hours
  time_zone = "Asia/Tokyo"
  
  http_target {
    uri         = "https://${var.region}-${var.project_id}.cloudfunctions.net/connpass-reminder"
    http_method = "POST"
    
    headers = {
      "Content-Type" = "application/json"
    }
    
    body = base64encode(jsonencode({
      "type" = "scheduled"
    }))
  }
}

# IAM for Cloud Functions
resource "google_project_iam_member" "function_invoker" {
  project = var.project_id
  role    = "roles/cloudfunctions.invoker"
  member  = "serviceAccount:${var.project_id}@appspot.gserviceaccount.com"
}

resource "google_project_iam_member" "firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${var.project_id}@appspot.gserviceaccount.com"
}

resource "google_project_iam_member" "secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${var.project_id}@appspot.gserviceaccount.com"
}

output "function_url" {
  value = "https://${var.region}-${var.project_id}.cloudfunctions.net/connpass-reminder"
}