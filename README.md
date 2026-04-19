# Workshop Requests To Review-Ready Publication Packets

Community Workshop Workflow Analytics turns one workshop request into drafted public copy, explicit review flags, and an organizer digest before anything is published.

Small workshop teams often receive event requests as a mix of spreadsheet fields, short notes, and unresolved logistics. This repo shows how that evidence can become a review packet: the team can see what is ready to publish, what still needs a human check, and what copy was drafted for the website or newsletter.

The public scenario is synthetic and harmless. Every workshop, organizer, venue, facilitator, date, and output in the repo is fictional, so the workflow can be inspected without exposing private operations or sensitive decisions. The 2026 workshop dates and run timestamps in the checked-in examples are sample fixture or capture dates, not current scheduling guidance.

At a glance:

- Purpose: turn one workshop request into a publication packet and organizer digest.
- Inputs: checked-in fixture evidence, or an optional Google Sheets row when local credentials are configured.
- Outputs: website copy, newsletter copy, organizer notes, review flags, and a traceable decision.
- AI role: draft and summarize copy in the live path; deterministic rules keep unresolved details visible.
- Human review: the workflow can hold publication until a coordinator clears flagged items.
- Limits: no production UI, deployment stack, monitoring system, or publishing connector is included.
- Fast route: review the packet snapshot below, then open the three files in the 60-second path.

## Main Packet Snapshot

The checked-in sample keeps the core review path visible in the README itself:

| Evidence | Decision | Output |
| --- | --- | --- |
| The request still needs elevator confirmation and leaves age guidance blank. | `hold_for_manual_review` with explicit reviewer flags. | The workflow still drafts the website card and newsletter snippet, then carries the unresolved items into the packet next action and organizer digest checklist. |

```text
Status: hold_for_manual_review
Website card: Neighborhood Zine Studio
Organizer notes:
- Accessibility confirmation for the side entrance elevator is pending.
- Age guidance for participants is not provided.
Next action: Resolve the reviewer checklist before the packet is posted to public channels.
```

For a non-technical reviewer, this is the main idea: the system can help prepare the packet, but it does not hide the missing elevator and age-guidance decisions. This snapshot is taken directly from the checked-in sample artifacts in `examples/workshop_bulletin_run/`.

## Start Here In 60 Seconds

If you want the short walkthrough after scanning the snapshot above, open these files in order:

1. [`examples/workshop_bulletin_run/publication_packet.md`](examples/workshop_bulletin_run/publication_packet.md)
2. [`examples/workshop_bulletin_run/organizer_digest.md`](examples/workshop_bulletin_run/organizer_digest.md)
3. [`docs/methodology.md`](docs/methodology.md)

Those three files are the main review path. They keep the packet walkthrough primary; eval outputs and live traces appear later in the README as secondary evidence.

## Evidence -> Decision -> Output

The inline snapshot above comes from these checked-in files:

- [`examples/workshop_bulletin_run/request_evidence.json`](examples/workshop_bulletin_run/request_evidence.json) shows a neighborhood zine workshop where elevator availability still needs confirmation and age guidance is blank.
- [`examples/workshop_bulletin_run/policy_decision.json`](examples/workshop_bulletin_run/policy_decision.json) records `hold_for_manual_review` because those publishing prerequisites remain unresolved.
- [`examples/workshop_bulletin_run/publication_packet.md`](examples/workshop_bulletin_run/publication_packet.md) still emits the website card, newsletter snippet, hold status, and next action.
- [`examples/workshop_bulletin_run/organizer_digest.md`](examples/workshop_bulletin_run/organizer_digest.md) carries the reviewer checklist a coordinator uses to finish the decision.

That keeps the main review path visible before installation and before any extra clicks.

The checked-in packet, eval summary, and live trace summary are accompanied by a short provenance note in [`docs/provenance.md`](docs/provenance.md).

## Run Modes

### Checked-In Captured Live Sample

The top-fold packet in `examples/workshop_bulletin_run/` is a checked-in captured OpenAI sample created from the synthetic fixture. It is review evidence for the live drafting path, not the artifact that `npm run demo` regenerates in a no-secrets checkout.

- [`examples/workshop_bulletin_run/run_summary.json`](examples/workshop_bulletin_run/run_summary.json) records the captured live sample metadata.
- [`docs/provenance.md`](docs/provenance.md) explains how the sample packet, eval summary, and live trace summary were produced and sanitized.

### Reproducible No-Secrets Path

Expect a few minutes in a clean checkout. `npm ci` is the longest step; the quick review above is the sub-minute scan path.

```bash
npm ci
npm run demo
npm run eval
npm test
npm run typecheck
```

What to expect:

- `npm run demo` writes a deterministic packet to `.local/demo-run/`.
- `npm run eval` scores the drafting step against the checked-in rubric in `evals/draft_eval_cases.json`.
- `npm test` checks the Google Sheets live-boundary contract, the manual-review policy logic, and a regression replay of the published packet artifacts without needing secrets.
- `npm run typecheck` confirms the published TypeScript CLI and test surface compile from the declared toolchain.

This no-secrets path rebuilds the same workflow shape with the deterministic drafter. It is meant to be reproducible from a clean checkout, not byte-identical to the checked-in OpenAI sample shown above.

## Checked-In Secondary Evidence

Once the packet and methodology make sense, these checked-in artifacts show the bounded live and evaluation surfaces:

- [`examples/workshop_bulletin_run/run_summary.json`](examples/workshop_bulletin_run/run_summary.json) for the captured sample run metadata.
- [`examples/evaluations/openai_draft_eval/eval_summary.md`](examples/evaluations/openai_draft_eval/eval_summary.md) for the checked-in OpenAI drafting eval summary.
- [`examples/evaluations/openai_draft_eval/eval_report.json`](examples/evaluations/openai_draft_eval/eval_report.json) for the full per-case eval results.
- [`examples/live_openai_trace/langsmith_trace_summary.md`](examples/live_openai_trace/langsmith_trace_summary.md) for the compact summary of a traced live OpenAI run.
- [`examples/live_openai_trace/langsmith_trace_manifest.json`](examples/live_openai_trace/langsmith_trace_manifest.json) for the sanitized trace manifest kept in the repo.
- [`docs/provenance.md`](docs/provenance.md) for how those checked-in artifacts were generated and sanitized.

## Optional Live OpenAI Recapture

Use this only when local secrets are available. This is the path that the checked-in live sample came from; it is separate from the reproducible no-secrets commands above.

The workflow can call the real OpenAI drafting step on the same checked-in fixture:

```bash
OPENAI_API_KEY=... \
OPENAI_MODEL=gpt-4.1-mini \
LANGSMITH_TRACING=true \
npm run demo:openai -- --output .local/openai-live-run
```

The same pattern works for the eval surface:

```bash
OPENAI_API_KEY=... \
OPENAI_MODEL=gpt-4.1-mini \
LANGSMITH_TRACING=true \
npm run eval:openai -- --output .local/openai-live-eval
```

Optional live tracing is enabled by `LANGSMITH_TRACING=true`. The repo keeps only a compact checked-in trace summary and manifest in `examples/live_openai_trace/`; the heavier provider-native trace export stays out of the tracked tree. Google Workspace authentication still requires local service-account credentials, so the live source adapter is implemented and test-covered but not exercised by the checked-in artifacts.

## Live Google Workspace Path

The workflow also supports `--source google-sheets` without loading Google modules during fixture runs. This is a separate live source boundary from the captured fixture-based OpenAI sample. The live adapter expects:

- `GOOGLE_SERVICE_ACCOUNT_JSON` with a service-account JSON payload that can read the target spreadsheet.
- `GOOGLE_SHEETS_SPREADSHEET_ID`.
- `GOOGLE_SHEETS_RANGE`.
- Optional `GOOGLE_SHEETS_REQUEST_ID` to pick a single row from a wider export range.

Example:

```bash
GOOGLE_SERVICE_ACCOUNT_JSON=... \
GOOGLE_SHEETS_SPREADSHEET_ID=... \
GOOGLE_SHEETS_RANGE='Workshop Requests!A1:W50' \
GOOGLE_SHEETS_REQUEST_ID=wrk_204 \
OPENAI_API_KEY=... \
OPENAI_MODEL=gpt-4.1-mini \
tsx src/cli.ts run --source google-sheets --provider openai --output .local/google-live-run
```

The expected sheet headers are documented in `docs/architecture.md`.

## Why LangGraph

This slice uses LangGraph JS rather than a free-form agent runtime because the workflow has explicit stages, one meaningful branch, and a visible manual decision boundary:

- `normalize_request`
- `draft_publication`
- `policy_review`
- `manual_review_gate` or `ready_to_publish`
- `finalize_outputs`

That makes the operational decision path inspectable without introducing planning, memory, or RAG layers that this workflow does not need.

## Repo Layout

- `src/cli.ts` exposes `run` and `eval`.
- `src/workflow/graph.ts` holds the LangGraph orchestration.
- `src/source/` separates fixture and Google Sheets adapters.
- `src/drafting/` separates deterministic and OpenAI drafting implementations.
- `fixtures/requests/` contains public synthetic request evidence.
- `evals/` contains the dataset and rubric inputs for the drafting eval.
- `examples/` stores the captured sample run and eval artifact for inspection.

## Scope Boundaries

This project stops at a coherent single-workflow tool:

- It shows how evidence is normalized, drafted, reviewed, and emitted.
- It does not ship a multi-user UI, deployment stack, monitoring fabric, or production publication connector set.
- It leaves domain-specific approval policy, stakeholder tuning, and final channel integration as later engineering work.
