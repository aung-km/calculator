import assert from "node:assert/strict";
import test from "node:test";

import { getButtonClasses } from "./buttonStyles.js";

test("number buttons use a dark surface in the dark theme", () => {
  assert.match(getButtonClasses("number", "dark"), /bg-\[#374151\]/);
  assert.match(getButtonClasses("number", "dark"), /text-white/);
});

test("number buttons use a light surface in the light theme", () => {
  assert.match(getButtonClasses("number", "light"), /bg-\[#e5e7eb\]/);
  assert.match(getButtonClasses("number", "light"), /text-\[#111827\]/);
});

test("operator buttons retain the orange accent in both themes", () => {
  assert.match(getButtonClasses("operator", "dark"), /bg-\[#ff6500\]/);
  assert.match(getButtonClasses("operator", "light"), /bg-\[#ff6500\]/);
});
