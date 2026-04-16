# Artifact Provenance

The checked-in sample artifacts in this repo are intentionally split between a reproducible no-secrets rebuild and a captured live OpenAI evidence set.

## Sample Packet

- `examples/workshop_bulletin_run/` came from a fixture-backed `npm run demo:openai` run against `fixtures/requests/neighborhood_zine_workshop_request.json`.
- Only the synthetic request evidence, normalized payload, policy output, packet files, and compact run summary were copied into the tracked tree.
- No secrets, raw provider payloads, or transient local output directories are committed.

## Eval Summary

- `examples/evaluations/openai_draft_eval/` came from `npm run eval:openai` using the checked-in dataset at `evals/draft_eval_cases.json`.
- The tracked files keep the compact summary plus the structured case report so a reviewer can inspect the rubric surface without rerunning the provider path.

## Live Trace Summary

- `examples/live_openai_trace/` came from a traced live OpenAI run with `LANGSMITH_TRACING=true`.
- The repo keeps only a short markdown summary and a sanitized manifest. The heavier trace export bundle remains outside the tracked tree.

## Reproducible Review Path

- `npm run demo`, `npm run eval`, `npm test`, and `npm run typecheck` are the clean-checkout no-secrets review path.
- Those commands rebuild the same workflow shape with the deterministic drafter and regression tests; they do not claim to recreate the checked-in OpenAI text byte for byte.
