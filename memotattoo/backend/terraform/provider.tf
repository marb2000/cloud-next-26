terraform {
  required_providers {
    google = {
      source  = "hashicorp/google-beta"
      version = ">= 6.0"
    }
  }
}

provider "google" {
  project               = "ai-logic-demos"
  region                = "us-central1"
  user_project_override = true
  billing_project       = "ai-logic-demos"
}
