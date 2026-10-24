
THREATS.md — TrustVault

1. Project Overview

TrustVault is a document management application built with React, Express.js, PostgreSQL, and JWT-based authentication.

This document identifies potential security threats and the measures needed to reduce them.

2. Security Threats and Mitigations

Threat 1: Unauthorized Document Access

Risk:
An authenticated user may attempt to access another user's document without permission.

Mitigation:
- Verify the user's identity on protected API requests.
- Check document ownership or active sharing permissions on the server.
- Reject requests when access is not authorized.
- Never rely only on frontend controls for security.

Verification:
Test document access using an account without permission.

Threat 2: Access After Permission Revocation

Risk:
A recipient may try to access a document after their permission has been revoked.

Mitigation:
- Check the current permission status on every document access and download request.
- Reject requests when permission is revoked or inactive.
- Do not treat an old download URL as proof of authorization.

Verification:
Revoke access and test the recipient's access again, including any previously available download link.

Threat 3: Invalid, Expired, or Stolen JWT

Risk:
An invalid or stolen token may be used to impersonate a user.

Mitigation:
- Verify JWT signatures and expiration.
- Keep JWT secrets outside source control.
- Use HTTPS in production.
- Handle expired-token errors safely.

Verification:
Test protected APIs without a token, with an invalid token, and with an expired token.

Threat 4: Malicious or Oversized File Uploads

Risk:
A user may upload a disallowed file or a file that exceeds the permitted size.

Mitigation:
- Enforce file-size limits on the server.
- Allow only approved file types.
- Validate file content instead of trusting the filename or MIME type alone.
- Store uploads so they cannot execute as server code.
- Consider malware scanning for production use.

Verification:
Try uploading a disallowed file and a file larger than the configured limit.

Threat 5: Exposure of Credentials and Secrets

Risk:
Database passwords and JWT secrets may be exposed in a public repository.

Mitigation:
- Store secrets in environment variables or a secret manager.
- Exclude .env files from Git.
- Provide an .env.example file with placeholder values only.
- Rotate exposed credentials.

Verification:
Check tracked files and repository history for secrets before publishing.

Threat 6: Audit Log Tampering or Missing Events

Risk:
Important document activities may not be recorded or audit records may be modified.

Mitigation:
- Record relevant activities on the server.
- Include the authenticated actor, action, document details, and timestamp where appropriate.
- Restrict unauthorized modification or deletion of audit records.
- Consider append-only storage for production.

Verification:
Perform document operations and check whether the expected audit events are recorded.

Threat 7: SQL Injection

Risk:
Unsafe database queries may allow malicious input to affect database operations.

Mitigation:
- Use parameterized SQL queries.
- Validate and normalize user input.
- Avoid concatenating untrusted input into SQL statements.

Verification:
Review database queries and test input validation in a controlled environment.

Threat 8: Incorrect Permissions

Risk:
A user may receive more access than intended, such as Edit access instead of Read access.

Mitigation:
- Validate permission values on the backend.
- Enforce owner and administrator authorization rules.
- Apply the principle of least privilege.
- Handle duplicate permission records safely.

Verification:
Test that Read-only users cannot edit or delete documents and unauthorized users cannot grant permissions.

3. General Security Practices

- Require authentication for protected endpoints.
- Enforce authorization on the server.
- Use HTTPS in production.
- Keep dependencies updated.
- Avoid logging passwords, tokens, or sensitive document contents.
- Use a least-privilege database account.
- Run automated security tests before submission.

4. Known Limitations

The controls described in this document are security requirements and recommendations. They do not prove that every control has been implemented.

Each control must be verified against the current application. Incomplete protections, failed tests, and deployment limitations should be documented honestly.
