
const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
require("dotenv").config();


const app = express();
const PORT = process.env.PORT || 5000;


app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cache-Control"]
}));


app.use(express.json({ limit: "1mb" }));


const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "trustvault",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD
});

const allowedExtensions = new Set([
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
  ".ppt", ".pptx", ".txt", ".png", ".jpg", ".jpeg"
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = path.basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.has(ext)) {
      return cb(new Error("Unsupported file type"));
    }

    cb(null, true);
  }
});

function createToken(user) {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );
}

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Please login first" });
    }

    const decoded = jwt.verify(
      header.substring(7),
      process.env.JWT_SECRET
    );

    const result = await pool.query(
      "SELECT id, name, email FROM users WHERE id = $1",
      [decoded.id]
    );

    if (!result.rows.length) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
}

function logAction(user, action, documentId = null, documentName = null, details = {}) {
  return pool.query(
    `INSERT INTO audit_logs
       (action, document_id, document_name, actor, ip_address, details, created_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())`,
    [
      action,
      documentId,
      documentName,
      user.name,
      null,
      JSON.stringify(details)
    ]
  );
}

async function getDocumentAccess(user, documentId) {
  const result = await pool.query(
    "SELECT * FROM documents WHERE id = $1",
    [documentId]
  );

  if (!result.rows.length) return null;

  const document = result.rows[0];

  if (Number(document.owner_id) === Number(user.id)) {
    return { document, role: "owner" };
  }

  const permissions = await pool.query(
    `SELECT permission
     FROM document_permissions
     WHERE document_id = $1
       AND LOWER(email) = LOWER($2)
       AND LOWER(status) = 'active'
     LIMIT 1`,
    [documentId, user.email]
  );

  if (!permissions.rows.length) return null;

  const permission = permissions.rows[0].permission;

  if (!["Read", "Edit"].includes(permission)) return null;

  return { document, role: permission };
}

// Health check
app.get("/", (req, res) => {
  res.json({ message: "TrustVault PostgreSQL backend is running" });
});

// Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      password.length < 8
    ) {
      return res.status(400).json({
        message: "Name, email and password of at least 8 characters are required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [name.trim(), normalizedEmail, passwordHash]
    );

    await logAction(result.rows[0], "REGISTER");

    res.status(201).json({
      message: "Registration successful",
      user: result.rows[0]
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "Email already registered"
      });
    }

    console.error("Register error:", error);
    res.status(500).json({ message: "Registration failed" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const result = await pool.query(
      `SELECT id, name, email, password_hash
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    );

    if (!result.rows.length) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const token = createToken(user);
    const publicUser = {
      id: user.id,
      name: user.name,
      email: user.email
    };

    await logAction(publicUser, "LOGIN");

    res.json({
      message: "Login successful",
      token,
      user: publicUser
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

// Current user
app.get("/api/auth/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

// Upload document
app.post(
  "/api/documents",
  authenticate,
  upload.single("document"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Select a document" });
      }

      const category =
        typeof req.body.category === "string" && req.body.category.trim()
          ? req.body.category.trim()
          : "General";

      const result = await pool.query(
        `INSERT INTO documents
           (name, category, file_type, file_size,
            stored_filename, owner_id, review_status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'Pending', NOW())
         RETURNING id, name, category, file_type, file_size,
                   stored_filename, owner_id, review_status, created_at`,
        [
          req.file.originalname,
          category,
          path.extname(req.file.originalname).toLowerCase(),
          req.file.size,
          req.file.filename,
          req.user.id
        ]
      );

      const document = result.rows[0];

      await logAction(
        req.user,
        "UPLOAD",
        document.id,
        document.name
      );

      res.status(201).json({
        message: "Document uploaded successfully",
        document: {
          ...document,
          owner_name: req.user.name
        }
      });
    } catch (error) {
      if (req.file) fs.unlink(req.file.path, () => {});
      console.error("Upload error:", error);
      res.status(500).json({ message: "Document upload failed" });
    }
  }
);
// Documents shared with the currently logged-in user
app.get("/api/shared-with-me", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         d.id,
         d.name,
         d.category,
         d.file_type,
         d.created_at,
         owner.name AS shared_with_name,
         owner.email AS shared_with_email,
         p.permission,
         p.status,
         p.created_at AS shared_at
       FROM document_permissions p
       JOIN documents d ON d.id = p.document_id
       JOIN users owner ON owner.id = d.owner_id
       WHERE LOWER(p.email) = LOWER($1)
       ORDER BY p.created_at DESC`,
      [req.user.email]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Shared with me error:", error);
    res.status(500).json({
      message: "Could not load shared documents"
    });
  }
});
// List documents owned by or shared with current user
app.get("/api/documents", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT d.id, d.name, d.category, d.file_type,
        d.file_size, d.stored_filename, d.owner_id,
        d.review_status, d.created_at,
              u.name AS owner_name,
              CASE WHEN d.owner_id = $1 THEN 'owner'
                   ELSE p.permission END AS access_level
       FROM documents d
       LEFT JOIN users u ON u.id = d.owner_id
       LEFT JOIN document_permissions p
         ON p.document_id = d.id
        AND LOWER(p.email) = LOWER($2)
        AND LOWER(p.status) = 'active'
       WHERE d.owner_id = $1
          OR p.permission IN ('Read', 'Edit')
       ORDER BY d.created_at DESC`,
      [req.user.id, req.user.email]
    );

    res.json({ documents: result.rows });
  } catch (error) {
    console.error("List documents error:", error);
    res.status(500).json({ message: "Could not load documents" });
  }
});

// Get document details
app.get("/api/documents/:id", authenticate, async (req, res) => {
  try {
    const access = await getDocumentAccess(req.user, req.params.id);

    if (!access) {
      return res.status(404).json({
        message: "Document not found or access denied"
      });
    }

    const result = await pool.query(
      `SELECT d.id, d.name, d.category, d.file_type,
              d.file_size, d.owner_id, d.review_status, d.created_at,
              u.name AS owner_name
       FROM documents d
       LEFT JOIN users u ON u.id = d.owner_id
       WHERE d.id = $1`,
      [req.params.id]
    );

    res.json({
      document: {
        ...result.rows[0],
        access_level: access.role
      }
    });
  } catch (error) {
    console.error("Get document error:", error);
    res.status(500).json({ message: "Could not load document" });
  }
});

// Grant or update permission. Owner only.
// Frontend sends { "email": "recipient@example.com", "permission": "Read" }
app.post(
  "/api/documents/:id/permissions",
  authenticate,
  async (req, res) => {
    try {
      const { email, permission } = req.body;

      if (
        typeof email !== "string" ||
        !email.trim() ||
        !["Read", "Edit"].includes(permission)
      ) {
        return res.status(400).json({
          message: "Provide recipient email and Read or Edit permission"
        });
      }

      const owner = await pool.query(
        "SELECT id, name FROM documents WHERE id = $1 AND owner_id = $2",
        [req.params.id, req.user.id]
      );

      if (!owner.rows.length) {
        return res.status(403).json({
          message: "Only the document owner can grant permissions"
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      if (normalizedEmail === req.user.email.toLowerCase()) {
        return res.status(400).json({
          message: "You already own this document"
        });
      }

      const target = await pool.query(
        "SELECT id, name, email FROM users WHERE LOWER(email) = $1",
        [normalizedEmail]
      );

      if (!target.rows.length) {
        return res.status(404).json({
          message: "Recipient must register before sharing"
        });
      }


      await pool.query(
        `INSERT INTO document_permissions
           (name, email, document_id, permission, status, created_at)
         VALUES ($1, $2, $3, $4, 'Active', NOW())
         ON CONFLICT (document_id, LOWER(email))
         WHERE document_id IS NOT NULL
         DO UPDATE SET
           name = EXCLUDED.name,
           permission = EXCLUDED.permission,
           status = 'Active'`,
        [
          target.rows[0].name,
          normalizedEmail,
          req.params.id,
          permission
        ]
      );


      await logAction(
        req.user,
        `GRANT_${permission.toUpperCase()}`,
        req.params.id,
        owner.rows[0].name
      );

      res.json({ message: "Permission saved successfully" });
    } catch (error) {
      console.error("Grant permission error:", error);
      res.status(500).json({
        message: "Could not save permission. Check the permission-table unique constraint."
      });
    }
  }
);

// List permissions. Owner only.
app.get(
  "/api/documents/:id/permissions",
  authenticate,
  async (req, res) => {
    try {
      const owner = await pool.query(
        "SELECT id FROM documents WHERE id = $1 AND owner_id = $2",
        [req.params.id, req.user.id]
      );

      if (!owner.rows.length) {
        return res.status(403).json({
          message: "Only the owner can view permissions"
        });
      }

      const result = await pool.query(
        `SELECT id, name, email, document_id, permission, status, created_at
         FROM document_permissions
         WHERE document_id = $1
         ORDER BY created_at DESC`,
        [req.params.id]
      );

      res.json({ permissions: result.rows });
    } catch (error) {
      console.error("List permissions error:", error);
      res.status(500).json({ message: "Could not load permissions" });
    }
  }
);


 // Revoke permission. Owner only.
app.delete(
  "/api/documents/:id/permissions/:userEmail",
  authenticate,
  async (req, res) => {
    try {
      const owner = await pool.query(
        "SELECT id FROM documents WHERE id = $1 AND owner_id = $2",
        [req.params.id, req.user.id]
      );

      if (!owner.rows.length) {
        return res.status(403).json({
          message: "Only the owner can revoke permissions"
        });
      }

      const email = decodeURIComponent(req.params.userEmail).toLowerCase();

      const result = await pool.query(
        `UPDATE document_permissions
         SET status = 'Revoked'
         WHERE document_id = $1
           AND LOWER(email) = $2
           AND LOWER(status) = 'active'
         RETURNING email`,
        [req.params.id, email]
      );

      if (!result.rows.length) {
        return res.status(404).json({
          message: "Active permission not found"
        });
      }

      await logAction(
        req.user,
        "REVOKE_PERMISSION",
        req.params.id
      );

      res.json({
        message: "Permission revoked successfully"
      });
    } catch (error) {
      console.error("Revoke permission error:", error);
      res.status(500).json({
        message: "Could not revoke permission"
      });
    }
  }
);


// Update review status. Owner or Edit permission.
app.patch(
  "/api/documents/:id/review",
  authenticate,
  async (req, res) => {
    try {
      const { reviewStatus } = req.body;

      if (!["Pending", "Approved", "Rejected"].includes(reviewStatus)) {
        return res.status(400).json({
          message: "Status must be Pending, Approved or Rejected"
        });
      }

      const access = await getDocumentAccess(req.user, req.params.id);

      if (!access) {
        return res.status(404).json({
          message: "Document not found or access denied"
        });
      }

      if (!["owner", "Edit"].includes(access.role)) {
        return res.status(403).json({
          message: "Edit permission required"
        });
      }

      await pool.query(
        "UPDATE documents SET review_status = $1 WHERE id = $2",
        [reviewStatus, req.params.id]
      );

      await logAction(
        req.user,
        `REVIEW_${reviewStatus.toUpperCase()}`,
        req.params.id,
        access.document.name
      );

      res.json({
        message: "Review status updated",
        reviewStatus
      });
    } catch (error) {
      console.error("Review error:", error);
      res.status(500).json({
        message: "Could not update review status"
      });
    }
  }
);

// Download. Owner or active Read/Edit permission.
app.get(
  "/api/documents/:id/download",
  authenticate,
  async (req, res) => {
    try {
      const access = await getDocumentAccess(req.user, req.params.id);

      if (!access) {
        return res.status(404).json({
          message: "Document not found or access denied"
        });
      }

      const filename = path.basename(access.document.stored_filename || "");
      const filePath = path.resolve(uploadDir, filename);

      if (
        !filename ||
        !filePath.startsWith(uploadDir + path.sep) ||
        !fs.existsSync(filePath)
      ) {
        return res.status(404).json({ message: "File not found on server" });
      }

      await logAction(
        req.user,
        "DOWNLOAD",
        req.params.id,
        access.document.name
      );

      res.download(filePath, access.document.name, (error) => {
        if (error && !res.headersSent) {
          console.error("Download error:", error);
          res.status(500).json({ message: "Download failed" });
        }
      });
    } catch (error) {
      console.error("Download error:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Download failed" });
      }
    }
  }
);

// Delete. Owner only.
app.delete("/api/documents/:id", authenticate, async (req, res) => {
  const connection = await pool.connect();
  let fileToDelete = null;

  try {
    await connection.query("BEGIN");

    const result = await connection.query(
      `SELECT id, name, stored_filename
       FROM documents
       WHERE id = $1 AND owner_id = $2
       FOR UPDATE`,
      [req.params.id, req.user.id]
    );

    if (!result.rows.length) {
      await connection.query("ROLLBACK");
      return res.status(404).json({
        message: "Document not found or you are not the owner"
      });
    }

    const document = result.rows[0];
    fileToDelete = document.stored_filename;

    await connection.query(
      "DELETE FROM document_permissions WHERE document_id = $1",
      [document.id]
    );

    await connection.query(
      "DELETE FROM documents WHERE id = $1",
      [document.id]
    );

    await connection.query(
      `INSERT INTO audit_logs
         (action, document_id, document_name, actor, created_at)
       VALUES ('DELETE', $1, $2, $3, NOW())`,
      [document.id, document.name, req.user.name]
    );

    await connection.query("COMMIT");

    if (fileToDelete) {
      const filePath = path.resolve(
        uploadDir,
        path.basename(fileToDelete)
      );

      if (filePath.startsWith(uploadDir + path.sep)) {
        fs.unlink(filePath, (error) => {
          if (error && error.code !== "ENOENT") {
            console.error("File cleanup error:", error);
          }
        });
      }
    }

    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    await connection.query("ROLLBACK").catch(() => {});
    console.error("Delete error:", error);
    res.status(500).json({ message: "Document deletion failed" });
  } finally {
    connection.release();
  }
});


 // Dashboard statistics
app.get("/api/dashboard-stats", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const userName = req.user.name;

    // Total documents accessible to this user
    const totalResult = await pool.query(
      `SELECT COUNT(DISTINCT d.id)::int AS total
       FROM documents d
       LEFT JOIN document_permissions p
         ON p.document_id = d.id
        AND LOWER(p.email) = LOWER($2)
        AND LOWER(p.status) = 'active'
       WHERE d.owner_id = $1
          OR (
            p.permission IN ('Read', 'Edit')
            AND LOWER(p.status) = 'active'
          )`,
      [userId, userEmail]
    );

    // Documents shared by this user with other people
    const sharedResult = await pool.query(
      `SELECT COUNT(DISTINCT d.id)::int AS total
       FROM documents d
       JOIN document_permissions p
         ON p.document_id = d.id
       WHERE d.owner_id = $1
         AND LOWER(p.status) = 'active'`,
      [userId]
    );

    // Pending and completed reviews for accessible documents
    const reviewResult = await pool.query(
      `SELECT
         COUNT(*) FILTER (
           WHERE d.review_status = 'Pending'
         )::int AS pending,
         COUNT(*) FILTER (
           WHERE d.review_status IN ('Approved', 'Rejected')
         )::int AS completed
       FROM documents d
       WHERE d.owner_id = $1
          OR EXISTS (
            SELECT 1
            FROM document_permissions p
            WHERE p.document_id = d.id
              AND LOWER(p.email) = LOWER($2)
              AND LOWER(p.status) = 'active'
              AND p.permission IN ('Read', 'Edit')
          )`,
      [userId, userEmail]
    );

    // Audit events recorded for this user
    const eventsResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM audit_logs
       WHERE actor = $1`,
      [userName]
    );

    res.json({
      totalDocuments: totalResult.rows[0].total,
      sharedWithOthers: sharedResult.rows[0].total,
      pendingReviews: reviewResult.rows[0].pending,
      completedReviews: reviewResult.rows[0].completed,
      securityEvents: eventsResult.rows[0].total
    });
  } catch (error) {
    console.error("Dashboard statistics error:", error);
    res.status(500).json({
      message: "Could not load dashboard statistics"
    });
  }
});


 // User-specific audit logs
app.get("/api/audit-logs", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         id,
         action,
         document_id,
         document_name,
         actor,
         ip_address,
         details,
         created_at
       FROM audit_logs
       WHERE LOWER(TRIM(actor)) = LOWER(TRIM($1))
       ORDER BY created_at DESC
       LIMIT 200`,
      [req.user.name]
    );

    console.log(
      `Audit logs: user=${req.user.name}, records=${result.rows.length}`
    );

    res.json({ logs: result.rows });
  } catch (error) {
    console.error("Audit logs error:", error);

    res.status(500).json({
      message: "Could not load audit logs"
    });
  }
});


// Error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE"
      ? "File size must not exceed 10 MB"
      : err.message;

    return res.status(400).json({ message });
  }

  console.error("Request error:", err);
  res.status(400).json({
    message: err.message || "Request failed"
  });
});

// Database initialization: add missing columns only.
async function initializeDatabase() {
  await pool.query(`
    ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id)
  `);

  await pool.query(`
    ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) NOT NULL DEFAULT 'Pending'
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_document_permissions_email
    ON document_permissions (document_id, LOWER(email))
    WHERE document_id IS NOT NULL
  `);
}

async function startServer() {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error("Configure JWT_SECRET with at least 32 characters in .env");
    }

    await pool.query("SELECT 1");
    await initializeDatabase();

    const server = app.listen(PORT, () => {
      console.log(`TrustVault backend running on port ${PORT}`);
    });

    server.on("error", (error) => {
      console.error("HTTP server error:", error.message);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
