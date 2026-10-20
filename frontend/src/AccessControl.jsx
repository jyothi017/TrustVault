
import { useState } from "react";
import "./App.css";

const initialPermissions = [
  { id: 1, name: "Priya Sharma", email: "priya@example.com", document: "Project Proposal.pdf", role: "Viewer", permission: "Read", status: "Active" },
  { id: 2, name: "Rahul Verma", email: "rahul@example.com", document: "Security Policy.docx", role: "Editor", permission: "Edit", status: "Active" },
  { id: 3, name: "Ananya Rao", email: "ananya@example.com", document: "Financial Report.pdf", role: "Viewer", permission: "Read", status: "Revoked" },
];

export default function AccessControl() {
  const [permissions, setPermissions] = useState(initialPermissions);
  const [person, setPerson] = useState("");
  const [email, setEmail] = useState("");
  const [documentName, setDocumentName] = useState("Project Proposal.pdf");
  const [permission, setPermission] = useState("Read");
  const [message, setMessage] = useState("");

  function grantAccess(event) {
    event.preventDefault();
    setMessage("");

    if (!person.trim() || !email.trim()) {
      setMessage("Please enter the person's name and email.");
      return;
    }

    const newPermission = {
      id: Date.now(),
      name: person.trim(),
      email: email.trim(),
      document: documentName,
      role: permission === "Edit" ? "Editor" : "Viewer",
      permission,
      status: "Active",
    };

    setPermissions((previous) => [newPermission, ...previous]);
    setPerson("");
    setEmail("");
    setMessage("Preview access entry added. Server-side permissions are not connected yet.");
  }

  function revokeAccess(id) {
    setPermissions((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, status: "Revoked" } : item
      )
    );
    setMessage("Preview status updated. Real access revocation requires the backend.");
  }

  return (
    <div className="ac-page">
      <div className="ac-heading">
        <div>
          <div className="ac-eyebrow">TRUSTVAULT / SECURITY</div>
          <h2>Access Control</h2>
          <p>Manage who can access your documents and what they can do.</p>
        </div>
        <div className="ac-shield">⛨</div>
      </div>

      <div className="ac-notice">
        <span>✳</span>
        <div>
          <strong>Least privilege, by design</strong>
          <p>Give each person only the access they need. Revoked entries below are preview states until connected to the secure server.</p>
        </div>
      </div>

      <div className="ac-metrics">
        <div><span>Permission entries</span><strong>{permissions.length}</strong></div>
        <div><span>Active entries</span><strong>{permissions.filter((p) => p.status === "Active").length}</strong></div>
        <div><span>Revoked entries</span><strong>{permissions.filter((p) => p.status === "Revoked").length}</strong></div>
      </div>

      <section className="ac-card">
        <div className="ac-card-title">
          <div><h3>Grant document access</h3><p>Create a permission entry for a user.</p></div>
          <span className="ac-lock">♧</span>
        </div>

        <form className="ac-form" onSubmit={grantAccess}>
          <label>
            Person's name
            <input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Enter full name" required />
          </label>
          <label>
            Email address
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required />
          </label>
          <label>
            Document
            <select value={documentName} onChange={(e) => setDocumentName(e.target.value)}>
              <option>Project Proposal.pdf</option>
              <option>Employee Records.xlsx</option>
              <option>Security Policy.docx</option>
              <option>Financial Report.pdf</option>
            </select>
          </label>
          <label>
            Permission level
            <select value={permission} onChange={(e) => setPermission(e.target.value)}>
              <option value="Read">Read only</option>
              <option value="Edit">Read and edit</option>
            </select>
          </label>
          <button className="ac-grant" type="submit">＋ Grant preview access</button>
        </form>
        {message && <p className="ac-message" role="status">{message}</p>}
      </section>

      <section className="ac-card ac-table-card">
        <div className="ac-card-title">
          <div><h3>Permission directory</h3><p>Review and manage document access entries.</p></div>
          <span className="ac-count">{permissions.length} entries</span>
        </div>

        <div className="ac-table-wrap">
          <table className="ac-table">
            <thead>
              <tr><th>USER</th><th>DOCUMENT</th><th>ACCESS</th><th>STATUS</th><th>ACTION</th></tr>
            </thead>
            <tbody>
              {permissions.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="ac-user">
                      <div className="ac-avatar">{item.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div>
                      <div><strong>{item.name}</strong><span>{item.email}</span></div>
                    </div>
                  </td>
                  <td>{item.document}</td>
                  <td><span className={`ac-permission ${item.permission.toLowerCase()}`}>{item.permission}</span></td>
                  <td><span className={`ac-status ${item.status.toLowerCase()}`}>{item.status}</span></td>
                  <td>
                    {item.status === "Active" ? (
                      <button className="ac-revoke" onClick={() => revokeAccess(item.id)} type="button">Revoke</button>
                    ) : <span className="ac-disabled">Revoked</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ac-disclaimer">Demo data only · This page does not yet enforce permissions on actual files.</p>
      </section>
    </div>
  );
}
