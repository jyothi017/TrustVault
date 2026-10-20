
import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000/api/documents";

const categories = ["Business", "HR", "Security", "Finance", "Other"];

function formatSize(bytes) {
  const size = Number(bytes) || 0;

  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (size < 1024) {
    return `${size} bytes`;
  }

  return `${Math.round(size / 1024)} KB`;
}

function formatDate(value) {
  if (!value) return "Today";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function mapDocument(doc) {
  return {
    id: doc.id,
    name: doc.name || "Untitled document",
    category: String(doc.category || "Other").trim(),
    size: formatSize(doc.file_size),
    date: formatDate(doc.created_at),
    type: doc.file_type || doc.name?.split(".").pop().toUpperCase() || "FILE",
    hasFile: Boolean(doc.stored_filename),
  };
}

export default function MyVault() {
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All files");
  const [selectedCategory, setSelectedCategory] = useState("Business");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Load documents from the backend.
  async function loadDocuments() {
    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("Could not load documents.");
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Invalid document data received.");
      }

      setFiles(data.map(mapDocument));
    } catch (error) {
      console.error("Load documents error:", error);
      setMessage(error.message || "Could not connect to the backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  // Search documents and filter them by category.
  const filteredFiles = useMemo(() => {
    const searchText = search.trim().toLowerCase();
    const selectedFilter = category.trim().toLowerCase();

    return files.filter((file) => {
      const matchesSearch = file.name
        .toLowerCase()
        .includes(searchText);

      const documentCategory = String(file.category || "")
        .trim()
        .toLowerCase();

      const matchesCategory =
        selectedFilter === "all files" ||
        documentCategory === selectedFilter;

      return matchesSearch && matchesCategory;
    });
  }, [files, search, category]);

  // Upload documents.
  async function handleUpload(event) {
    const input = event.target;
    const selectedFiles = Array.from(input.files || []);

    input.value = "";

    if (selectedFiles.length === 0 || busy) return;

    const allowedExtensions = /\.(pdf|doc|docx|xls|xlsx|txt)$/i;
    const maxSize = 10 * 1024 * 1024;

    const validFiles = selectedFiles.filter(
      (file) =>
        allowedExtensions.test(file.name) &&
        file.size <= maxSize
    );

    const skippedCount = selectedFiles.length - validFiles.length;

    if (validFiles.length === 0) {
      setMessage(
        "Choose PDF, DOC, DOCX, XLS, XLSX or TXT files up to 10 MB."
      );
      return;
    }

    setBusy(true);

    let savedCount = 0;
    let failedCount = 0;
    let lastError = "";

    try {
      for (const file of validFiles) {
        try {
          const formData = new FormData();

          formData.append("file", file);
          formData.append("category", selectedCategory);

          const response = await fetch(`${API_URL}/upload`, {
            method: "POST",
            body: formData,
          });

          const result = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(result.error || "Upload failed.");
          }

          savedCount++;
        } catch (error) {
          console.error("Upload failed:", file.name, error);
          lastError = error.message;
          failedCount++;
        }
      }

      await loadDocuments();

      setCategory("All files");

      setMessage(
        `${savedCount} file(s) uploaded successfully.` +
          (failedCount
            ? ` ${failedCount} file(s) failed. ${lastError}`
            : "") +
          (skippedCount
            ? ` ${skippedCount} unsupported or oversized file(s) skipped.`
            : "")
      );
    } finally {
      setBusy(false);
    }
  }

  // Download a document.
  async function downloadFile(file) {
    if (!file.hasFile) {
      setMessage(
        "This record has no uploaded file. Please upload the file again."
      );
      return;
    }

    try {
      setMessage(`Downloading ${file.name}...`);

      const response = await fetch(
        `${API_URL}/${file.id}/download`
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Download failed.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = file.name;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

      setMessage(`Download started: ${file.name}`);
    } catch (error) {
      console.error("Download failed:", error);
      setMessage(error.message || "Could not download the file.");
    }
  }

  // Delete a document.
  async function deleteFile(id) {
    if (busy) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this document?"
    );

    if (!confirmed) return;

    setBusy(true);

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Could not delete document.");
      }

      setFiles((previous) =>
        previous.filter((file) => file.id !== id)
      );

      setMessage("Document deleted.");
    } catch (error) {
      console.error("Delete failed:", error);
      setMessage(error.message || "Could not delete document.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vault-page">
      <div className="vault-heading">
        <div>
          <span className="vault-eyebrow">
            YOUR DOCUMENTS / PRIVATE SPACE
          </span>

          <h1>My Vault</h1>

          <p>
            Keep your important documents organised in one place.
          </p>
        </div>

        <div className="vault-upload-controls">
          <select
            className="vault-category-select"
            aria-label="Select upload category"
            value={selectedCategory}
            onChange={(event) =>
              setSelectedCategory(event.target.value)
            }
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <label className="vault-upload-button">
            <span>＋</span>{" "}
            {busy ? "Please wait..." : "Upload document"}

            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
              onChange={handleUpload}
              disabled={busy}
            />
          </label>
        </div>
      </div>

      <div className="vault-notice">
        <span>◈</span>

        <div>
          <strong>Your document space</strong>

          <p>
            Actual files are stored on the backend server, and document
            details are saved in PostgreSQL. Maximum file size: 10 MB.
          </p>
        </div>
      </div>

      <div className="vault-stats">
        <div>
          <span>Total documents</span>
          <strong>{files.length}</strong>
        </div>

        <div>
          <span>Categories</span>
          <strong>
            {new Set(
              files.map((file) =>
                String(file.category || "").trim().toLowerCase()
              )
            ).size}
          </strong>
        </div>

        <div>
          <span>Visible results</span>
          <strong>{filteredFiles.length}</strong>
        </div>
      </div>

      <section className="vault-panel">
        <div className="vault-panel-heading">
          <div>
            <h2>All documents</h2>
            <p>Search, download and manage your documents.</p>
          </div>

          <span className="vault-count">
            {filteredFiles.length} files
          </span>
        </div>

        <div className="vault-toolbar">
          <label className="vault-search">
            <span>⌕</span>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by document name..."
            />
          </label>

          <select
            aria-label="Filter documents by category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="All files">All files</option>

            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {message && (
          <p className="vault-message" role="status">
            {message}
          </p>
        )}

        <div className="vault-table-wrap">
          <table className="vault-table">
            <thead>
              <tr>
                <th>DOCUMENT</th>
                <th>CATEGORY</th>
                <th>FILE SIZE</th>
                <th>UPDATED</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {!loading &&
                filteredFiles.map((file) => (
                  <tr key={file.id}>
                    <td>
                      <div className="vault-file">
                        <span
                          className={`vault-file-icon ${file.type.toLowerCase()}`}
                        >
                          {file.type}
                        </span>

                        <strong>{file.name}</strong>
                      </div>
                    </td>

                    <td>
                      <span className="vault-category">
                        {file.category}
                      </span>
                    </td>

                    <td>{file.size}</td>
                    <td>{file.date}</td>

                    <td>
                      <div className="vault-actions">
                        <button
                          className="vault-download"
                          type="button"
                          onClick={() => downloadFile(file)}
                          disabled={!file.hasFile || busy}
                          title={
                            file.hasFile
                              ? "Download document"
                              : "This record has no stored file"
                          }
                        >
                          Download
                        </button>

                        <button
                          className="vault-delete"
                          type="button"
                          onClick={() => deleteFile(file.id)}
                          disabled={busy}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {loading && (
            <div className="vault-empty">
              Loading documents...
            </div>
          )}

          {!loading && filteredFiles.length === 0 && (
            <div className="vault-empty">
              No documents found. Upload a document or try another
              search or category.
            </div>
          )}
        </div>

        <div className="vault-footer">
          <span>PostgreSQL-backed document records</span>
          <span>Server-side file storage connected</span>
        </div>
      </section>
    </div>
  );
}
