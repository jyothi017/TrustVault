
const test = require("node:test");
const assert = require("node:assert/strict");

const API_URL =
  process.env.TRUSTVAULT_API_URL || "http://127.0.0.1:5000";

async function login(email, password) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  assert.equal(response.status, 200, "Login should succeed");

  const data = await response.json();
  assert.ok(data.token, "Login should return a token");

  return data.token;
}

function missingVariables(names) {
  return names.filter((name) => !process.env[name]);
}

test("Reject document permission listing without login", async () => {
  const response = await fetch(
    `${API_URL}/api/documents/1/permissions`
  );

  assert.equal(response.status, 401);
});

test("Reject permission grant without login", async () => {
  const response = await fetch(
    `${API_URL}/api/documents/1/permissions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "security-test@example.com",
        permission: "Read"
      })
    }
  );

  assert.equal(response.status, 401);
});

test("Reject permission revoke without login", async () => {
  const response = await fetch(
    `${API_URL}/api/documents/1/permissions/test%40example.com`,
    { method: "DELETE" }
  );

  assert.equal(response.status, 401);
});

test("Reject review update without login", async () => {
  const response = await fetch(
    `${API_URL}/api/documents/1/review`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewStatus: "Approved" })
    }
  );

  assert.equal(response.status, 401);
});

test("Read-only user cannot change document review status", async () => {
  const required = [
    "TEST_READONLY_EMAIL",
    "TEST_READONLY_PASSWORD",
    "TEST_SHARED_DOCUMENT_ID"
  ];

  const missing = missingVariables(required);

  if (missing.length) {
    return test.skip(
      `Missing environment variables: ${missing.join(", ")}`
    );
  }

  const token = await login(
    process.env.TEST_READONLY_EMAIL,
    process.env.TEST_READONLY_PASSWORD
  );

  const response = await fetch(
    `${API_URL}/api/documents/${process.env.TEST_SHARED_DOCUMENT_ID}/review`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ reviewStatus: "Approved" })
    }
  );

  assert.equal(
    response.status,
    403,
    "A Read-only user must not change review status"
  );
});

test("Read-only user cannot list document permissions", async () => {
  const required = [
    "TEST_READONLY_EMAIL",
    "TEST_READONLY_PASSWORD",
    "TEST_SHARED_DOCUMENT_ID"
  ];

  const missing = missingVariables(required);

  if (missing.length) {
    return test.skip(
      `Missing environment variables: ${missing.join(", ")}`
    );
  }

  const token = await login(
    process.env.TEST_READONLY_EMAIL,
    process.env.TEST_READONLY_PASSWORD
  );

  const response = await fetch(
    `${API_URL}/api/documents/${process.env.TEST_SHARED_DOCUMENT_ID}/permissions`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  assert.equal(response.status, 403);
});

test("Read-only user cannot grant document permissions", async () => {
  const required = [
    "TEST_READONLY_EMAIL",
    "TEST_READONLY_PASSWORD",
    "TEST_SHARED_DOCUMENT_ID"
  ];

  const missing = missingVariables(required);

  if (missing.length) {
    return test.skip(
      `Missing environment variables: ${missing.join(", ")}`
    );
  }

  const token = await login(
    process.env.TEST_READONLY_EMAIL,
    process.env.TEST_READONLY_PASSWORD
  );

  const response = await fetch(
    `${API_URL}/api/documents/${process.env.TEST_SHARED_DOCUMENT_ID}/permissions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        email: "security-test@example.com",
        permission: "Read"
      })
    }
  );

  assert.equal(response.status, 403);
});

test("Read-only user cannot revoke document permissions", async () => {
  const required = [
    "TEST_READONLY_EMAIL",
    "TEST_READONLY_PASSWORD",
    "TEST_SHARED_DOCUMENT_ID"
  ];

  const missing = missingVariables(required);

  if (missing.length) {
    return test.skip(
      `Missing environment variables: ${missing.join(", ")}`
    );
  }

  const token = await login(
    process.env.TEST_READONLY_EMAIL,
    process.env.TEST_READONLY_PASSWORD
  );

  const response = await fetch(
    `${API_URL}/api/documents/${process.env.TEST_SHARED_DOCUMENT_ID}/permissions/test%40example.com`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  assert.equal(response.status, 403);
});

test("Owner can list document permissions", async () => {
  const required = [
    "TEST_OWNER_EMAIL",
    "TEST_OWNER_PASSWORD",
    "TEST_OWNED_DOCUMENT_ID"
  ];

  const missing = missingVariables(required);

  if (missing.length) {
    return test.skip(
      `Missing environment variables: ${missing.join(", ")}`
    );
  }

  const token = await login(
    process.env.TEST_OWNER_EMAIL,
    process.env.TEST_OWNER_PASSWORD
  );

  const response = await fetch(
    `${API_URL}/api/documents/${process.env.TEST_OWNED_DOCUMENT_ID}/permissions`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const body = await response.text();

  assert.equal(
    response.status,
    200,
    `Owner should list permissions. Response: ${body}`
  );
});

test("Owner can grant document Read permission", async () => {
  const required = [
    "TEST_OWNER_EMAIL",
    "TEST_OWNER_PASSWORD",
    "TEST_OWNED_DOCUMENT_ID",
    "TEST_PERMISSION_RECIPIENT_EMAIL"
  ];

  const missing = missingVariables(required);

  if (missing.length) {
    return test.skip(
      `Missing environment variables: ${missing.join(", ")}`
    );
  }

  const token = await login(
    process.env.TEST_OWNER_EMAIL,
    process.env.TEST_OWNER_PASSWORD
  );

  const documentId = process.env.TEST_OWNED_DOCUMENT_ID;
  const recipientEmail = process.env.TEST_PERMISSION_RECIPIENT_EMAIL;

  const response = await fetch(
    `${API_URL}/api/documents/${documentId}/permissions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        email: recipientEmail,
        permission: "Read"
      })
    }
  );

  const body = await response.text();

  console.log("Owner grant response status:", response.status);
  console.log("Owner grant response body:", body);

  assert.equal(
    response.status,
    200,
    `Owner should grant Read permission. Response: ${body}`
  );
});

test("Owner can revoke document permission", async () => {
  const required = [
    "TEST_OWNER_EMAIL",
    "TEST_OWNER_PASSWORD",
    "TEST_OWNED_DOCUMENT_ID",
    "TEST_PERMISSION_RECIPIENT_EMAIL"
  ];

  const missing = missingVariables(required);

  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables: ${missing.join(", ")}`
    );
  }

  const token = await login(
    process.env.TEST_OWNER_EMAIL,
    process.env.TEST_OWNER_PASSWORD
  );

  const documentId = process.env.TEST_OWNED_DOCUMENT_ID;
  const recipientEmail = process.env.TEST_PERMISSION_RECIPIENT_EMAIL;

  // First, make sure the recipient has Read permission.
  const grantResponse = await fetch(
    `${API_URL}/api/documents/${documentId}/permissions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        email: recipientEmail,
        permission: "Read"
      })
    }
  );

  const grantBody = await grantResponse.text();

  assert.equal(
    grantResponse.status,
    200,
    `Grant must succeed before revoke. Response: ${grantBody}`
  );

  // Now revoke that recipient's permission.
  const revokeResponse = await fetch(
    `${API_URL}/api/documents/${documentId}/permissions/${encodeURIComponent(recipientEmail)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  const revokeBody = await revokeResponse.text();

  console.log("Owner revoke response status:", revokeResponse.status);
  console.log("Owner revoke response body:", revokeBody);

  assert.equal(
    revokeResponse.status,
    200,
    `Owner should revoke permission. Response: ${revokeBody}`
  );
});

test("Revoked recipient cannot download document", async () => {
  const required = [
    "TEST_OWNER_EMAIL",
    "TEST_OWNER_PASSWORD",
    "TEST_OWNED_DOCUMENT_ID",
    "TEST_PERMISSION_RECIPIENT_EMAIL",
    "TEST_RECIPIENT_PASSWORD"
  ];

  const missing = missingVariables(required);

  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables: ${missing.join(", ")}`
    );
  }

  const ownerEmail = process.env.TEST_OWNER_EMAIL;
  const ownerPassword = process.env.TEST_OWNER_PASSWORD;
  const recipientEmail = process.env.TEST_PERMISSION_RECIPIENT_EMAIL;
  const recipientPassword = process.env.TEST_RECIPIENT_PASSWORD;
  const documentId = process.env.TEST_OWNED_DOCUMENT_ID;

  assert.notEqual(
    ownerEmail.toLowerCase(),
    recipientEmail.toLowerCase(),
    "Recipient must be different from the owner"
  );

  // 1. Owner login
  const ownerToken = await login(ownerEmail, ownerPassword);

  // 2. Grant Read permission
  const grantResponse = await fetch(
    `${API_URL}/api/documents/${documentId}/permissions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        email: recipientEmail,
        permission: "Read"
      })
    }
  );

  const grantBody = await grantResponse.text();

  assert.equal(
    grantResponse.status,
    200,
    `Grant should succeed. Response: ${grantBody}`
  );

  // 3. Recipient login
  const recipientToken = await login(
    recipientEmail,
    recipientPassword
  );

  // 4. Verify recipient can download before revocation
  const beforeResponse = await fetch(
    `${API_URL}/api/documents/${documentId}/download`,
    {
      headers: {
        Authorization: `Bearer ${recipientToken}`
      }
    }
  );

  // Consume the response body without saving the file.
  await beforeResponse.arrayBuffer();

  assert.equal(
    beforeResponse.status,
    200,
    "Recipient should be able to download before revocation"
  );

  // 5. Owner revokes Read permission
  const revokeResponse = await fetch(
    `${API_URL}/api/documents/${documentId}/permissions/${encodeURIComponent(recipientEmail)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${ownerToken}`
      }
    }
  );

  const revokeBody = await revokeResponse.text();

  assert.equal(
    revokeResponse.status,
    200,
    `Revoke should succeed. Response: ${revokeBody}`
  );

  // 6. Recipient tries downloading again
  const afterResponse = await fetch(
    `${API_URL}/api/documents/${documentId}/download`,
    {
      headers: {
        Authorization: `Bearer ${recipientToken}`
      }
    }
  );

  const afterBody = await afterResponse.text();

  console.log(
    "Download after revoke:",
    afterResponse.status,
    afterBody
  );

  assert.equal(
    afterResponse.status,
    404,
    "Recipient must not download after permission is revoked"
  );
});

test("Non-owner cannot delete document", async () => {
  const required = [
    "TEST_READONLY_EMAIL",
    "TEST_READONLY_PASSWORD",
    "TEST_SHARED_DOCUMENT_ID"
  ];

  const missing = missingVariables(required);

  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables: ${missing.join(", ")}`
    );
  }

  const token = await login(
    process.env.TEST_READONLY_EMAIL,
    process.env.TEST_READONLY_PASSWORD
  );

  const documentId = process.env.TEST_SHARED_DOCUMENT_ID;

  const response = await fetch(
    `${API_URL}/api/documents/${documentId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  const body = await response.text();

  console.log("Non-owner delete status:", response.status);
  console.log("Non-owner delete response:", body);

  assert.equal(
    response.status,
    404,
    `Non-owner must not delete document. Response: ${body}`
  );
});
