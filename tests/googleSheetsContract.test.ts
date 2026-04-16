import { describe, expect, it } from "vitest";

import {
  GOOGLE_SHEETS_READONLY_SCOPE,
  mapRecordToWorkshopRequest,
  pickWorkshopRecord,
  readGoogleSheetsConfig,
  sheetValuesToRecords,
} from "../src/source/googleSheetsContract.js";

describe("googleSheetsContract", () => {
  it("parses live config from the environment", () => {
    const config = readGoogleSheetsConfig({
      GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
        client_email: "svc@example.iam.gserviceaccount.com",
        private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
      }),
      GOOGLE_SHEETS_SPREADSHEET_ID: "sheet-id",
      GOOGLE_SHEETS_RANGE: "Requests!A1:W20",
      GOOGLE_SHEETS_REQUEST_ID: "wrk_204",
    });

    expect(config.spreadsheetId).toBe("sheet-id");
    expect(config.range).toBe("Requests!A1:W20");
    expect(config.requestId).toBe("wrk_204");
    expect(GOOGLE_SHEETS_READONLY_SCOPE).toContain("spreadsheets.readonly");
  });

  it("maps a worksheet row into the shared workshop contract", () => {
    const records = sheetValuesToRecords([
      [
        "request_id",
        "submitted_at",
        "organizer_name",
        "organizer_email",
        "workshop_title",
        "short_description",
        "full_description",
        "preferred_date",
        "fallback_date",
        "duration_minutes",
        "venue_name",
        "venue_type",
        "neighborhood",
        "target_audience",
        "capacity",
        "accessibility_notes",
        "age_guidance",
        "material_needs",
        "facilitator_bio",
        "publication_goal",
        "weather_plan",
        "internal_notes",
        "policy_acknowledgement",
      ],
      [
        "wrk_204",
        "2026-04-03T15:24:00Z",
        "Maya Delgado",
        "maya.delgado@example.org",
        "Neighborhood Zine Studio",
        "A hands-on evening for mini zines.",
        "Participants make mini zines together.",
        "2026-05-14 18:30",
        "",
        "90",
        "Maple Corner Library Terrace Room",
        "indoor",
        "Maple Grove",
        "Older teens and adults",
        "18",
        "Need to confirm elevator access.",
        "",
        "paper; pens; glue sticks",
        "Maya runs the bulletin table.",
        "Create a website listing.",
        "",
        "",
        "yes",
      ],
    ]);

    const selectedRecord = pickWorkshopRecord(records, "wrk_204");
    const workshopRequest = mapRecordToWorkshopRequest(selectedRecord);

    expect(workshopRequest.requestId).toBe("wrk_204");
    expect(workshopRequest.materialNeeds).toEqual([
      "paper",
      "pens",
      "glue sticks",
    ]);
    expect(workshopRequest.policyAcknowledgement).toBe(true);
  });
});
