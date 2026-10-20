
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const pool = require("./db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

app.use(cors());
app.use(express.json());

// Save an event in the audit_logs table.
async function logAudit(req, action, documentId, documentName, details = {}) {
  try {
    await pool.query(
      `INSERT INTO audit_logs
        (action, document_id, document_name, actor, ip_address, details)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        action,
        documentId,
        documentName,
        "anonymous",
        req.ip || null,
        JSON.stringify(details),
      ]
    );

    console.log(`AUDIT: ${action} - ${documentName}`);
  } catch (error) {
    console.error("AUDIT LOG ERROR:", error.message);
  }
}

// Allowed document types.
const allowedExtensions = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
]);

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDir);
  },

  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, crypto.randomUUID() + extension);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.has(extension)) {
      return callback(
        new Error(
          "Only PDF, DOC, DOCX, XLS, XLSX and TXT files are allowed."
        )
      );
    }

    callback(null, true);
  },
});

// Home route.
app.get("/", (req, res) => {
  res.json({
    message: "TrustVault backend is running!",
  });
});

// Health check.
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database"
    );

    res.json({
      status: "OK",
      database: result.rows[0].database,
    });
  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      error: "Database connection failed",
    });
  }
});

// Get all documents.
app.get("/api/documents", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM documents ORDER BY created_at DESC"
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      error: "Could not fetch documents",
    });
  }
});

// Get latest 200 audit logs.
app.get("/api/audit-logs", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, action, document_id, document_name,
              actor, ip_address, details, created_at
       FROM audit_logs
       ORDER BY created_at DESC
       LIMIT 200`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("AUDIT FETCH ERROR:", error.message);

    res.status(500).json({
      error: "Could not fetch audit logs",
    });
  }
});

// Upload a document and record the upload event.
app.post("/api/documents/upload", (req, res) => {
  upload.single("file")(req, res, async (error) => {
    if (error) {
      console.error("UPLOAD ERROR:", error.message);

      return res.status(400).json({
        error: error.message || "File upload failed.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "Please select a file.",
      });
    }

    const category = req.body.category || "Other";
    const extension = path.extname(req.file.originalname).toLowerCase();

    try {
      const result = await pool.query(
        `INSERT INTO documents
          (name, category, file_type, file_size, stored_filename)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          req.file.originalname,
          category,
          extension.slice(1).toUpperCase(),
          req.file.size,
          req.file.filename,
        ]
      );

      const document = result.rows[0];

      await logAudit(
        req,
        "UPLOAD",
        document.id,
        document.name,
        {
          category: document.category,
          file_size: document.file_size,
          file_type: document.file_type,
        }
      );

      res.status(201).json(document);
    } catch (dbError) {
      await fs.promises.unlink(req.file.path).catch(() => {});

      console.error(dbError.message);

      res.status(500).json({
        error: "Could not save the uploaded document.",
      });
    }
  });
});

// Create metadata without uploading a file.
app.post("/api/documents", async (req, res) => {
  const { name, category, file_type, file_size } = req.body;

  if (!name || !category) {
    return res.status(400).json({
      error: "Document name and category are required",
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO documents
        (name, category, file_type, file_size)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, category, file_type || null, file_size || 0]
    );

    const document = result.rows[0];

    await logAudit(
      req,
      "CREATE_METADATA",
      document.id,
      document.name,
      {
        category: document.category,
      }
    );

    res.status(201).json(document);
  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      error: "Could not add document",
    });
  }
});

// Download a document and record the event.
app.get("/api/documents/:id/download", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "Invalid document ID",
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, name, stored_filename
       FROM documents
       WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Document not found",
      });
    }

    const document = result.rows[0];

    if (!document.stored_filename) {
      return res.status(404).json({
        error: "This older record has no uploaded file.",
      });
    }

    const filePath = path.join(uploadDir, document.stored_filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: "Stored file not found",
      });
    }

    res.download(filePath, document.name, async (downloadError) => {
      if (downloadError) {
        console.error("DOWNLOAD ERROR:", downloadError.message);
        return;
      }

      await logAudit(
        req,
        "DOWNLOAD",
        document.id,
        document.name
      );
    });
  } catch (error) {
    console.error(error.message);

    if (!res.headersSent) {
      res.status(500).json({
        error: "Could not download document",
      });
    }
  }
});

// Delete a document and record the event.
app.delete("/api/documents/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "Invalid document ID",
    });
  }

  try {
    const result = await pool.query(
      `DELETE FROM documents
       WHERE id = $1
       RETURNING id, name, category, stored_filename`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Document not found",
      });
    }

    const document = result.rows[0];

    await logAudit(
      req,
      "DELETE",
      document.id,
      document.name,
      {
        category: document.category,
      }
    );

    if (document.stored_filename) {
      const filePath = path.join(uploadDir, document.stored_filename);

      await fs.promises.unlink(filePath).catch((error) => {
        if (error.code !== "ENOENT") {
          console.error(
            "Could not remove stored file:",
            error.message
          );
        }
      });
    }

    res.json({
      message: "Document deleted",
      id: document.id,
    });
  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      error: "Could not delete document",
    });
  }
});

// Initialize the database and start the server.
async function startServer() {
  try {
    await pool.query(`
      ALTER TABLE documents
      ADD COLUMN IF NOT EXISTS stored_filename VARCHAR(255)
    `);

    app.listen(PORT, () => {
      console.log(
        `TrustVault server running on http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Could not initialize the database:",
      error.message
    );

    process.exit(1);
  }
}

startServer();
