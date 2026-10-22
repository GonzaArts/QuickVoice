import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

test("outbound batch creation and campaign management share one tab", () => {
  const page = read("src/app/(app)/outbound/page.tsx");
  const batchForm = read("src/components/outbound/BatchCallForm.tsx");

  assert.match(page, /<TabsTrigger value="batch"><Trans>\{"Batch campaigns"\}<\/Trans><\/TabsTrigger>/);
  assert.doesNotMatch(page, /TabsTrigger value="campaigns"/);
  assert.match(page, /<TabsContent value="batch"[\s\S]*<BatchCallForm \/>[\s\S]*<CampaignsPanel \/>/);
  assert.match(page, /<TabsTrigger value="calls"><Trans>\{"Outbound calls"\}<\/Trans><\/TabsTrigger>/);
  assert.match(batchForm, /Batch campaigns/);
  assert.doesNotMatch(batchForm, /Batch queue/);
  assert.doesNotMatch(batchForm, /useBatchCampaigns/);
});
