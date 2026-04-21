# Workshop Publishing Review Assistant

Help a community team turn one incomplete workshop request into drafted public copy, explicit review flags, and an organizer digest before anything is published.

Small workshop teams often receive event requests as a mix of spreadsheet fields, short notes, and unresolved logistics. This repo shows how that evidence can become a review packet: the team can see what is ready to publish, what still needs a human check, and what copy was drafted for the website or newsletter.

The public scenario is synthetic and harmless: every workshop detail, organizer, venue, date, and output is fictional. Example dates are not a real calendar; the source note for the checked-in examples lives in `docs/provenance.md`. A short non-technical case study is available in [`docs/case_study.md`](docs/case_study.md).

## What A Reviewer Should Know First

Use this repo to review the shape of a small decision-support workflow, not a production publishing system. One workshop request goes in; a packet, organizer digest, and visible review flags come out.

- Inputs: a checked-in synthetic request, or an optional Google Sheets row when local credentials are configured.
- Outputs: draft website copy, draft newsletter copy, organizer notes, and a clear publish-or-hold decision.
- AI role: the live path uses OpenAI to interpret ambiguous evidence, produce semantic normalization, draft copy, and propose policy findings.
- Safeguards: deterministic adjudication keeps missing accessibility, age guidance, weather, and acknowledgement details visible after the AI steps.
- Human review: a coordinator clears flagged items before anything moves to public channels.
- Limits: no production UI, deployment stack, monitoring system, or publishing connector is included.
- Fast route: review the packet snapshot below, then open the three files in the 60-second path.

## Main Packet Snapshot

The checked-in sample keeps the core review path visible in the README itself:

| Evidence | Decision | Output |
| --- | --- | --- |
| Elevator confirmation is still pending, and age guidance is blank. | Hold for coordinator review. | Draft public copy, then carry both unresolved items into the packet next action and organizer digest checklist. |

```text
Review outcome: held for coordinator review
Drafted website card: Neighborhood Zine Studio
Coordinator checks:
- Accessibility confirmation for the side entrance elevator is pending.
- Age guidance for participants is not provided.
Next action: Resolve the reviewer checklist before the packet is posted to public channels.
```

For a non-technical reviewer, this is the main idea: the system can help prepare the packet, but it does not hide the missing elevator and age-guidance decisions. The machine-readable status appears later in `policy_decision.json`; this first view starts with the human decision. This snapshot is taken directly from the checked-in sample artifacts in `examples/workshop_bulletin_run/`.

## Start Here In 60 Seconds

If you want the short walkthrough after scanning the snapshot above, open these files in order:

1. [`examples/workshop_bulletin_run/publication_packet.md`](examples/workshop_bulletin_run/publication_packet.md)
2. [`examples/workshop_bulletin_run/organizer_digest.md`](examples/workshop_bulletin_run/organizer_digest.md)
3. [`docs/methodology.md`](docs/methodology.md)

Those three files are the main review path. They keep the packet walkthrough primary; eval outputs and live traces appear later in the README as secondary evidence.

## Artifact Reading Map

Use the Markdown files first when reviewing the workflow, then open JSON only when you want the backing evidence.

| Reader need | Start with | Use later as technical evidence |
| --- | --- | --- |
| Understand the publication decision | `examples/workshop_bulletin_run/publication_packet.md` | `policy_analysis.json`, `policy_decision.json`, `publication_packet.json`, `trace.json` |
| See what a coordinator must review | `examples/workshop_bulletin_run/organizer_digest.md` | `request_evidence.json`, `request_interpretation.json`, `semantic_normalization.json`, `normalized_request.json` |
| Inspect the AI interpretation, normalization, policy, and drafting check | `examples/evaluations/openai_draft_eval/eval_summary.md` | `eval_report.json`, `evals/draft_eval_cases.json` |
| Confirm the live integration boundary | `examples/live_openai_trace/langsmith_trace_summary.md` | `langsmith_trace_manifest.json`, local untracked trace exports |

The JSON and trace files are included so a technical reviewer can verify state, policy, and evaluation details. They are not the first-impression route for understanding what the workflow does.

## Evidence -> Decision -> Output

The inline snapshot above comes from these checked-in files:

- [`examples/workshop_bulletin_run/request_evidence.json`](examples/workshop_bulletin_run/request_evidence.json) shows a neighborhood zine workshop where elevator availability still needs confirmation and age guidance is blank.
- [`examples/workshop_bulletin_run/request_interpretation.json`](examples/workshop_bulletin_run/request_interpretation.json) records the interpretation layer that classifies those gaps.
- [`examples/workshop_bulletin_run/semantic_normalization.json`](examples/workshop_bulletin_run/semantic_normalization.json) records the AI-normalized constraints, missing facts, and coordinator questions before deterministic normalization.
- [`examples/workshop_bulletin_run/policy_analysis.json`](examples/workshop_bulletin_run/policy_analysis.json) records evidence-backed policy findings proposed before the deterministic gate adjudicates them.
- [`examples/workshop_bulletin_run/policy_decision.json`](examples/workshop_bulletin_run/policy_decision.json) records `hold_for_manual_review` because those publishing prerequisites remain unresolved.
- [`examples/workshop_bulletin_run/publication_packet.md`](examples/workshop_bulletin_run/publication_packet.md) still emits the website card, newsletter snippet, hold status, and next action.
- [`examples/workshop_bulletin_run/organizer_digest.md`](examples/workshop_bulletin_run/organizer_digest.md) carries the reviewer checklist a coordinator uses to finish the decision.

That keeps the main review path visible before installation and before any extra clicks.

The checked-in packet, eval summary, and live trace summary are accompanied by a short provenance note in [`docs/provenance.md`](docs/provenance.md).

## Run Modes

### Checked-In Captured Live Sample

The top-fold packet in `examples/workshop_bulletin_run/` is a checked-in captured OpenAI sample created from the synthetic fixture. It is review evidence for the live interpretation, semantic normalization, policy analysis, and drafting path, not the artifact that `npm run demo` regenerates in a no-secrets checkout.

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
- `npm run eval` scores the interpretation, normalization, policy-analysis, and drafting workflow against the checked-in rubric in `evals/draft_eval_cases.json`.
- `npm test` checks the Google Sheets live-boundary contract, the manual-review policy logic, and a regression replay of the published packet artifacts without needing secrets.
- `npm run typecheck` confirms the published TypeScript CLI and test surface compile from the declared toolchain.

This no-secrets path rebuilds the same workflow shape with deterministic service implementations. It is meant to be reproducible from a clean checkout, not byte-identical to the checked-in OpenAI sample shown above.

## Checked-In Secondary Evidence

Once the packet and methodology make sense, these checked-in artifacts show the bounded live and evaluation surfaces:

- [`examples/workshop_bulletin_run/run_summary.json`](examples/workshop_bulletin_run/run_summary.json) for the captured sample run metadata.
- [`examples/evaluations/openai_draft_eval/eval_summary.md`](examples/evaluations/openai_draft_eval/eval_summary.md) for the checked-in OpenAI interpretation, normalization, policy, and drafting eval summary.
- [`examples/evaluations/openai_draft_eval/eval_report.json`](examples/evaluations/openai_draft_eval/eval_report.json) for the full per-case eval results.
- [`examples/live_openai_trace/langsmith_trace_summary.md`](examples/live_openai_trace/langsmith_trace_summary.md) for the compact summary of a traced live OpenAI run.
- [`examples/live_openai_trace/langsmith_trace_manifest.json`](examples/live_openai_trace/langsmith_trace_manifest.json) for the sanitized trace manifest kept in the repo.
- [`docs/provenance.md`](docs/provenance.md) for how those checked-in artifacts were generated and sanitized.

## Optional Live OpenAI Recapture

Use this only when local secrets are available. This is the path that the checked-in live sample came from; it is separate from the reproducible no-secrets commands above.

The workflow can call the real OpenAI interpretation, semantic normalization, policy analysis, and drafting steps on the same checked-in fixture:

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

### Optional LangSmith Eval Tracking

The local eval remains the reproducible source of truth. When LangSmith credentials are available, the same checked-in cases can also be tracked as LangSmith experiments:

```bash
LANGSMITH_API_KEY=... \
LANGSMITH_TRACING=true \
npm run eval:langsmith
```

For the live AI path:

```bash
OPENAI_API_KEY=... \
OPENAI_MODEL=gpt-4.1-mini \
LANGSMITH_API_KEY=... \
LANGSMITH_TRACING=true \
npm run eval:openai:langsmith
```

The optional adapter syncs `evals/draft_eval_cases.json` into the LangSmith dataset `workshop-publication-packet-regression` unless `--langsmith-dataset` is supplied. It records code-evaluator scores for review status, required terms, expected flags, and the aggregate regression pass.

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

- `interpret_request`
- `semantic_normalization`
- `normalize_request`
- `draft_publication`
- `policy_analysis`
- `policy_review`
- `manual_review_gate` or `ready_to_publish`
- `finalize_outputs`

That makes the operational decision path inspectable without introducing planning, memory, or RAG layers that this workflow does not need.

## Repo Layout

- `src/cli.ts` exposes `run` and `eval`.
- `src/workflow/graph.ts` holds the LangGraph orchestration.
- `src/runtime/` holds the shared LangChain model runtime and trace config.
- `src/chains/` holds typed LangChain chains for the four AI-assisted stages.
- `src/evals/` holds shared eval scoring and the optional LangSmith eval adapter.
- `src/source/` separates fixture and Google Sheets adapters.
- `src/interpretation/` separates deterministic and OpenAI request interpretation implementations.
- `src/semanticNormalization/` separates deterministic and OpenAI semantic-normalization implementations.
- `src/drafting/` separates deterministic and OpenAI drafting implementations.
- `src/policyAnalysis/` separates deterministic and OpenAI policy-analysis implementations.
- `fixtures/requests/` contains public synthetic request evidence.
- `evals/` contains the dataset and rubric inputs for the end-to-end AI-assisted eval.
- `examples/` stores the captured sample run and eval artifact for inspection.

## Scope Boundaries

This project stops at a coherent single-workflow tool:

- It shows how evidence is interpreted, semantically normalized, drafted, analyzed for policy risk, adjudicated, and emitted.
- It does not ship a multi-user UI, deployment stack, monitoring fabric, or production publication connector set.
- It leaves domain-specific approval policy, stakeholder tuning, and final channel integration as later engineering work.
