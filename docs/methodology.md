# Methodology

## Problem Framing

Community workshop publishing looks simple until the last-mile review work is made explicit. Organizers often submit a single request record that mixes public copy, logistics, and unresolved operational details. The workflow in this repo treats that request as evidence that must be interpreted and normalized before any drafting or publication decision happens.

For a coordinator, the flow is intentionally simple: one request arrives, AI separates known facts from uncertain details, AI normalizes the request into constraints and questions, AI drafts copy and policy findings, deterministic rules adjudicate whether unresolved facts require review, and the final packet shows what a person must check before publication.

## Interpretation Layer

The live OpenAI path starts by interpreting the raw request evidence before the workflow builds the normalized internal payload. The deterministic path implements the same contract so the repo remains runnable without secrets.

The interpretation output classifies:

- accessibility evidence;
- age-guidance evidence;
- weather fallback evidence;
- policy acknowledgement evidence;
- review-required risk signals.

The model is allowed to identify uncertainty, missing information, contradictions, and evidence-backed review blockers. It is not allowed to approve publication or invent missing facts. Its output becomes evidence for semantic normalization and the deterministic policy gate.

## Semantic Normalization Layer

The live OpenAI path then performs semantic normalization. This step turns the interpreted evidence into a stable, reviewable contract: normalized labels, logistics summary, missing facts, contradictions, derived constraints, and concrete human follow-up questions. The deterministic fallback implements the same contract from the interpreted fields so the repo remains runnable without secrets.

The model may improve clarity and grouping, but it must not invent operational truth. Missing accessibility, age guidance, weather fallback, policy acknowledgement, registration handling, or other blockers must remain visible as constraints or human questions.

The deterministic `normalize_request` step then converts that semantic output into the internal `NormalizedWorkshopRequest` shape used by drafting, policy analysis, packet rendering, and regression tests.

## Deterministic Normalization Rules

Derived fields still handled by deterministic code:

- `scheduleLabel` combines the preferred date and fallback date into one publication-safe string.
- `durationLabel` converts raw minutes into consistent copy.
- `locationLabel` pairs venue and neighborhood for channel reuse.
- `riskSignals` carries interpreted review concerns forward into drafting and policy analysis.
- `semanticConstraints`, `missingFacts`, `contradictions`, and `humanQuestions` carry semantic normalization evidence forward without changing the final decision authority.

Interpretation rules:

- Empty strings, `TBD`, `pending`, and `confirm` language are treated as unresolved data rather than as affirmative answers.
- Material lists are parsed from comma-separated or semicolon-separated spreadsheet fields.
- Policy acknowledgement defaults to `false` when the source does not prove it was captured.

## Prompt Contract

The OpenAI interpretation path receives the raw request JSON and must return structured evidence classification. The OpenAI semantic-normalization path receives the raw request and interpretation, then returns normalized labels, constraints, missing facts, contradictions, and human questions. The OpenAI drafting path receives the normalized request JSON plus interpreted risk signals. It must return structured output with:

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
- unresolved issues must stay visible in `reviewNotes` or `policyConcerns`;
- policy-sensitive interpretation must remain grounded in supplied evidence.

The OpenAI policy-analysis path receives the normalized request and draft output, then proposes evidence-backed findings, severity, confidence, and coordinator questions. It still cannot approve publication or override deterministic rules.

That keeps the AI steps useful without making them the final authority on policy or operational truth.

## Policy Logic

The policy gate exists because good workshop copy is not enough to approve publication. The gate holds the packet for manual review when any of the following remain unresolved:

- accessibility details are absent or tentative;
- age guidance is absent;
- an outdoor event lacks a weather fallback;
- organizer acknowledgement of the publication policy is missing;
- the interpretation step identifies an evidence-backed review-required concern;
- the semantic-normalization step carries review-required constraints;
- the policy-analysis step proposes review-required findings grounded in evidence;
- the drafting step identifies additional concerns that should be checked before publishing when no policy-analysis result is present.

When interpretation, semantic normalization, policy analysis, or drafting restates a canonical rule-derived issue in different words, the gate keeps the canonical flag and drops the duplicate phrasing from the organizer digest. That keeps the checked-in packet concise without hiding genuinely new AI-derived concerns.

This logic is deliberately conservative. The workflow is optimized for asynchronous decision support, not for automatic publishing.

## Evaluation Surface

The bounded eval in `evals/draft_eval_cases.json` checks the interpretation, semantic-normalization, policy-analysis, and drafting workflow on three synthetic cases:

- one clean indoor request that should be publication-ready;
- one request with accessibility and age-guidance gaps that should hold for manual review;
- one outdoor request that should surface the missing weather fallback.

The eval rubric scores:

- whether required factual terms appear in the draft or final packet;
- whether the expected review status matches;
- whether expected review flags survive the workflow.

This is not a benchmark for literary quality. It is a regression surface for whether the AI-assisted path preserves operationally important facts and review blockers.

`npm run eval` and `npm run eval:openai` are the local source of truth. They write local artifacts and do not require LangSmith.

`npm run eval:langsmith` and `npm run eval:openai:langsmith` are optional observability adapters. They sync the same cases into a LangSmith dataset, execute the same LangGraph workflow, and attach code evaluators for review status, required terms, expected flags, and the aggregate local-pass result. These commands are useful when comparing prompt or model changes over time, but they do not replace the local regression path.

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
