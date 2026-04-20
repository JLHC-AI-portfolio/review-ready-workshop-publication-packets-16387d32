import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  draftOutputSchema,
  normalizedWorkshopRequestSchema,
  policyAnalysisSchema,
  policyDecisionSchema,
  publicationPacketSchema,
  reviewOutcomeSchema,
  semanticWorkshopNormalizationSchema,
  traceEventSchema,
  workshopRequestInterpretationSchema,
  workshopRequestSchema,
} from "../src/contracts.js";
import { writeRunPacket } from "../src/output.js";
import { runWorkshopPublicationWorkflow } from "../src/workflow/graph.js";

describe("published packet regression", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (directory) => {
        await rm(directory, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it("rebuilds the checked-in packet artifacts from the tracked request and draft", async () => {
    const request = workshopRequestSchema.parse(
      await readJson(
        new URL(
          "../fixtures/requests/neighborhood_zine_workshop_request.json",
          import.meta.url,
        ),
      ),
    );
    const expectedDraft = draftOutputSchema.parse(
      await readJson(
        new URL(
          "../examples/workshop_bulletin_run/draft_output.json",
          import.meta.url,
        ),
      ),
    );
    const expectedInterpretation = workshopRequestInterpretationSchema.parse(
      await readJson(
        new URL(
          "../examples/workshop_bulletin_run/request_interpretation.json",
          import.meta.url,
        ),
      ),
    );
    const expectedNormalized = normalizedWorkshopRequestSchema.parse(
      await readJson(
        new URL(
          "../examples/workshop_bulletin_run/normalized_request.json",
          import.meta.url,
        ),
      ),
    );
    const expectedSemanticNormalization = semanticWorkshopNormalizationSchema.parse(
      await readJson(
        new URL(
          "../examples/workshop_bulletin_run/semantic_normalization.json",
          import.meta.url,
        ),
      ),
    );
    const expectedPolicyAnalysis = policyAnalysisSchema.parse(
      await readJson(
        new URL(
          "../examples/workshop_bulletin_run/policy_analysis.json",
          import.meta.url,
        ),
      ),
    );
    const expectedPolicy = policyDecisionSchema.parse(
      await readJson(
        new URL(
          "../examples/workshop_bulletin_run/policy_decision.json",
          import.meta.url,
        ),
      ),
    );
    const expectedPacket = publicationPacketSchema.parse(
      await readJson(
        new URL(
          "../examples/workshop_bulletin_run/publication_packet.json",
          import.meta.url,
        ),
      ),
    );
    const expectedRunSummary = reviewOutcomeSchema.parse(
      (
        (await readJson(
          new URL(
            "../examples/workshop_bulletin_run/run_summary.json",
            import.meta.url,
          ),
        )) as { reviewOutcome: unknown }
      ).reviewOutcome,
    );
    const expectedOrganizerDigest = await readText(
      new URL("../examples/workshop_bulletin_run/organizer_digest.md", import.meta.url),
    );
    const expectedPublicationMarkdown = await readText(
      new URL("../examples/workshop_bulletin_run/publication_packet.md", import.meta.url),
    );
    const expectedTrace = traceEventSchema
      .array()
      .parse(
        await readJson(
          new URL("../examples/workshop_bulletin_run/trace.json", import.meta.url),
        ),
      )
      .map(stripTraceTiming);

    const run = await runWorkshopPublicationWorkflow({
      request,
      sourceSummary: {
        mode: "fixture",
        label: "fixtures/requests/neighborhood_zine_workshop_request.json",
      },
      interpreter: {
        descriptor: {
          provider: "openai",
          model: "gpt-4.1-mini",
        },
        async interpret() {
          return expectedInterpretation;
        },
      },
      semanticNormalizer: {
        descriptor: {
          provider: "openai",
          model: "gpt-4.1-mini",
        },
        async normalize() {
          return expectedSemanticNormalization;
        },
      },
      drafter: {
        descriptor: {
          provider: "openai",
          model: "gpt-4.1-mini",
        },
        async draft() {
          return expectedDraft;
        },
      },
      policyAnalyzer: {
        descriptor: {
          provider: "openai",
          model: "gpt-4.1-mini",
        },
        async analyze() {
          return expectedPolicyAnalysis;
        },
      },
    });

    expect(run.requestInterpretation).toEqual(expectedInterpretation);
    expect(run.semanticNormalization).toEqual(expectedSemanticNormalization);
    expect(run.normalizedRequest).toEqual(expectedNormalized);
    expect(run.policyAnalysis).toEqual(expectedPolicyAnalysis);
    expect(run.policyDecision).toEqual(expectedPolicy);
    expect(run.reviewOutcome).toEqual(expectedRunSummary);
    expect(run.publicationPacket).toEqual(expectedPacket);
    expect(run.organizerDigest).toBe(expectedOrganizerDigest);
    expect(run.trace.map(stripTraceTiming)).toEqual(expectedTrace);

    const outputDir = await mkdtemp(join(tmpdir(), "workshop-packet-regression-"));
    tempDirs.push(outputDir);

    await writeRunPacket(outputDir, run);

    const writtenNormalized = normalizedWorkshopRequestSchema.parse(
      await readJson(join(outputDir, "normalized_request.json")),
    );
    const writtenInterpretation = workshopRequestInterpretationSchema.parse(
      await readJson(join(outputDir, "request_interpretation.json")),
    );
    const writtenSemanticNormalization = semanticWorkshopNormalizationSchema.parse(
      await readJson(join(outputDir, "semantic_normalization.json")),
    );
    const writtenPolicyAnalysis = policyAnalysisSchema.parse(
      await readJson(join(outputDir, "policy_analysis.json")),
    );
    const writtenPolicy = policyDecisionSchema.parse(
      await readJson(join(outputDir, "policy_decision.json")),
    );
    const writtenPacket = publicationPacketSchema.parse(
      await readJson(join(outputDir, "publication_packet.json")),
    );
    const writtenPublicationMarkdown = await readText(
      join(outputDir, "publication_packet.md"),
    );
    const writtenOrganizerDigest = await readText(
      join(outputDir, "organizer_digest.md"),
    );
    const writtenTrace = traceEventSchema
      .array()
      .parse(await readJson(join(outputDir, "trace.json")))
      .map(stripTraceTiming);

    expect(writtenInterpretation).toEqual(expectedInterpretation);
    expect(writtenSemanticNormalization).toEqual(expectedSemanticNormalization);
    expect(writtenNormalized).toEqual(expectedNormalized);
    expect(writtenPolicyAnalysis).toEqual(expectedPolicyAnalysis);
    expect(writtenPolicy).toEqual(expectedPolicy);
    expect(writtenPacket).toEqual(expectedPacket);
    expect(writtenPublicationMarkdown).toBe(expectedPublicationMarkdown);
    expect(writtenOrganizerDigest).toBe(expectedOrganizerDigest);
    expect(writtenTrace).toEqual(expectedTrace);
  });
});

async function readJson(path: string | URL): Promise<unknown> {
  return JSON.parse(await readText(path)) as unknown;
}

async function readText(path: string | URL): Promise<string> {
  return readFile(path, "utf8");
}

function stripTraceTiming(entry: { at: string; detail: string; status: string; step: string }) {
  return {
    step: entry.step,
    status: entry.status,
    detail: entry.detail,
  };
}
