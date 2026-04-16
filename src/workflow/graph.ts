import {
  Annotation,
  END,
  START,
  StateGraph,
} from "@langchain/langgraph";

import {
  type DraftOutput,
  type NormalizedWorkshopRequest,
  type PolicyDecision,
  type PublicationPacket,
  type ReviewOutcome,
  type RunPacket,
  type SourceSummary,
  type TraceEvent,
  type WorkshopRequest,
} from "../contracts.js";
import { normalizeWorkshopRequest } from "../normalization.js";
import { buildOrganizerDigest, buildPublicationPacket, buildReviewOutcome } from "../output.js";
import { evaluatePolicy } from "../policy.js";

import type { DraftingService } from "../drafting/types.js";

const WorkflowState = Annotation.Root({
  requestEvidence: Annotation<WorkshopRequest>(),
  normalizedRequest: Annotation<NormalizedWorkshopRequest>(),
  draftOutput: Annotation<DraftOutput>(),
  policyDecision: Annotation<PolicyDecision>(),
  reviewOutcome: Annotation<ReviewOutcome>(),
  publicationPacket: Annotation<PublicationPacket>(),
  organizerDigest: Annotation<string>(),
  trace: Annotation<TraceEvent[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
});

interface WorkflowDependencies {
  drafter: DraftingService;
}

export async function runWorkshopPublicationWorkflow(input: {
  request: WorkshopRequest;
  sourceSummary: SourceSummary;
  drafter: DraftingService;
}): Promise<RunPacket> {
  const graph = createWorkshopPublicationGraph({
    drafter: input.drafter,
  });

  const generatedAt = new Date().toISOString();
  const runId = `${input.request.requestId}-${generatedAt.replaceAll(/[:.]/g, "-")}`;
  const result = await graph.invoke(
    {
      requestEvidence: input.request,
      trace: [
        createTraceEvent(
          "source.load",
          `Loaded request ${input.request.requestId} from ${input.sourceSummary.label}.`,
          "completed",
        ),
      ],
    },
    {
      configurable: {
        thread_id: runId,
      },
    },
  );

  return {
    runId,
    generatedAt,
    sourceSummary: input.sourceSummary,
    drafter: input.drafter.descriptor,
    requestEvidence: input.request,
    normalizedRequest: result.normalizedRequest,
    draftOutput: result.draftOutput,
    policyDecision: result.policyDecision,
    reviewOutcome: result.reviewOutcome,
    publicationPacket: result.publicationPacket,
    organizerDigest: result.organizerDigest,
    trace: result.trace,
  };
}

function createWorkshopPublicationGraph(deps: WorkflowDependencies) {
  const normalizeRequest = (state: typeof WorkflowState.State) => {
    const normalizedRequest = normalizeWorkshopRequest(state.requestEvidence);

    return {
      normalizedRequest,
      trace: [
        createTraceEvent(
          "normalize_request",
          `Normalized request ${normalizedRequest.requestId} into a review-friendly payload.`,
          "completed",
        ),
      ],
    };
  };

  const draftPublication = async (state: typeof WorkflowState.State) => {
    const draftOutput = await deps.drafter.draft(state.normalizedRequest);

    return {
      draftOutput,
      trace: [
        createTraceEvent(
          "draft_publication",
          `Generated publication copy with provider ${deps.drafter.descriptor.provider}.`,
          "completed",
        ),
      ],
    };
  };

  const policyReview = (state: typeof WorkflowState.State) => {
    const policyDecision = evaluatePolicy(
      state.normalizedRequest,
      state.draftOutput,
    );

    return {
      policyDecision,
      trace: [
        createTraceEvent(
          "policy_review",
          policyDecision.decisionRationale,
          policyDecision.status === "ready_to_publish" ? "completed" : "flagged",
        ),
      ],
    };
  };

  const readyToPublish = (state: typeof WorkflowState.State) => {
    const reviewOutcome = buildReviewOutcome(state.policyDecision);

    return {
      reviewOutcome,
      trace: [
        createTraceEvent(
          "ready_to_publish",
          reviewOutcome.summary,
          "completed",
        ),
      ],
    };
  };

  const manualReviewGate = (state: typeof WorkflowState.State) => {
    const reviewOutcome = buildReviewOutcome(state.policyDecision);

    return {
      reviewOutcome,
      trace: [
        createTraceEvent(
          "manual_review_gate",
          reviewOutcome.summary,
          "flagged",
        ),
      ],
    };
  };

  const finalizeOutputs = (state: typeof WorkflowState.State) => {
    const publicationPacket = buildPublicationPacket(
      state.normalizedRequest,
      state.draftOutput,
      state.reviewOutcome,
    );
    const organizerDigest = buildOrganizerDigest(
      state.normalizedRequest,
      state.policyDecision,
      state.reviewOutcome,
    );

    return {
      publicationPacket,
      organizerDigest,
      trace: [
        createTraceEvent(
          "finalize_outputs",
          `Built packet with status ${state.reviewOutcome.status}.`,
          "completed",
        ),
      ],
    };
  };

  return new StateGraph(WorkflowState)
    .addNode("normalize_request", normalizeRequest)
    .addNode("draft_publication", draftPublication)
    .addNode("policy_review", policyReview)
    .addNode("ready_to_publish", readyToPublish)
    .addNode("manual_review_gate", manualReviewGate)
    .addNode("finalize_outputs", finalizeOutputs)
    .addEdge(START, "normalize_request")
    .addEdge("normalize_request", "draft_publication")
    .addEdge("draft_publication", "policy_review")
    .addConditionalEdges("policy_review", (state) => {
      return state.policyDecision.status === "ready_to_publish"
        ? "ready_to_publish"
        : "manual_review_gate";
    })
    .addEdge("ready_to_publish", "finalize_outputs")
    .addEdge("manual_review_gate", "finalize_outputs")
    .addEdge("finalize_outputs", END)
    .compile();
}

function createTraceEvent(
  step: string,
  detail: string,
  status: "completed" | "flagged",
): TraceEvent {
  return {
    step,
    detail,
    status,
    at: new Date().toISOString(),
  };
}
