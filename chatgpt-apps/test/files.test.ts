import { test } from "node:test";
import assert from "node:assert/strict";
import { safeFilename, signFileToken, verifyFileToken } from "../src/kit/files.js";

test("file tokens round-trip and reject tampering", () => {
  const token = signFileToken("csv", { a: 1, list: [1, 2, 3] }, "x.csv");
  assert.deepEqual(verifyFileToken(token), { kind: "csv", filename: "x.csv", payload: { a: 1, list: [1, 2, 3] } });
  assert.equal(verifyFileToken(token.slice(0, -2) + "zz"), null);
  assert.equal(verifyFileToken("garbage"), null);
  const [data, sig] = token.split(".");
  assert.equal(verifyFileToken(`${data}x.${sig}`), null);
});

test("safeFilename strips unsafe characters", () => {
  assert.equal(safeFilename("Team: standup / weekly!", "ics"), "Team-standup-weekly.ics");
  assert.equal(safeFilename("???", "pdf"), "download.pdf");
});
