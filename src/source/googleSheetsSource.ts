import {
  GOOGLE_SHEETS_READONLY_SCOPE,
  mapRecordToWorkshopRequest,
  pickWorkshopRecord,
  readGoogleSheetsConfig,
  sheetValuesToRecords,
  type GoogleSheetsEnvConfig,
} from "./googleSheetsContract.js";

import type { WorkshopRequest } from "../contracts.js";

export async function loadWorkshopRequestFromGoogleSheets(
  env: NodeJS.ProcessEnv = process.env,
): Promise<WorkshopRequest> {
  const config = readGoogleSheetsConfig(env);
  return loadWorkshopRequestFromGoogleSheetsConfig(config);
}

export async function loadWorkshopRequestFromGoogleSheetsConfig(
  config: GoogleSheetsEnvConfig,
): Promise<WorkshopRequest> {
  const credentials = JSON.parse(config.serviceAccountJson) as {
    client_email: string;
    private_key: string;
  };

  const { google } = await import("googleapis");

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [GOOGLE_SHEETS_READONLY_SCOPE],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: config.range,
  });

  const values = response.data.values;

  if (!values || values.length < 2) {
    throw new Error("The Google Sheets range did not return a usable table.");
  }

  const records = sheetValuesToRecords(values);
  const selectedRecord = pickWorkshopRecord(records, config.requestId);
  return mapRecordToWorkshopRequest(selectedRecord);
}
