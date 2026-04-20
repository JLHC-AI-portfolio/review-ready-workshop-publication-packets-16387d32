# Architecture

This document explains how the workshop request moves from evidence to draft copy, review flags, and final packet files. A non-technical reviewer should take away that the workflow has clear inputs, clear outputs, and a visible stop point whenever a coordinator still needs to decide something.

Reviewer view:

- Inputs: one public fixture request, or an optional Google Sheets row supplied with local credentials.
- Outputs: a publication packet, organizer digest, structured JSON evidence, and a compact run trace.
- AI role: interpret ambiguous evidence, normalize it into constraints and questions, draft public copy, and propose policy findings when the OpenAI path is enabled.
- Safeguards: deterministic normalization glue and policy adjudication keep missing accessibility, age, weather, and acknowledgement details visible after AI analysis.
- Human decision: the workflow records `hold_for_manual_review` instead of treating AI-assisted interpretation, policy analysis, or copy as approval.
- Out of scope: production publishing, a multi-user approval UI, deployment monitoring, and organization-specific policy tuning.

## Workflow Slice

The repo models one operational workflow: convert a workshop request into a reviewed publication packet and organizer digest.

Entrypoints:

- `tsx src/cli.ts run ...` runs the full workflow for either a fixture request or a Google Sheets source.
- `tsx src/cli.ts eval ...` runs the bounded AI-assisted workflow eval against a checked-in dataset.

Core stages:

1. `source.load`
   The CLI resolves either the fixture adapter or the live Google Sheets adapter.
2. `interpret_request`
   Either the deterministic interpreter or `@langchain/openai` classifies evidence for accessibility, age guidance, weather fallback, policy acknowledgement, and risk signals.
3. `semantic_normalization`
   Either the deterministic fallback or `@langchain/openai` turns raw and interpreted evidence into normalized labels, constraints, missing facts, contradictions, and coordinator questions.
4. `normalize_request`
   Raw evidence plus semantic output becomes a stable internal shape with derived schedule labels and logistics summaries.
5. `draft_publication`
   Either the deterministic fallback or `@langchain/openai` generates public-facing copy and issue notes.
6. `policy_analysis`
   Either the deterministic fallback or `@langchain/openai` proposes evidence-backed policy findings and follow-up questions.
7. `policy_review`
   Explicit rules decide whether the packet can move forward automatically or must pause for manual review.
8. `manual_review_gate` or `ready_to_publish`
   The workflow records the next action instead of silently continuing.
9. `finalize_outputs`
   The workflow emits channel-ready content, organizer guidance, and a local trace file.

## Framework Choice

The repo uses LangGraph JS because this problem is a small stateful workflow, not an open-ended planner.

- LangGraph is needed for the visible branch between `manual_review_gate` and `ready_to_publish`.
- Plain LangChain chains would hide too much of the operational state transition.
- Deep Agents would add planning, filesystem, and skill-loading behavior that the slice does not need.
- No RAG layer is required because the workflow operates on one bounded request record rather than on a document corpus.
- No graph persistence layer is required because each run is short-lived and reviewable from its emitted packet.

## Source Adapters

### Fixture adapter

`src/source/fixtureSource.ts` reads a checked-in JSON request. This path is the reproducible no-secret path for reviews, smoke runs, and local experimentation.

### Google Sheets adapter

`src/source/googleSheetsSource.ts` is loaded only when `--source google-sheets` is selected. It uses a service-account JSON payload from `GOOGLE_SERVICE_ACCOUNT_JSON`, reads a worksheet range, converts the first row into headers, and maps the selected row into the same `WorkshopRequest` contract used by the fixture path.

Expected headers:

- `request_id`
- `submitted_at`
- `organizer_name`
- `organizer_email`
- `workshop_title`
- `short_description`
- `full_description`
- `preferred_date`
- `fallback_date`
- `duration_minutes`
- `venue_name`
- `venue_type`
- `neighborhood`
- `target_audience`
- `capacity`
- `accessibility_notes`
- `age_guidance`
- `material_needs`
- `facilitator_bio`
- `publication_goal`
- `weather_plan`
- `internal_notes`
- `policy_acknowledgement`

The adapter also tolerates camelCase variants and a few naming aliases so spreadsheet exports do not need perfect formatting before a reviewer can try the live path.

## AI Service Layers

The AI path is split into three layers so OpenAI remains a provider, not the workflow architecture:

- `src/runtime/modelRuntime.ts` validates model environment, creates LangChain chat models, and attaches model metadata for traces.
- `src/runtime/runnableConfig.ts` builds workflow and step `RunnableConfig` values with run names, tags, metadata, and `thread_id`.
- `src/chains/` holds the typed LangChain chains for interpretation, semantic normalization, drafting, and policy analysis.

`src/interpretation/` exposes two interchangeable implementations behind the same interface:

- `deterministicInterpretationService` keeps the repo runnable with no model credentials.
- `openaiInterpretationService` delegates to the shared LangChain runtime and interpretation chain to classify request evidence before policy-sensitive normalization.

The interpretation layer can surface non-canonical blockers, but it cannot approve publication.

`src/semanticNormalization/` exposes two interchangeable implementations behind the same interface:

- `deterministicSemanticNormalizationService` keeps the repo runnable with no model credentials.
- `openaiSemanticNormalizationService` delegates to the shared LangChain runtime and semantic-normalization chain to produce normalized labels, derived constraints, missing facts, contradictions, and human follow-up questions.

`src/drafting/` exposes two interchangeable implementations behind the same interface:

- `deterministicDraftingService` keeps the repo runnable with no model credentials.
- `openaiDraftingService` delegates to the shared LangChain runtime and drafting chain to generate the bulletin blurb, newsletter snippet, issue notes, and confidence note.

`src/policyAnalysis/` exposes two interchangeable implementations behind the same interface:

- `deterministicPolicyAnalysisService` derives policy findings from semantic constraints and draft concerns.
- `openaiPolicyAnalysisService` delegates to the shared LangChain runtime and policy-analysis chain to propose evidence-backed findings, severity, confidence, and coordinator questions.

The deterministic policy gate remains the authority for final hold or ready status.

Provider and model selection live in configuration rather than in hidden code defaults. The OpenAI path requires `OPENAI_API_KEY` and `OPENAI_MODEL`.

Step temperatures preserve the previous defaults while allowing runtime overrides:

- `OPENAI_INTERPRETATION_TEMPERATURE`, default `0.1`.
- `OPENAI_SEMANTIC_NORMALIZATION_TEMPERATURE`, default `0.1`.
- `OPENAI_DRAFTING_TEMPERATURE`, default `0.2`.
- `OPENAI_POLICY_ANALYSIS_TEMPERATURE`, default `0.1`.
- `OPENAI_TEMPERATURE` remains a global fallback when a step-specific variable is not set.

## Optional LangSmith Observability And Evals

LangSmith is optional. The local packet artifacts remain the review source whether or not tracing is enabled.

Tracing is enabled by LangChain/LangGraph environment variables:

- `LANGSMITH_TRACING=true`.
- `LANGSMITH_API_KEY`.
- `LANGSMITH_PROJECT`, optional but recommended.

When tracing is enabled, the graph run is named `workshop_publication_workflow` and each AI chain receives a step-specific run name such as `interpret_request`, `semantic_normalization`, `draft_publication`, or `policy_analysis`. Tags and metadata carry request ID, source mode, provider names, and model names so traced runs can be filtered without reading local files first.

The local eval command remains the reproducible default:

- `npm run eval`.
- `npm run eval:openai`.

The optional LangSmith eval adapter syncs the checked-in eval cases into a LangSmith dataset and runs the same workflow with code evaluators:

- `npm run eval:langsmith`.
- `npm run eval:openai:langsmith`.

Those LangSmith commands require `LANGSMITH_API_KEY`; the OpenAI variant also requires `OPENAI_API_KEY` and `OPENAI_MODEL`.

## Policy And Manual Decision Boundary

The policy gate is intentionally explicit and easy to audit. The workflow holds for manual review when:

- accessibility details are missing or still tentative;
- age guidance is absent;
- an outdoor session lacks a weather fallback;
- organizer policy acknowledgement is missing;
- the interpretation step surfaces a new review-required concern;
- the semantic-normalization step carries a review-required constraint;
- the policy-analysis step proposes a review-required finding;
- the drafting step surfaces new policy concerns worth checking before publication.

The gate does not attempt to auto-resolve those issues. It records the hold status, adds the reviewer checklist to the organizer digest, and still emits a publication draft so coordinators can inspect the draft text alongside the gate decision.

## Output Packet

A run packet contains:

- `request_evidence.json`
- `request_interpretation.json`
- `semantic_normalization.json`
- `normalized_request.json`
- `draft_output.json`
- `policy_analysis.json`
- `policy_decision.json`
- `publication_packet.json`
- `publication_packet.md`
- `organizer_digest.md`
- `trace.json`
- `run_summary.json`

That keeps the workflow inspectable without forcing a UI. The checked-in packet is intentionally compact, and optional live tracing can be enabled during secret-backed runs without turning the repo into a trace bundle dump.
