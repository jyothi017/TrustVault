
const test = require("node:test");
const assert = require("node:assert/strict");

const API_URL =
  process.env.TRUSTVAULT_API_URL || "http://127.0.0.1:5000";

async function request(path, options = {}) {
  return fetch(`${API_URL}${path}`, options);
}

const protectedEndpoints = [
  {
    name: "Current user",
    path: "/api/auth/me",
    method: "GET"
  },
  {
    name: "List documents",
    path: "/api/documents",
    method: "GET"
  },
  {
    name: "Shared with me",
    path: "/api/shared-with-me",
    method: "GET"
  },
  {
    name: "Audit logs",
    path: "/api/audit-logs",
    method: "GET"
  },
  {
    name: "Dashboard statistics",
    path: "/api/dashboard-stats",
    method: "GET"
  }
];

for (const endpoint of protectedEndpoints) {
  test(
    `Reject unauthenticated request: ${endpoint.name}`,
    async () => {
      const response = await request(endpoint.path, {
        method: endpoint.method
      });

      assert.equal(
        response.status,
        401,
        `${endpoint.name} should reject requests without a token`
      );
    }
  );
}

test("Reject invalid JWT on document details endpoint", async () => {
  const response = await request("/api/documents/1", {
    headers: {
      Authorization: "Bearer invalid.test.token"
    }
  });

  assert.equal(response.status, 401);
});

test("Reject invalid JWT on document download endpoint", async () => {
  const response = await request("/api/documents/1/download", {
    headers: {
      Authorization: "Bearer invalid.test.token"
    }
  });

  assert.equal(response.status, 401);
});

test("Reject invalid JWT on permission listing endpoint", async () => {
  const response = await request("/api/documents/1/permissions", {
    headers: {
      Authorization: "Bearer invalid.test.token"
    }
  });

  assert.equal(response.status, 401);
});

test("Reject invalid JWT on review update endpoint", async () => {
  const response = await request("/api/documents/1/review", {
    method: "PATCH",
    headers: {
      Authorization: "Bearer invalid.test.token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      reviewStatus: "Approved"
    })
  });

  assert.equal(response.status, 401);
});

test("Reject invalid JWT on permission grant endpoint", async () => {
  const response = await request("/api/documents/1/permissions", {
    method: "POST",
    headers: {
      Authorization: "Bearer invalid.test.token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: "security-test@example.com",
      permission: "Read"
    })
  });

  assert.equal(response.status, 401);
});

test("Reject invalid JWT on permission revoke endpoint", async () => {
  const response = await request(
    "/api/documents/1/permissions/security-test%40example.com",
    {
      method: "DELETE",
      headers: {
        Authorization: "Bearer invalid.test.token"
      }
    }
  );

  assert.equal(response.status, 401);
});
