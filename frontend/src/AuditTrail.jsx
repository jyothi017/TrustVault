
import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "https://trustvault-backend-z1yy.onrender.com/api/audit-logs";

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActionLabel(action) {
  const labels = {
    UPLOAD: "Document uploaded",
    DOWNLOAD: "Document downloaded",
    DELETE: "Document deleted",
    CREATE_METADATA: "Document metadata created",
  };

  return labels[action] || String(action || "Activity").replaceAll("_", " ");
}

function getAuthHeaders() {
  const savedSession = localStorage.getItem("trustvault_session");
  const session = savedSession ? JSON.parse(savedSession) : null;

  if (!session?.token) {
    throw new Error("Please log in again to view audit logs.");
  }

  return {
    Authorization: `Bearer ${session.token}`,
  };
}

export default function AuditTrail() {
  const [activities, setActivities] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError("");

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
          data.error || `Server returned ${response.status}`
        );
      }

     
const logList = Array.isArray(data) ? data : data.logs;

if (!Array.isArray(logList)) {
  throw new Error("Unexpected response from the server.");
}

setActivities(logList);

    } catch (err) {
      setError(
        err.message || "Could not load audit logs. Check the backend."
      );
      console.error("Audit logs fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const filtered = useMemo(() => {
    return activities.filter((item) => {
      const action = String(item.action || "");
      const document = String(item.document_name || "");
      const actor = String(item.actor || "");

      const matchesSearch = `${action} ${document} ${actor}`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesFilter = filter === "All" || action === filter;

      return matchesSearch && matchesFilter;
    });
  }, [activities, search, filter]);

  const uploadCount = activities.filter(
    (item) => item.action === "UPLOAD"
  ).length;

  const downloadCount = activities.filter(
    (item) => item.action === "DOWNLOAD"
  ).length;

  const deleteCount = activities.filter(
    (item) => item.action === "DELETE"
  ).length;

  return (
    <div className="vault-page">
      <div className="vault-heading">
        <div>
          <span className="vault-eyebrow">
            SECURITY / ACTIVITY HISTORY
          </span>
          <h1>Audit Trail</h1>
          <p>Review document activity recorded by TrustVault.</p>
        </div>

        <button
          type="button"
          className="text-button"
          onClick={fetchActivities}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      <div className="vault-stats">
        <div>
          <span>Total events</span>
          <strong>{activities.length}</strong>
        </div>

        <div>
          <span>Uploads</span>
          <strong>{uploadCount}</strong>
        </div>

        <div>
          <span>Downloads</span>
          <strong>{downloadCount}</strong>
        </div>

        <div>
          <span>Deletions</span>
          <strong>{deleteCount}</strong>
        </div>
      </div>

      <section className="vault-panel">
        <div className="vault-panel-heading">
          <div>
            <h2>Activity history</h2>
            <p>Search and filter actual audit records.</p>
          </div>

          <span className="vault-count">{filtered.length} events</span>
        </div>

        <div className="vault-toolbar">
          <label className="vault-search">
            <span>⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search action, document, or user..."
            />
          </label>

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter audit action"
          >
            <option value="All">All actions</option>
            <option value="UPLOAD">Upload</option>
            <option value="DOWNLOAD">Download</option>
            <option value="DELETE">Delete</option>
            <option value="CREATE_METADATA">Create metadata</option>
          </select>
        </div>

        {error && (
          <div className="vault-empty" role="alert">
            {error}
            <button type="button" onClick={fetchActivities}>
              Try again
            </button>
          </div>
        )}

        <div className="vault-table-wrap">
          <table className="vault-table">
            <thead>
              <tr>
                <th>ACTION</th>
                <th>DOCUMENT</th>
                <th>ACTOR</th>
                <th>IP ADDRESS</th>
                <th>DATE &amp; TIME</th>
              </tr>
            </thead>

            <tbody>
              {!error &&
                !loading &&
                filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{getActionLabel(item.action)}</strong>
                    </td>
                    <td>{item.document_name || "—"}</td>
                    <td>{item.actor || "anonymous"}</td>
                    <td>{item.ip_address || "—"}</td>
                    <td>{formatDate(item.created_at)}</td>
                  </tr>
                ))}
            </tbody>
          </table>

          {loading && (
            <div className="vault-empty">Loading audit records...</div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="vault-empty">
              No matching audit records found.
            </div>
          )}
        </div>

        <div className="vault-footer">
          <span>Source: TrustVault PostgreSQL audit_logs</span>
          <span>Showing up to 200 recent records</span>
        </div>
      </section>
    </div>
  );
}
