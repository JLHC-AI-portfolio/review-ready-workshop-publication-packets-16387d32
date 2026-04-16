# Methodology

## Problem Framing

Community workshop publishing looks simple until the last-mile review work is made explicit. Organizers often submit a single request record that mixes public copy, logistics, and unresolved operational details. The workflow in this repo treats that request as evidence that must be normalized before any drafting or publication decision happens.

## Normalization Rules

The normalization step stabilizes request evidence into a consistent internal contract.

Derived fields:

- `scheduleLabel` combines the preferred date and fallback date into one publication-safe string.
- `durationLabel` converts raw minutes into consistent copy.
- `locationLabel` pairs venue and neighborhood for channel reuse.
- `logisticsSummary` compresses capacity, materials, and accessibility context.
- `riskSignals` flags missing or tentative details before the AI step sees the payload.

Interpretation rules:

- Empty strings, `TBD`, `pending`, and `confirm` language are treated as unresolved data rather than as affirmative answers.
- Material lists are parsed from comma-separated or semicolon-separated spreadsheet fields.
- Policy acknowledgement defaults to `false` when the source does not prove it was captured.

## Prompt Contract

The OpenAI drafting path receives the normalized request JSON plus the derived risk signals. It must return structured output with:

- a short bulletin blurb;
- a newsletter snippet;
- a public summary;
- reviewer notes;
- policy concerns;
- a confidence note.

The prompt is intentionally narrow:

- no invented approvals;
- no invented accessibility claims;
- no invented age guidance;
- concise, publication-ready phrasing;
- unresolved issues must stay visible in `reviewNotes` or `policyConcerns`.

That keeps the AI step useful without making it the authority on policy or operational truth.

## Policy Logic

The policy gate exists because good workshop copy is not enough to approve publication. The gate holds the packet for manual review when any of the following remain unresolved:

- accessibility details are absent or tentative;
- age guidance is absent;
- an outdoor event lacks a weather fallback;
- organizer acknowledgement of the publication policy is missing;
- the drafting step identifies additional concerns that should be checked before publishing.

When the drafting step restates a canonical rule-derived issue in different words, the gate keeps the canonical flag and drops the duplicate phrasing from the organizer digest. That keeps the checked-in packet concise without hiding genuinely new AI-derived concerns.

This logic is deliberately conservative. The workflow is optimized for asynchronous decision support, not for automatic publishing.

## Evaluation Surface

The bounded eval in `evals/draft_eval_cases.json` checks the drafting step on three synthetic cases:

- one clean indoor request that should be publication-ready;
- one request with accessibility and age-guidance gaps that should hold for manual review;
- one outdoor request that should surface the missing weather fallback.

The eval rubric scores:

- whether required factual terms appear in the draft or final packet;
- whether the expected review status matches;
- whether expected review flags survive the workflow.

This is not a benchmark for literary quality. It is a regression surface for whether the AI step preserves operationally important facts.

## Live Boundary Readiness

The repo includes a live Google Sheets source path because the integration boundary matters to the workflow itself. The implementation uses the Google Sheets read-only scope and a service-account JSON payload. In a clean checkout, the remaining live runtime dependency is credential availability rather than missing code.

The checked-in examples intentionally stay compact: the packet files and method notes are the main public walkthrough, while optional live tracing remains a local instrumentation aid rather than the primary checked-in artifact.

Reference points used when pinning live identifiers in the repo:

- Google Sheets API read-only scope: <https://developers.google.com/workspace/sheets/api/scopes>
- OpenAI GPT-4.1 model family reference: <https://platform.openai.com/docs/models>

## Interpretation Limits

- The checked-in fixtures are synthetic and do not represent real organizer behavior distributions.
- The policy gate models a compact manual-check workflow, not a complete compliance program.
- The live source adapter reads Google Sheets, but production publication connectors are intentionally left out.
- AI outputs remain non-deterministic in live mode; the eval surface is a bounded confidence check, not a proof of universal correctness.
