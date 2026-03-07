resource "google_firebase_ai_logic_prompt_template" "generate_topic" {
  provider        = google
  display_name    = "MemoTattoo-Generatate-Topic-v1"
  location        = "us-central1"
  project         = "ai-logic-demos"
  template_id     = "memotattoo-generatate-topic-v1"
  template_string = file("${path.module}/../prompts/memotattoo-generatate-topic-v1.prompt")
}

resource "google_firebase_ai_logic_prompt_template" "generate_concept" {
  provider        = google
  display_name    = "MemoTattoo-Generate-Concept-Image-v1"
  location        = "us-central1"
  project         = "ai-logic-demos"
  template_id     = "memotattoo-generate-concept-image-v1"
  template_string = file("${path.module}/../prompts/memotattoo-generate-concept-image-v1.prompt")
}

resource "google_firebase_ai_logic_prompt_template" "refine_image" {
  provider        = google
  display_name    = "memotattoo-refine-image-v1"
  location        = "us-central1"
  project         = "ai-logic-demos"
  template_id     = "memotattoo-refine-image-v1"
  template_string = file("${path.module}/../prompts/memotattoo-refine-image-v1.prompt")
}

resource "google_firebase_ai_logic_prompt_template" "brainstorm" {
  provider        = google
  display_name    = "memotattoo-brainstorm-more-v1"
  location        = "us-central1"
  project         = "ai-logic-demos"
  template_id     = "memotattoo-brainstorm-more-v1"
  template_string = file("${path.module}/../prompts/memotattoo-brainstorm-more-v1.prompt")
}
