
import { useState } from "react";
import "./App.css";

const initialAlerts = [
  { id: 1, title: "Repeated access failures", detail: "Multiple failed access attempts detected in this demo.", severity: "High", time: "18 Oct 2026, 10:18 AM", status: "Open" },
  { id: 2, title: "Sensitive document shared", detail: "Review the sharing permissions for Financial Report.pdf.", severity: "Medium", time: "18 Oct 2026, 09:42 AM", status: "Open" },
  { id: 3, title: "Permission change", detail: "A document permission was changed.", severity: "Low", time: "17 Oct 2026, 04:21 PM", status: "Resolved" },
];

export default function ThreatCenter() {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [filter, setFilter] = useState("All");

  const visibleAlerts = alerts.filter(
    (alert) => filter === "All" || alert.status === filter
  );

  function resolveAlert(id) {
    setAlerts((previous) =>
      previous.map((alert) =>
        alert.id === id ? { ...alert, status: "Resolved" } : alert
      )
    );
  }

  return (
    <div className="vault-page">
      <div className="vault-heading">
        <div>
          <span className="vault-eyebrow">SECURITY / RISK MONITORING</span>
          <h1>Threat Center</h1>
          <p>Review alerts and track their resolution status.</p>
        </div>
      </div>

      <div className="vault-stats">
        <div><span>Total alerts</span><strong>{alerts.length}</strong></div>
        <div><span>Open alerts</span><strong>{alerts.filter((a) => a.status === "Open").length}</strong></div>
        <div><span>Resolved alerts</span><strong>{alerts.filter((a) => a.status === "Resolved").length}</strong></div>
      </div>

      <section className="vault-panel">
        <div className="vault-panel-heading">
          <div>
            <h2>Security alerts</h2>
            <p>Investigate the sample alerts listed below.</p>
          </div>

          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="All">All alerts</option>
            <option value="Open">Open</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>

        <div className="threat-alert-list">
          {visibleAlerts.map((alert) => (
            <article className="threat-alert" key={alert.id}>
              <div className="threat-alert-top">
                <span className="vault-category">{alert.severity} severity</span>
                <span className="vault-category">{alert.status}</span>
              </div>

              <h3>{alert.title}</h3>
              <p>{alert.detail}</p>
              <span className="threat-alert-time">{alert.time}</span>

              {alert.status === "Open" && (
                <button
                  className="vault-delete"
                  type="button"
                  onClick={() => resolveAlert(alert.id)}
                >
                  Mark as resolved
                </button>
              )}
            </article>
          ))}

          {visibleAlerts.length === 0 && (
            <div className="vault-empty">No alerts in this filter.</div>
          )}
        </div>

        <div className="vault-footer">
          <span>Demo security alerts</span>
          <span>Live threat detection not connected</span>
        </div>
      </section>
    </div>
  );
}
