import { z } from "zod";

import {
  type WorkshopRequest,
  workshopRequestSchema,
} from "../contracts.js";

export const GOOGLE_SHEETS_READONLY_SCOPE =
  "https://www.googleapis.com/auth/spreadsheets.readonly";

const googleServiceAccountSchema = z.object({
  client_email: z.string().email(),
  private_key: z.string().min(1),
});

const googleSheetsEnvSchema = z.object({
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().min(1),
  GOOGLE_SHEETS_SPREADSHEET_ID: z.string().min(1),
  GOOGLE_SHEETS_RANGE: z.string().min(1),
  GOOGLE_SHEETS_REQUEST_ID: z.string().optional(),
});

export type GoogleSheetsEnvConfig = {
  serviceAccountJson: string;
  spreadsheetId: string;
  range: string;
  requestId?: string;
};

export function readGoogleSheetsConfig(
  env: NodeJS.ProcessEnv = process.env,
): GoogleSheetsEnvConfig {
  const parsed = googleSheetsEnvSchema.parse(env);
  googleServiceAccountSchema.parse(JSON.parse(parsed.GOOGLE_SERVICE_ACCOUNT_JSON));

  return {
    serviceAccountJson: parsed.GOOGLE_SERVICE_ACCOUNT_JSON,
    spreadsheetId: parsed.GOOGLE_SHEETS_SPREADSHEET_ID,
    range: parsed.GOOGLE_SHEETS_RANGE,
    requestId: parsed.GOOGLE_SHEETS_REQUEST_ID,
  };
}

export function sheetValuesToRecords(values: string[][]): Record<string, string>[] {
  if (values.length < 2) {
    throw new Error("Expected at least a header row and one data row.");
  }

  const headers = values[0].map((header) => normalizeHeader(header));

  return values.slice(1).map((row) => {
    const record: Record<string, string> = {};

    headers.forEach((header, index) => {
      record[header] = (row[index] ?? "").trim();
    });

    return record;
  });
}

export function pickWorkshopRecord(
  records: Record<string, string>[],
  requestId?: string,
): Record<string, string> {
  if (!records.length) {
    throw new Error("No workshop records were found in the sheet range.");
  }

  if (!requestId) {
    return records[0];
  }

  const match = records.find((record) =>
    readField(record, ["request_id", "requestid"]) === requestId,
  );

  if (!match) {
    throw new Error(`No row matched GOOGLE_SHEETS_REQUEST_ID=${requestId}.`);
  }

  return match;
}

export function mapRecordToWorkshopRequest(
  record: Record<string, string>,
): WorkshopRequest {
  const workshopRequest = {
    requestId: requiredField(record, ["request_id", "requestid"]),
    submittedAt: requiredField(record, ["submitted_at", "submittedat"]),
    organizerName: requiredField(record, [
      "organizer_name",
      "organizer",
      "organizername",
    ]),
    organizerEmail: requiredField(record, [
      "organizer_email",
      "organizeremail",
      "email",
    ]),
    workshopTitle: requiredField(record, [
      "workshop_title",
      "title",
      "workshoptitle",
    ]),
    shortDescription: requiredField(record, [
      "short_description",
      "summary",
      "shortdescription",
    ]),
    fullDescription: requiredField(record, [
      "full_description",
      "description",
      "fulldescription",
    ]),
    preferredDate: requiredField(record, [
      "preferred_date",
      "preferreddate",
    ]),
    fallbackDate: optionalField(record, ["fallback_date", "fallbackdate"]),
    durationMinutes: parsePositiveInt(
      requiredField(record, ["duration_minutes", "durationminutes", "duration"]),
      "duration_minutes",
    ),
    venueName: requiredField(record, ["venue_name", "venuename"]),
    venueType: parseVenueType(
      requiredField(record, ["venue_type", "venuetype"]),
    ),
    neighborhood: requiredField(record, ["neighborhood"]),
    targetAudience: requiredField(record, [
      "target_audience",
      "audience",
      "targetaudience",
    ]),
    capacity: parsePositiveInt(
      requiredField(record, ["capacity"]),
      "capacity",
    ),
    accessibilityNotes: optionalField(record, [
      "accessibility_notes",
      "accessibility",
      "accessibilitynotes",
    ]),
    ageGuidance: optionalField(record, [
      "age_guidance",
      "ageguidance",
      "ages",
    ]),
    materialNeeds: parseList(
      optionalField(record, ["material_needs", "materials", "materialneeds"]),
    ),
    facilitatorBio: requiredField(record, [
      "facilitator_bio",
      "bio",
      "facilitatorbio",
    ]),
    publicationGoal: requiredField(record, [
      "publication_goal",
      "goal",
      "publicationgoal",
    ]),
    weatherPlan: optionalField(record, ["weather_plan", "weatherplan"]),
    internalNotes: optionalField(record, ["internal_notes", "internalnotes"]),
    policyAcknowledgement: parseBoolean(
      optionalField(record, [
        "policy_acknowledgement",
        "policyacknowledgement",
        "policy_ack",
      ]),
    ),
  };

  return workshopRequestSchema.parse(workshopRequest);
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function readField(record: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== "") {
      return value;
    }
  }

  return "";
}

function requiredField(record: Record<string, string>, keys: string[]): string {
  const value = readField(record, keys);

  if (!value) {
    throw new Error(`Missing required Google Sheets field: ${keys[0]}`);
  }

  return value;
}

function optionalField(record: Record<string, string>, keys: string[]): string {
  return readField(record, keys);
}

function parsePositiveInt(value: string, fieldName: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer for ${fieldName}.`);
  }

  return parsed;
}

function parseVenueType(value: string): "indoor" | "outdoor" | "hybrid" {
  const normalized = value.trim().toLowerCase();

  if (
    normalized === "indoor" ||
    normalized === "outdoor" ||
    normalized === "hybrid"
  ) {
    return normalized;
  }

  throw new Error(
    "Expected venue_type to be one of indoor, outdoor, or hybrid.",
  );
}

function parseList(value: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(value: string): boolean {
  return ["true", "yes", "y", "1"].includes(value.trim().toLowerCase());
}
