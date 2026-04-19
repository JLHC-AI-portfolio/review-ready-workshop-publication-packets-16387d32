# Architecture

This document explains how the workshop request moves from evidence to draft copy, review flags, and final packet files. A non-technical reviewer should take away that the workflow has clear inputs, clear outputs, and a visible stop point whenever a coordinator still needs to decide something.

Reviewer view:

- Inputs: one public fixture request, or an optional Google Sheets row supplied with local credentials.
- Outputs: a publication packet, organizer digest, structured JSON evidence, and a compact run trace.
- AI role: help draft and summarize public copy when the OpenAI path is enabled.
- Safeguards: deterministic normalization and policy checks keep missing accessibility, age, weather, and acknowledgement details visible.
- Human decision: the workflow records `hold_for_manual_review` instead of treating AI-drafted copy as approval.
- Out of scope: production publishing, a multi-user approval UI, deployment monitoring, and organization-specific policy tuning.

## Workflow Slice

The repo models one operational workflow: convert a workshop request into a reviewed publication packet and organizer digest.

Entrypoints:

- `tsx src/cli.ts run ...` runs the full workflow for either a fixture request or a Google Sheets source.
- `tsx src/cli.ts eval ...` runs the bounded drafting eval against a checked-in dataset.

Core stages:

1. `source.load`
   The CLI resolves either the fixture adapter or the live Google Sheets adapter.
2. `normalize_request`
   Raw evidence becomes a stable internal shape with derived schedule labels, logistics summaries, and risk signals.
3. `draft_publication`
   Either the deterministic fallback or `@langchain/openai` generates public-facing copy and issue notes.
4. `policy_review`
   Explicit rules decide whether the packet can move forward automatically or must pause for manual review.
5. `manual_review_gate` or `ready_to_publish`
   The workflow records the next action instead of silently continuing.
6. `finalize_outputs`
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

## Drafting Layer

`src/drafting/` exposes two interchangeable implementations behind the same interface:

- `deterministicDraftingService` keeps the repo runnable with no model credentials.
- `openaiDraftingService` uses `@langchain/openai` and a structured JSON response contract to generate the bulletin blurb, newsletter snippet, issue notes, and confidence note.

Provider and model selection live in configuration rather than in hidden code defaults. The OpenAI path requires `OPENAI_API_KEY` and `OPENAI_MODEL`.

## Policy And Manual Decision Boundary

The policy gate is intentionally explicit and easy to audit. The workflow holds for manual review when:

- accessibility details are missing or still tentative;
- age guidance is absent;
- an outdoor session lacks a weather fallback;
- organizer policy acknowledgement is missing;
- the drafting step surfaces new policy concerns worth checking before publication.

The gate does not attempt to auto-resolve those issues. It records the hold status, adds the reviewer checklist to the organizer digest, and still emits a publication draft so coordinators can inspect the draft text alongside the gate decision.

## Output Packet

A run packet contains:

- `request_evidence.json`
- `normalized_request.json`
- `draft_output.json`
- `policy_decision.json`
- `publication_packet.json`
- `publication_packet.md`
- `organizer_digest.md`
- `trace.json`
- `run_summary.json`

That keeps the workflow inspectable without forcing a UI. The checked-in packet is intentionally compact, and optional live tracing can be enabled during secret-backed runs without turning the repo into a trace bundle dump.
