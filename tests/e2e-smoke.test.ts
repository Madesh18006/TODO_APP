import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3000";

test("public critical routes render", async () => {
  for (const path of ["/login", "/register", "/tasks", "/settings"]) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 200, `${path} should render`);
    assert.match(await response.text(), /Todo|Momentum|momentum/i);
  }
});

test("database regression flow is explicitly gated", { skip: !process.env.DATABASE_URL }, async () => {
  assert.fail(
    "Database credentials are present, but the authenticated PostgreSQL regression flow requires a configured test database and isolated test user.",
  );
});
