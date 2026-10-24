
import { useEffect, useState } from "react";
import "./App.css";

const API_BASE = "https://trustvault-backend-z1yy.onrender.com/api";

function getAuthHeaders() {
  const savedSession = localStorage.getItem("trustvault_session");
  const session = savedSession ? JSON.parse(savedSession) : null;

  if (!session?.token) {
    throw new Error("Please log in again.");
  }

  return {
    Authorization: `Bearer ${session.token}`,
  };
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || `Request failed. Status: ${response.status}`
    );
  }

  return data;
}

export default function AccessControl() {
  const [documents, setDocuments] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [person, setPerson] = useState("");
  const [email, setEmail] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [permission, setPermission] = useState("Read");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

 
async function loadData() {
  try {
    setLoading(true);
    setError("");

    const headers = getAuthHeaders();

    const docsResponse = await fetch(`${API_BASE}/documents`, {
      headers,
      cache: "no-store",
    });

    const docsData = await readResponse(docsResponse);
    const documentList = Array.isArray(docsData)
      ? docsData
      : docsData.documents;

    if (!Array.isArray(documentList)) {
      throw new Error("Invalid documents data received from server.");
    }

    // Only owners can manage permissions for a document.
    const ownedDocuments = documentList.filter(
      (doc) =>
        doc.access_level === "owner" ||
        doc.accessLevel === "owner"
    );

    const permissionResults = await Promise.all(
      ownedDocuments.map(async (doc) => {
        const response = await fetch(
          `${API_BASE}/documents/${doc.id}/permissions`,
          { headers, cache: "no-store" }
        );

        const data = await readResponse(response);
        const entries = Array.isArray(data)
          ? data
          : data.permissions;

        if (!Array.isArray(entries)) {
          throw new Error("Invalid permission data received from server.");
        }

        return entries.map((item) => ({
          ...item,
          document_id: doc.id,
          document_name: doc.name,
        }));
      })
    );

    const permissionList = permissionResults.flat();

    setDocuments(ownedDocuments);
    setPermissions(permissionList);

    setDocumentId((current) => {
      if (
        ownedDocuments.some(
          (doc) => String(doc.id) === String(current)
        )
      ) {
        return current;
      }

      return ownedDocuments.length
        ? String(ownedDocuments[0].id)
        : "";
    });
  } catch (err) {
    setError(err.message || "Could not connect to the server.");
  } finally {
    setLoading(false);
  }
}


  useEffect(() => {
    loadData();
  }, []);

  async function grantAccess(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!person.trim() || !email.trim() || !documentId) {
      setError("Enter the person's name and email, and select a document.");
      return;
    }

    try {
      setSaving(true);

      
const response = await fetch(
  `${API_BASE}/documents/${documentId}/permissions`,
  {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email.trim(),
      permission,
    }),
  }
);

await readResponse(response);


      setPerson("");
      setEmail("");
      setPermission("Read");
      setMessage("Permission saved successfully.");

      await loadData();
    } catch (err) {
      setError(err.message || "Could not grant access.");
    } finally {
      setSaving(false);
    }
  }


async function revokeAccess(id) {
  setMessage("");
  setError("");

  const item = permissions.find(
    (permissionItem) => String(permissionItem.id) === String(id)
  );

  if (!item?.document_id || !item?.email) {
    setError("Could not identify the document and recipient.");
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE}/documents/${item.document_id}/permissions/${encodeURIComponent(item.email)}`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      }
    );

    await readResponse(response);

    setMessage("Permission revoked successfully.");
    await loadData();
  } catch (err) {
    setError(err.message || "Could not revoke access.");
  }
}


  const activeCount = permissions.filter(
    (item) => item.status === "Active"
  ).length;

  const revokedCount = permissions.filter(
    (item) => item.status === "Revoked"
  ).length;

  return (
    <div className="ac-page">
      <div className="ac-heading">
        <div>
          <div className="ac-eyebrow">TRUSTVAULT / SECURITY</div>
          <h2>Access Control</h2>
          <p>Manage document permission records.</p>
        </div>
        <div className="ac-shield">⛨</div>
      </div>

      <div className="ac-notice">
        <span>✳</span>
        <div>
          <strong>Least privilege, by design</strong>
          <p>
            Grant only the permission required. Permission records are
            saved in the database.
          </p>
        </div>
      </div>

      {error && (
        <div className="ac-message" role="alert">
          {error}
        </div>
      )}

      {message && (
        <p className="ac-message" role="status">
          {message}
        </p>
      )}

      <div className="ac-metrics">
        <div>
          <span>Permission entries</span>
          <strong>{loading ? "…" : permissions.length}</strong>
        </div>
        <div>
          <span>Active entries</span>
          <strong>{loading ? "…" : activeCount}</strong>
        </div>
        <div>
          <span>Revoked entries</span>
          <strong>{loading ? "…" : revokedCount}</strong>
        </div>
      </div>

      <section className="ac-card">
        <div className="ac-card-title">
          <div>
            <h3>Grant document access</h3>
            <p>Create a permission record for a user.</p>
          </div>
          <span className="ac-lock">♧</span>
        </div>

        <form className="ac-form" onSubmit={grantAccess}>
          <label>
            Person's name
            <input
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              placeholder="Enter full name"
              required
            />
          </label>

          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </label>

          <label>
            Document
            <select
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              required
              disabled={!documents.length}
            >
              {documents.length === 0 ? (
                <option value="">No documents available</option>
              ) : (
                documents.map((doc) => (
                  <option key={doc.id} value={String(doc.id)}>
                    {doc.name || doc.original_filename || `Document ${doc.id}`}
                  </option>
                ))
              )}
            </select>
          </label>

          <label>
            Permission level
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
            >
              <option value="Read">Read only</option>
              <option value="Edit">Read and edit</option>
            </select>
          </label>

          <button
            className="ac-grant"
            type="submit"
            disabled={saving || loading || !documents.length}
          >
            {saving ? "Saving..." : "＋ Grant access"}
          </button>
        </form>
      </section>

      <section className="ac-card ac-table-card">
        <div className="ac-card-title">
          <div>
            <h3>Permission directory</h3>
            <p>Database permission records.</p>
          </div>

          <span className="ac-count">{permissions.length} entries</span>
        </div>

        <div className="ac-table-wrap">
          <table className="ac-table">
            <thead>
              <tr>
                <th>USER</th>
                <th>DOCUMENT</th>
                <th>ACCESS</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5">Loading permissions...</td>
                </tr>
              ) : permissions.length === 0 ? (
                <tr>
                  <td colSpan="5">No permission records yet.</td>
                </tr>
              ) : (
                permissions.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="ac-user">
                        <div className="ac-avatar">
                          {(item.name || item.email || "?")
                            .split(" ")
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>

                        <div>
                          <strong>{item.name || "Unknown user"}</strong>
                          <span>{item.email || "No email"}</span>
                        </div>
                      </div>
                    </td>

                    <td>{item.document_name || "Unknown document"}</td>

                    <td>
                      <span
                        className={`ac-permission ${(item.permission || "Read").toLowerCase()}`}
                      >
                        {item.permission || "Read"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`ac-status ${(item.status || "Active").toLowerCase()}`}
                      >
                        {item.status || "Active"}
                      </span>
                    </td>

                    <td>
                      {item.status === "Active" ? (
                        <button
                          className="ac-revoke"
                          type="button"
                          onClick={() => revokeAccess(item.id)}
                        >
                          Revoke
                        </button>
                      ) : (
                        <span className="ac-disabled">Revoked</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
