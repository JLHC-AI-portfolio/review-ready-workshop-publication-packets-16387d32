import { readFile } from "node:fs/promises";

import {
  type WorkshopRequest,
  workshopRequestSchema,
} from "../contracts.js";

export async function loadWorkshopRequestFixture(
  fixturePath: string,
): Promise<WorkshopRequest> {
  const raw = await readFile(fixturePath, "utf8");
  return workshopRequestSchema.parse(JSON.parse(raw));
}
