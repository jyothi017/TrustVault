
import { useState } from "react";
import "./App.css";

const sharedDocuments = [
  {
    id: 1,
    name: "Project Requirements.pdf",
    owner: "Priya Sharma",
    email: "priya@example.com",
    permission: "View",
    date: "18 Oct 2026",
    status: "Active",
  },
  {
    id: 2,
    name: "Team Report.docx",
    owner: "Rahul Verma",
    email: "rahul@example.com",
    permission: "Edit",
    date: "17 Oct 2026",
    status: "Active",
  },
  {
    id: 3,
    name: "Security Guidelines.pdf",
    owner: "Ananya Rao",
    email: "ananya@example.com",
    permission: "View",
    date: "15 Oct 2026",
    status: "Expired",
  },
];

export default function SharedWithMe() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [message, setMessage] = useState("");

  const documents = sharedDocuments.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(search.toLowerCase()) ||
      doc.owner.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "All" || doc.status === filter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="vault-page">
      <div className="vault-heading">
        <div>
          <span className="vault-eyebrow">
            DOCUMENT ACCESS / COLLABORATION
          </span>
          <h1>Shared with me</h1>
          <p>Documents that other people have shared with you.</p>
        </div>
      </div>

      <div className="vault-stats">
        <div>
          <span>Total shared documents</span>
          <strong>{sharedDocuments.length}</strong>
        </div>
        <div>
          <span>Active access</span>
          <strong>
            {sharedDocuments.filter((doc) => doc.status === "Active").length}
          </strong>
        </div>
        <div>
          <span>View access</span>
          <strong>
            {sharedDocuments.filter((doc) => doc.permission === "View").length}
          </strong>
        </div>
      </div>

      <section className="vault-panel">
        <div className="vault-panel-heading">
          <div>
            <h2>Shared documents</h2>
            <p>Review the documents and permissions assigned to you.</p>
          </div>
          <span className="vault-count">{documents.length} files</span>
        </div>

        <div className="vault-toolbar">
          <label className="vault-search">
            <span>⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search document or owner..."
            />
          </label>

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter by access status"
          >
            <option value="All">All statuses</option>
            <option value="Active">Active</option>
            <option value="Expired">Expired</option>
          </select>
        </div>

        {message && (
          <p className="vault-message" role="status">{message}</p>
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
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div className="vault-file">
                      <span className="vault-file-icon pdf">
                        {doc.name.split(".").pop().toUpperCase()}
                      </span>
                      <strong>{doc.name}</strong>
                    </div>
                  </td>
                  <td>
                    <strong>{doc.owner}</strong>
                    <br />
                    <span>{doc.email}</span>
                  </td>
                  <td>
                    <span className="vault-category">{doc.permission}</span>
                  </td>
                  <td>{doc.date}</td>
                  <td>
                    <span className="vault-category">{doc.status}</span>
                  </td>
                  <td>
                    <button
                      className="vault-delete"
                      type="button"
                      disabled={doc.status !== "Active"}
                      onClick={() =>
                        setMessage(
                          `${doc.name}: preview only. Secure document access is not connected yet.`
                        )
                      }
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {documents.length === 0 && (
            <div className="vault-empty">No shared documents found.</div>
          )}
        </div>

        <div className="vault-footer">
          <span>Shared documents preview</span>
          <span>Server permissions not connected</span>
        </div>
      </section>
    </div>
  );
}
