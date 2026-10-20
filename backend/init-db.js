
const pool = require("./db");

async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL DEFAULT 'Other',
        file_type VARCHAR(50),
        file_size BIGINT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Documents table created successfully!");
  } catch (error) {
    console.error("Database setup failed:", error.message);
  } finally {
    await pool.end();
  }
}

initializeDatabase();
