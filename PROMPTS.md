
PROMPTS.md — TrustVault

Purpose

This document records how AI assistance was used during the development and testing of TrustVault, an access-controlled document management application. It describes the development tasks, issues identified, corrections made, and verification steps.

Project: TrustVault

Technology stack: React, Express.js, PostgreSQL, JWT


Entry 1 — 2026-10-22: Audit Trail Authentication

Task:
Troubleshoot an authentication error when accessing the Audit Trail API.

Prompt / AI assistance:
"Help me debug the 401 Invalid or expired token error from the TrustVault audit-logs API."

Issue identified:
The API rejected the request because the JWT was invalid or expired.

Correction:
I logged in again to obtain a valid authentication token and retried the request.

Verification:
The backend subsequently returned audit records for the authenticated user. The backend log reported 32 records during a later check.

Learning:
Protected API requests need a valid token, and authentication errors should be handled clearly in the frontend.


Entry 2 — 2026-10-23: CORS Configuration

Task:
Fix the browser's failure to fetch Audit Trail records.

Prompt / AI assistance:
"Help me resolve the CORS error stating that the Cache-Control request header is not allowed by Access-Control-Allow-Headers."

Issue identified:
The frontend sent a Cache-Control request header, but the backend CORS configuration did not allow it.

Correction:
I updated the Express CORS configuration to allow the required Cache-Control header and restarted the backend server.

Verification:
The backend subsequently logged audit records for the authenticated user. The browser request and displayed Audit Trail should also be checked to confirm end-to-end success.

Learning:
CORS settings must allow the request headers actually used by the frontend.


Entry 3 — 2026-10-23: Document Permission Management

Task:
Support granting document access to registered users and handling existing permission records.

Prompt / AI assistance:
"Help me implement document sharing with Read and Edit permissions, including safe handling of duplicate permission records."

Issue identified:
Repeated sharing requests could create duplicate permission records or cause database conflicts unless existing permissions were handled correctly.

Correction:
I worked on a PostgreSQL unique index for document and normalized recipient email, together with an INSERT ... ON CONFLICT DO UPDATE operation to update an existing permission.

Verification:
The permission grant operation must be tested with both a new recipient and an existing recipient to confirm that it creates or updates the intended record.

Learning:
Database constraints and upsert operations help maintain consistent permission data.


Entry 4 — 2026-10-23: Shared With Me and Document Download

Task:
Verify that a recipient can access a document shared by its owner.

Prompt / AI assistance:
"Help me verify the Shared with Me API and the recipient's document download workflow."

Issue investigated:
The application needed to display shared documents with the correct owner, recipient permission, and access status.

Correction:
I checked the Shared with Me page and tested the document download using the recipient account.

Verification:
A shared PDF was displayed with Read permission and Active status. The recipient download test was reported as completed successfully.

Learning:
Sharing must be verified from the recipient's account, not only from the owner's Access Control page.


Entry 5 — 2026-10-23: Revoke Access and Security Verification

Task:
Verify that a document owner can revoke a recipient's access.

Prompt / AI assistance:
"Help me test whether a recipient loses access after the owner revokes a document permission."

Issue investigated:
Removing a permission from the interface is not sufficient unless the backend also denies subsequent unauthorized requests.

Correction:
I followed the Access Control workflow to revoke a recipient's permission and planned to verify the result from the recipient account.

Verification:
The recipient must be tested again after revocation. The document should no longer be accessible through the Shared with Me workflow, and direct download/API requests must also be rejected. The final result must be recorded after these checks are completed.

Learning:
Revocation needs server-side enforcement, including protection against reuse of old download links or requests.


Responsible Use of AI

AI assistance was used to help troubleshoot errors, review implementation approaches, and plan testing. Code changes and security behavior must be checked against the actual application. Any unresolved issues, failed tests, and incomplete features should be documented honestly rather than described as successful.
