# Examples

Start with the Markdown files in this folder tree. They show the human review path before the supporting JSON and trace artifacts.

## Human Review Artifacts

- `workshop_bulletin_run/publication_packet.md` is the packet a coordinator would inspect before anything is published.
- `workshop_bulletin_run/organizer_digest.md` is the follow-up checklist for unresolved items.
- `evaluations/openai_draft_eval/eval_summary.md` explains the three checked-in AI interpretation, normalization, policy-analysis, and drafting eval cases before the backing JSON.
- `live_openai_trace/langsmith_trace_summary.md` explains the compact live OpenAI trace evidence kept in the repo without making the trace the main reading path.

## Technical Evidence

- `workshop_bulletin_run/request_evidence.json`, `request_interpretation.json`, `semantic_normalization.json`, and `normalized_request.json` show the input evidence, interpreted evidence, AI semantic normalization, and normalized workflow state.
- `workshop_bulletin_run/draft_output.json`, `policy_analysis.json`, `policy_decision.json`, `publication_packet.json`, `trace.json`, and `run_summary.json` show how the packet was produced and adjudicated.
- `evaluations/openai_draft_eval/eval_report.json` gives the per-case eval details behind the Markdown summary.
- `live_openai_trace/langsmith_trace_manifest.json` is the sanitized trace manifest for the captured live run.

The JSON files are review evidence, not the main reading path. The workflow is intended to be understood from the packet, digest, methodology, and summaries first.
