
import { useState } from "react";
import "./App.css";
import AccessControl from "./AccessControl";
import MyVault from "./MyVault";
import SharedWithMe from "./SharedWithMe";
import AuditTrail from "./AuditTrail";
import ThreatCenter from "./ThreatCenter";

const documents = [
  {
    name: "Project Proposal.pdf",
    category: "Business",
    owner: "Jyothi",
    date: "18 Oct 2026",
    access: "Owner",
    type: "PDF",
    color: "purple",
  },
  {
    name: "Employee Records.xlsx",
    category: "HR",
    owner: "Admin",
    date: "17 Oct 2026",
    access: "Read only",
    type: "XLS",
    color: "green",
  },
  {
    name: "Security Policy.docx",
    category: "Security",
    owner: "Jyothi",
    date: "16 Oct 2026",
    access: "Edit access",
    type: "DOC",
    color: "blue",
  },
  {
    name: "Financial Report.pdf",
    category: "Finance",
    owner: "Admin",
    date: "15 Oct 2026",
    access: "Read only",
    type: "PDF",
    color: "pink",
  },
];

const navItems = [
  { icon: "◈", label: "Overview" },
  { icon: "▤", label: "My Vault" },
  { icon: "⇄", label: "Shared with me" },
  { icon: "♧", label: "Access Control" },
  { icon: "◷", label: "Audit Trail" },
  { icon: "⛨", label: "Threat Center" },
];

function App() {
  const [active, setActive] = useState("Overview");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All files");

  const visibleDocuments = documents.filter((doc) => {
    const matchesSearch = `${doc.name} ${doc.owner} ${doc.category}`
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory =
      category === "All files" || doc.category === category;

    return matchesSearch && matchesCategory;
  });

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
            <p>Access policies are enforced by the server.</p>
            <span>
              <i /> SECURITY FIRST
            </span>
          </div>
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
            <div className="top-avatar">JJ</div>
          </div>
        </header>

<section className="page-content">
  {active === "Access Control" ? (
    <AccessControl />
  ) : active === "My Vault" ? (
    <MyVault />
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
                  <h2>
                    {active === "Overview"
                      ? "Your vault at a glance"
                      : active}
                  </h2>
                  <p>
                    {active === "Overview"
                      ? "A quick snapshot of your workspace."
                      : "Explore your secure document workspace."}
                  </p>
                </div>

                <button
                  className="text-button"
                  onClick={() => setActive("Audit Trail")}
                >
                  View activity <span>↗</span>
                </button>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-top">
                    <span>Total documents</span>
                    <div className="stat-icon violet">▤</div>
                  </div>
                  <div className="stat-value">
                    24 <span className="stat-caption">files</span>
                  </div>
                  <div className="stat-foot">
                    <span className="stat-neutral">◈</span>
                    Across your workspace
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <span>Shared with others</span>
                    <div className="stat-icon cyan">⇄</div>
                  </div>
                  <div className="stat-value">
                    08 <span className="stat-caption">documents</span>
                  </div>
                  <div className="stat-foot">
                    <span className="stat-neutral">◉</span>
                    Review access regularly
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <span>Pending reviews</span>
                    <div className="stat-icon amber">◷</div>
                  </div>
                  <div className="stat-value">
                    03 <span className="stat-caption">items</span>
                  </div>
                  <div className="stat-foot">
                    <span className="stat-neutral">↗</span>
                    Check document access
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <span>Security events</span>
                    <div className="stat-icon green">⛨</div>
                  </div>
                  <div className="stat-value">
                    12 <span className="stat-caption">recent</span>
                  </div>
                  <div className="stat-foot">
                    <span className="event-indicator" />
                    Audit activity preview
                  </div>
                </div>
              </div>

              <div className="content-grid">
                <section className="documents-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Recent documents</h2>
                      <p>Manage your files and their access.</p>
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
                        onChange={(event) =>
                          setSearch(event.target.value)
                        }
                        placeholder="Search documents..."
                      />
                    </label>

                    <select
                      value={category}
                      onChange={(event) =>
                        setCategory(event.target.value)
                      }
                      aria-label="Filter category"
                    >
                      <option>All files</option>
                      <option>Business</option>
                      <option>HR</option>
                      <option>Security</option>
                      <option>Finance</option>
                    </select>
                  </div>

                  <div className="document-list">
                    <div className="document-list-header">
                      <span>DOCUMENT</span>
                      <span>OWNER</span>
                      <span>ACCESS</span>
                      <span>UPDATED</span>
                    </div>

                    {visibleDocuments.map((doc) => (
                      <div className="document-row" key={doc.name}>
                        <div className="document-name">
                          <div className={`file-icon ${doc.color}`}>
                            {doc.type}
                          </div>

                          <div>
                            <strong>{doc.name}</strong>
                            <span>{doc.category}</span>
                          </div>
                        </div>

                        <div className="owner-cell">
                          <div className="small-avatar">
                            {doc.owner[0]}
                          </div>
                          {doc.owner}
                        </div>

                        <div>
                          <span
                            className={`access-pill ${
                              doc.access === "Owner"
                                ? "owner"
                                : doc.access === "Edit access"
                                  ? "edit"
                                  : "read"
                            }`}
                          >
                            {doc.access}
                          </span>
                        </div>

                        <div className="date-cell">{doc.date}</div>
                      </div>
                    ))}

                    {visibleDocuments.length === 0 && (
                      <div className="empty-state">
                        No matching documents found. Try another search.
                      </div>
                    )}
                  </div>

                  <div className="panel-footer">
                    <span>
                      Showing {visibleDocuments.length} preview documents
                    </span>
                    <span>
                      Design preview · Not connected to storage
                    </span>
                  </div>
                </section>

                <aside className="activity-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Trust activity</h2>
                      <p>Illustrative security timeline.</p>
                    </div>

                    <span className="live-label">
                      <i /> DEMO
                    </span>
                  </div>

                  <div className="activity-list">
                    <div className="activity-item">
                      <div className="activity-icon success">✓</div>
                      <div>
                        <strong>Document access granted</strong>
                        <p>Project Proposal.pdf</p>
                        <span>Today · 10:42 AM</span>
                      </div>
                    </div>

                    <div className="activity-item">
                      <div className="activity-icon denied">!</div>
                      <div>
                        <strong>Access denied</strong>
                        <p>Unauthorized download blocked</p>
                        <span>Today · 10:18 AM</span>
                      </div>
                    </div>

                    <div className="activity-item">
                      <div className="activity-icon changed">↻</div>
                      <div>
                        <strong>Permission updated</strong>
                        <p>Employee Records.xlsx</p>
                        <span>Today · 09:54 AM</span>
                      </div>
                    </div>

                    <div className="activity-item">
                      <div className="activity-icon uploaded">↑</div>
                      <div>
                        <strong>New document uploaded</strong>
                        <p>Security Policy.docx</p>
                        <span>Yesterday · 04:21 PM</span>
                      </div>
                    </div>
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
                <span>UI prototype · Demo data only</span>
              </footer>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
