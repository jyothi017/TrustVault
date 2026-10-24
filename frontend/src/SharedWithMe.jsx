
import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000/api/shared-with-me";

function getAuthHeaders() {
  const savedSession = localStorage.getItem("trustvault_session");
  const session = savedSession ? JSON.parse(savedSession) : null;

  if (!session?.token) {
    throw new Error("Please log in again to view shared documents.");
  }

  return {
    Authorization: `Bearer ${session.token}`,
  };
}

export default function SharedWithMe() {
  const [sharedDocuments, setSharedDocuments] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          ...getAuthHeaders(),
          "Cache-Control": "no-cache",
        },
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || `Could not load shared documents (${response.status}).`
        );
      }

      if (!Array.isArray(data)) {
        throw new Error("Invalid response received from the server.");
      }

      setSharedDocuments(data);
    } catch (err) {
      setError(err.message || "Could not connect to the backend.");
      console.error("Shared documents error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const documents = useMemo(() => {
    return sharedDocuments.filter((doc) => {
      const name = String(doc.name || "");
      const owner = String(doc.shared_with_name || "");
      const email = String(doc.shared_with_email || "");

      const matchesSearch = `${name} ${owner} ${email}`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesFilter = filter === "All" || doc.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [sharedDocuments, search, filter]);

  const activeCount = sharedDocuments.filter(
    (doc) => doc.status === "Active"
  ).length;

  const viewCount = sharedDocuments.filter(
    (doc) => doc.permission === "Read" || doc.permission === "View"
  ).length;

  return (
    <div className="vault-page">
      <div className="vault-heading">
        <div>
          <span className="vault-eyebrow">
            DOCUMENT ACCESS / COLLABORATION
          </span>
          <h1>Shared with me</h1>
          <p>Documents shared with your account.</p>
        </div>

        <button
          className="text-button"
          type="button"
          onClick={loadDocuments}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      <div className="vault-stats">
        <div>
          <span>Total shared documents</span>
          <strong>{loading ? "…" : sharedDocuments.length}</strong>
        </div>

        <div>
          <span>Active access</span>
          <strong>{loading ? "…" : activeCount}</strong>
        </div>

        <div>
          <span>View access</span>
          <strong>{loading ? "…" : viewCount}</strong>
        </div>
      </div>

      <section className="vault-panel">
        <div className="vault-panel-heading">
          <div>
            <h2>Shared documents</h2>
            <p>Documents assigned to your account through permissions.</p>
          </div>

          <span className="vault-count">{documents.length} files</span>
        </div>

        <div className="vault-toolbar">
          <label className="vault-search">
            <span>⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search document or sharer..."
            />
          </label>

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter by access status"
          >
            <option value="All">All statuses</option>
            <option value="Active">Active</option>
            <option value="Revoked">Revoked</option>
          </select>
        </div>

        {error && (
          <div className="vault-empty" role="alert">
            {error}
            <button type="button" onClick={loadDocuments}>
              Try again
            </button>
          </div>
        )}

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
                <th>SHARED BY</th>
                <th>PERMISSION</th>
                <th>SHARED DATE</th>
                <th>STATUS</th>
              </tr>
            </thead>

            <tbody>
              {!loading && !error && documents.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div className="vault-file">
                      <span className="vault-file-icon pdf">
                        {String(doc.name || "FILE").split(".").pop().toUpperCase()}
                      </span>
                      <strong>{doc.name || "Unnamed document"}</strong>
                    </div>
                  </td>

                  <td>
                    <strong>{doc.shared_with_name || "Shared user"}</strong>
                    <br />
                    <span>{doc.shared_with_email || "—"}</span>
                  </td>

                  <td>
                    <span className="vault-category">
                      {doc.permission || "Read"}
                    </span>
                  </td>

                  <td>
                    {doc.shared_at
                      ? new Date(doc.shared_at).toLocaleDateString("en-IN")
                      : "—"}
                  </td>

                  <td>
                    <span className="vault-category">
                      {doc.status || "Active"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && (
            <div className="vault-empty">Loading shared documents...</div>
          )}

          {!loading && !error && documents.length === 0 && (
            <div className="vault-empty">
              No shared documents found for your account.
            </div>
          )}
        </div>

        <div className="vault-footer">
          <span>Source: TrustVault database permissions</span>
          <span>{loading ? "Loading..." : `${sharedDocuments.length} records`}</span>
        </div>
      </section>
    </div>
  );
}
