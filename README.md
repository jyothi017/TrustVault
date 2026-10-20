# TrustVault - Secure Document Management System

TrustVault is a web-based document management application built to upload, organize, download, and manage documents. It also maintains an audit trail of document activities.

## Screenshots

### Overview

![TrustVault Overview](frontend/public/screenshots/overview.png)

### My Vault

![My Vault](frontend/public/screenshots/my-vault.png)

### Audit Trail

![TrustVault Audit Trail](frontend/public/screenshots/audit-trail.png)

## Features

- Upload and manage documents
- Search documents and filter by category
- Download and delete documents
- Store document metadata in PostgreSQL
- Track document activities through audit logs
- View recent audit events, including upload, download, and delete actions

## Technologies Used

- Frontend: React, JavaScript, Vite
- Backend: Node.js, Express
- Database: PostgreSQL
- Version Control: Git and GitHub

## Project Structure

```text
TrustVault/
├── backend/
│   ├── db.js
│   ├── init-db.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── screenshots/
│   │       ├── overview.png
│   │       ├── my-vault.png
│   │       └── audit-trail.png
│   └── src/
└── README.md
```

## Run Locally

### Prerequisites

- Node.js and npm
- PostgreSQL

### 1. Configure the Database

Create the PostgreSQL database and configure the required environment variables in `backend/.env`. Never commit your `.env` file or expose database credentials.

### 2. Start the Backend

Open a terminal in the backend folder and run:

```bash
npm install
node server.js
```

### 3. Start the Frontend

Open another terminal in the frontend folder and run:

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser. The backend runs at http://localhost:5000.

## Security

Environment variables, dependency folders, and uploaded documents are excluded from version control using `.gitignore`.

## Author

Jetty Jyothi

GitHub: https://github.com/jyothi017