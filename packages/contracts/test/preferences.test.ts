import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePreferences, ValidationError } from "../src/index";

test("preference validation accepts real IANA zones and trims names", () => {
  assert.deepEqual(parsePreferences({ displayName: " Alice ", timeZone: "America/Los_Angeles", expectedVersion: 0 }), {
    displayName: "Alice", timeZone: "America/Los_Angeles", expectedVersion: 0,
  });
});

test("reject invalid zones, versions, unknown properties, and malformed values", () => {
  const valid = { displayName: "Alice", timeZone: "UTC", expectedVersion: 0 };
  for (const value of [null, [], "input", { ...valid, timeZone: "not/a-zone" }, { ...valid, expectedVersion: -1 }, { ...valid, expectedVersion: 0.5 }, { ...valid, expectedVersion: "0" }, { ...valid, displayName: "a".repeat(81) }, { ...valid, userId: "someone-else" }]) {
    assert.throws(() => parsePreferences(value), ValidationError);
  }
});
