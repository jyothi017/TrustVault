
const test = require("node:test");
const assert = require("node:assert/strict");

const API_URL = "http://127.0.0.1:5000";

// Test 1: Upload must be rejected without login.
test("Reject document upload without login", async () => {
  const form = new FormData();

  form.append(
    "document",
    new Blob(["Harmless test content"], {
      type: "application/octet-stream",
    }),
    "test-invalid.exe"
  );

  const response = await fetch(`${API_URL}/api/documents`, {
    method: "POST",
    body: form,
  });

  const body = await response.text();

  console.log("Unauthenticated upload status:", response.status);
  console.log("Unauthenticated upload response:", body);

  assert.equal(
    response.status,
    401,
    `Unauthenticated upload should be rejected. Response: ${body}`
  );
});

// Test 2: Unsupported extension must be rejected
// when the request has a valid login token.
test("Reject unsupported file extension", async () => {
  const email = process.env.TEST_OWNER_EMAIL;
  const password = process.env.TEST_OWNER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Missing TEST_OWNER_EMAIL or TEST_OWNER_PASSWORD environment variable."
    );
  }

  // Login using the test account.
  const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const loginBody = await loginResponse.json();

  assert.equal(
    loginResponse.status,
    200,
    `Test account login failed: ${JSON.stringify(loginBody)}`
  );

  assert.ok(loginBody.token, "Login response must contain a token.");

  // Attempt to upload a harmless file with an unsupported extension.
  const form = new FormData();

  form.append(
    "document",
    new Blob(["Harmless security test content"], {
      type: "application/octet-stream",
    }),
    "test-invalid.exe"
  );

  const response = await fetch(`${API_URL}/api/documents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${loginBody.token}`,
    },
    body: form,
  });

  const body = await response.text();

  console.log("Unsupported upload status:", response.status);
  console.log("Unsupported upload response:", body);

  assert.equal(
    response.status,
    400,
    `Unsupported file should be rejected with HTTP 400. Response: ${body}`
  );
});
