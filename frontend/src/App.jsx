
import { useEffect, useMemo, useState } from "react";
import "./App.css";
import AccessControl from "./AccessControl";
import MyVault from "./MyVault";
import SharedWithMe from "./SharedWithMe";
import AuditTrail from "./AuditTrail";
import ThreatCenter from "./ThreatCenter";
import Login from "./Login";


const API_BASE = "https://trustvault-backend-z1yy.onrender.com/api";


const navItems = [
  { icon: "◈", label: "Overview" },
  { icon: "▤", label: "My Vault" },
  { icon: "⇄", label: "Shared with me" },
  { icon: "♧", label: "Access Control" },
  { icon: "◷", label: "Audit Trail" },
  { icon: "⛨", label: "Threat Center" },
];

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getFileType(doc) {
  const type = String(doc.file_type || "").trim();

  if (type) {
    const normalized = type.replace(/^\./, "").toUpperCase();
    if (normalized === "APPLICATION/PDF") return "PDF";
    return normalized;
  }

  const name = String(doc.name || "");
  const extension = name.includes(".") ? name.split(".").pop() : "";

  return extension ? extension.toUpperCase() : "FILE";
}

function getFileColor(type) {
  const value = String(type).toLowerCase();

  if (value.includes("pdf")) return "purple";
  if (value.includes("xls") || value.includes("csv")) return "green";
  if (value.includes("doc") || value.includes("txt")) return "blue";

  return "pink";
}

function getActionLabel(action) {
  const labels = {
    REGISTER: "Account registered",
    LOGIN: "User logged in",
    UPLOAD: "Document uploaded",
    CREATE_METADATA: "Document record created",
    DOWNLOAD: "Document downloaded",
    DELETE: "Document deleted",
    GRANT_ACCESS: "Document access granted",
    GRANT_READ: "Read permission granted",
    GRANT_EDIT: "Edit permission granted",
    REVOKE_ACCESS: "Document access revoked",
    REVOKE_PERMISSION: "Document permission revoked",
    REVIEW_STATUS_UPDATED: "Review status updated",
    REVIEW_PENDING: "Review marked pending",
    REVIEW_APPROVED: "Document approved",
    REVIEW_REJECTED: "Document rejected",
  };

  const key = String(action || "").toUpperCase();

  return (
    labels[key] ||
    String(action || "Activity recorded").replaceAll("_", " ")
  );
}

function getActivityStyle(action) {
  const value = String(action || "").toUpperCase();

  if (
    value.includes("UPLOAD") ||
    value.includes("REGISTER") ||
    value.includes("GRANT")
  ) {
    return "uploaded";
  }

  if (value.includes("DOWNLOAD") || value.includes("LOGIN")) {
    return "success";
  }

  if (value.includes("DELETE") || value.includes("REVOKE")) {
    return "denied";
  }

  return "changed";
}

function getDocumentOwner(doc) {
  return (
    doc.owner_name ||
    doc.owner ||
    doc.uploaded_by ||
    ""
  );
}

function getDocumentAccess(doc) {
  return (
    doc.access_level ||
    doc.access ||
    (doc.owner_user_id || doc.owner_id ? "" : "")
  );
}

function App() {
  const [session, setSession] = useState(() => {
    try {
      const savedSession = localStorage.getItem("trustvault_session");
      return savedSession ? JSON.parse(savedSession) : null;
    } catch {
      return null;
    }
  });

  const [active, setActive] = useState("Overview");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All files");

  const [documents, setDocuments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
  const refreshDashboard = () => {
    if (document.visibilityState === "visible") {
      setRefreshKey((previous) => previous + 1);
    }
  };

  window.addEventListener("focus", refreshDashboard);
  document.addEventListener("visibilitychange", refreshDashboard);

  return () => {
    window.removeEventListener("focus", refreshDashboard);
    document.removeEventListener("visibilitychange", refreshDashboard);
  };
}, []);
  const [dashboardStats, setDashboardStats] = useState({
    totalDocuments: 0,
    sharedWithOthers: 0,
    pendingReviews: 0,
    completedReviews: 0,
    securityEvents: 0,
  });

  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      if (!session?.token) {
        setDocuments([]);
        setAuditLogs([]);
        setDashboardLoading(false);
        setDashboardError("");
        return;
      }

      try {
        setDashboardLoading(true);
        setDashboardError("");

        const headers = {
          Authorization: `Bearer ${session.token}`,
        };

        const [docsResponse, logsResponse, statsResponse] =
          await Promise.all([
            fetch(`${API_BASE}/documents`, { headers }),
            fetch(`${API_BASE}/audit-logs`, { headers }),
            fetch(`${API_BASE}/dashboard-stats`, { headers }),
          ]);

        if (
  docsResponse.status === 401 ||
  logsResponse.status === 401 ||
  statsResponse.status === 401
) {
  localStorage.removeItem("trustvault_session");

  if (!cancelled) {
    setSession(null);
    setDocuments([]);
    setAuditLogs([]);
    setDashboardError("");
  }

  return;
}
        if (!docsResponse.ok) {
          throw new Error("Could not load documents.");
        }

        if (!logsResponse.ok) {
          throw new Error("Could not load audit activity.");
        }

        if (!statsResponse.ok) {
          throw new Error("Could not load dashboard statistics.");
        }

        const [docsData, logsData, statsData] = await Promise.all([
          docsResponse.json(),
          logsResponse.json(),
          statsResponse.json(),
        ]);

        // APIs may return either an array or an object containing an array.
        const documentList = Array.isArray(docsData)
          ? docsData
          : docsData?.documents;

        const activityList = Array.isArray(logsData)
          ? logsData
          : logsData?.logs;

        // The tested dashboard-stats endpoint returns its statistics directly.
        if (
          !Array.isArray(documentList) ||
          !Array.isArray(activityList) ||
          !statsData ||
          typeof statsData !== "object"
        ) {
          throw new Error("The backend returned an unexpected data format.");
        }

        if (!cancelled) {
          setDocuments(documentList);
          setAuditLogs(activityList);

          setDashboardStats({
            totalDocuments: Number(statsData.totalDocuments) || 0,
            sharedWithOthers: Number(statsData.sharedWithOthers) || 0,
            pendingReviews: Number(statsData.pendingReviews) || 0,
            completedReviews: Number(statsData.completedReviews) || 0,
            securityEvents: Number(statsData.securityEvents) || 0,
          });
        }
      } catch (error) {
        console.error("Dashboard loading error:", error);

        if (!cancelled) {
          setDashboardError(
            error.message || "Could not connect to the backend."
          );
        }
      } finally {
        if (!cancelled) {
          setDashboardLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [session?.token, refreshKey]);

  const visibleDocuments = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return documents.filter((doc) => {
      const name = doc.name || "Untitled document";
      const owner = getDocumentOwner(doc);
      const docCategory = doc.category || "Other";

      const matchesSearch = `${name} ${owner} ${docCategory}`
        .toLowerCase()
        .includes(searchText);

      const matchesCategory =
        category === "All files" || docCategory === category;

      return matchesSearch && matchesCategory;
    });
  }, [documents, search, category]);

  const recentDocuments = useMemo(() => {
    return [...visibleDocuments]
      .sort(
        (a, b) =>
          new Date(b.created_at || 0) - new Date(a.created_at || 0)
      )
      .slice(0, 6);
  }, [visibleDocuments]);

  const recentActivity = useMemo(
    () => [...auditLogs].slice(0, 5),
    [auditLogs]
  );

const categoryOptions = useMemo(() => {
  const defaultCategories = [
    "Business",
    "HR",
    "Security",
    "Finance",
    "Other",
  ];

  const documentCategories = documents.map(
    (doc) => doc.category || "Other"
  );

  return [
    ...new Set([...defaultCategories, ...documentCategories]),
  ].sort((a, b) => a.localeCompare(b));
}, [documents]);
function handleDocumentsChanged() {
  setRefreshKey((previous) => previous + 1);
}
  function handleLogout() {
    localStorage.removeItem("trustvault_session");
    setSession(null);
    setActive("Overview");
    setDocuments([]);
    setAuditLogs([]);
    setDashboardError("");
  }

  if (!session?.token) {
    return (
      <Login
        onLogin={(data) => {
          localStorage.setItem("trustvault_session", JSON.stringify(data));
          setSession(data);
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">T</div>

          <div>
            <h2>
              TrustVault<span>.</span>
            </h2>
            <p>SECURE WORKSPACE</p>
          </div>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`nav-item ${
                active === item.label ? "active" : ""
              }`}
              onClick={() => setActive(item.label)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="security-mini">
            <div className="security-mini-icon">✳</div>
            <strong>Your vault is protected</strong>
            <p>Manage document permissions in Access Control.</p>
            <span>
              <i /> SECURITY FIRST
            </span>
          </div>

          <button className="nav-item logout-button" onClick={handleLogout}>
            <span className="nav-icon">↪</span>
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> {active}
          </div>

          <div className="topbar-right">
            <div className="system-status">
              <i /> SYSTEM STATUS
            </div>
            <div className="top-avatar">
              {String(session.user?.name || "JJ")
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
          </div>
        </header>

        <section className="page-content">
          {active === "Access Control" ? (
            <AccessControl />
          ) : active === "My Vault" ? (
            <MyVault onDocumentsChanged={handleDocumentsChanged} />
          ) : active === "Shared with me" ? (
            <SharedWithMe />
          ) : active === "Audit Trail" ? (
            <AuditTrail />
          ) : active === "Threat Center" ? (
            <ThreatCenter />
          ) : (
            <>
              <div className="section-heading">
                <div>
                  <h2>Your vault at a glance</h2>
                  <p>A live snapshot of your document workspace.</p>
                </div>

          <div className="heading-actions">
  <select
    className="heading-category"
    value={category}
    onChange={(event) => setCategory(event.target.value)}
    aria-label="Filter documents by category"
  >
    <option value="All files">All Categories</option>
    {categoryOptions.map((option) => (
      <option key={option} value={option}>
        {option}
      </option>
    ))}
  </select>

  <button
    className="upload-btn"
    onClick={() => setActive("My Vault")}
  >
    + Upload Document
  </button>

  <button
    className="text-button"
    onClick={() => setActive("Audit Trail")}
  >
    View activity <span>↗</span>
  </button>
</div>
              </div>

              {dashboardError && (
                <div className="empty-state" role="alert">
                  {dashboardError}
                  <button
                    className="text-button"
                    onClick={() => window.location.reload()}
                  >
                    Retry
                  </button>
                </div>
              )}

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-top">
                    <span>Total documents</span>
                    <div className="stat-icon violet">▤</div>
                  </div>

                  <div className="stat-value">
                  {dashboardLoading
  ? "…"
  : dashboardError
    ? "—"
    : dashboardStats.totalDocuments}
                    <span className="stat-caption"> files</span>
                  </div>

                  <div className="stat-foot">
                    <span className="stat-neutral">◈</span>
                    Documents you can access
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <span>Shared with others</span>
                    <div className="stat-icon cyan">⇄</div>
                  </div>

                  <div className="stat-value">
                    {dashboardLoading ? "…" : dashboardStats.sharedWithOthers}
                    <span className="stat-caption"> active shares</span>
                  </div>

                  <div className="stat-foot">
                    Active document permission entries
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <span>Pending reviews</span>
                    <div className="stat-icon amber">◷</div>
                  </div>

                  <div className="stat-value">
                    {dashboardLoading ? "…" : dashboardStats.pendingReviews}
                    <span className="stat-caption"> pending</span>
                  </div>

                  <div className="stat-foot">
                    Documents awaiting review
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <span>Security events</span>
                    <div className="stat-icon green">⛨</div>
                  </div>

                  <div className="stat-value">
                    {dashboardLoading ? "…" : dashboardStats.securityEvents}
                    <span className="stat-caption"> logged events</span>
                  </div>

                  <div className="stat-foot">
                    Total recorded audit events
                  </div>
                </div>
              </div>

              <div className="content-grid">
                <section className="documents-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Recent documents</h2>
                      <p>Latest documents stored in your vault.</p>
                    </div>

                    <button
                      className="text-button"
                      onClick={() => setActive("My Vault")}
                    >
                      View all <span>↗</span>
                    </button>
                  </div>

                  <div className="document-toolbar">
                    <label className="search-box">
                      <span>⌕</span>
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search documents..."
                      />
                    </label>

                   
                  </div>

                  <div className="document-list">
                    <div className="document-list-header">
                      <span>DOCUMENT</span>
                      <span>OWNER</span>
                      <span>ACCESS</span>
                      <span>UPDATED</span>
                    </div>

                    {dashboardLoading ? (
                      <div className="empty-state">
                        Loading documents…
                      </div>
                    ) : recentDocuments.length > 0 ? (
                      recentDocuments.map((doc) => {
                        const type = getFileType(doc);
                        const name = doc.name || "Untitled document";
                        const owner = getDocumentOwner(doc);
                        const access = getDocumentAccess(doc);

                        return (
                          <div
                            className="document-row"
                            key={doc.id ?? name}
                          >
                            <div className="document-name">
                              <div
                                className={`file-icon ${getFileColor(type)}`}
                              >
                                {type}
                              </div>

                              <div>
                                <strong>{name}</strong>
                                <span>{doc.category || "Other"}</span>
                              </div>
                            </div>

                            <div className="owner-cell">
                              <div className="small-avatar">
                                {String(owner || "?").charAt(0).toUpperCase()}
                              </div>
                              {owner || "Unknown"}
                            </div>

                            <div>
                              <span
                                className={`access-pill ${
                                  access.toLowerCase().includes("owner")
                                    ? "owner"
                                    : access.toLowerCase().includes("edit")
                                      ? "edit"
                                      : "read"
                                }`}
                              >
                                {access || "Read"}
                              </span>
                            </div>

                            <div className="date-cell">
                              {formatDate(doc.created_at)}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="empty-state">
                        {dashboardError
                          ? "Documents could not be loaded."
                          : "No matching documents found."}
                      </div>
                    )}
                  </div>

                  <div className="panel-footer">
                    <span>
                      Showing{" "}
                      {dashboardLoading ? "…" : recentDocuments.length} of{" "}
                      {dashboardLoading ? "…" : dashboardStats.totalDocuments}{" "}
                      documents
                    </span>
                    <span>Connected to document API</span>
                  </div>
                </section>

                <aside className="activity-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Trust activity</h2>
                      <p>Latest recorded audit events.</p>
                    </div>

                    <span className="live-label">
                      <i /> AUDIT
                    </span>
                  </div>

                  <div className="activity-list">
                    {dashboardLoading ? (
                      <div className="empty-state">
                        Loading activity…
                      </div>
                    ) : recentActivity.length > 0 ? (
                      recentActivity.map((log, index) => (
                        <div
                          className="activity-item"
                          key={log.id ?? `${log.action}-${index}`}
                        >
                          <div
                            className={`activity-icon ${getActivityStyle(
                              log.action
                            )}`}
                          >
                            {String(log.action || "").toUpperCase().includes("DELETE")
                              ? "!"
                              : String(log.action || "").toUpperCase().includes("DOWNLOAD")
                                ? "↓"
                                : String(log.action || "").toUpperCase().includes("UPLOAD")
                                  ? "↑"
                                  : "↻"}
                          </div>

                          <div>
                            <strong>{getActionLabel(log.action)}</strong>
                            <p>
                              {log.document_name ||
                                log.details?.message ||
                                "Document activity"}
                            </p>
                            <span>{formatDateTime(log.created_at)}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">
                        No audit events recorded yet.
                      </div>
                    )}
                  </div>

                  <button
                    className="audit-button"
                    onClick={() => setActive("Audit Trail")}
                  >
                    Explore audit trail <span>→</span>
                  </button>
                </aside>
              </div>

              <footer className="page-footer">
                <span>
                  ◈ TRUSTVAULT{" "}
                  <span className="footer-muted">
                    / SECURE BY DESIGN
                  </span>
                </span>
                <span>Live document and audit data</span>
              </footer>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
