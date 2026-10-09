/**
 * Generate a members report HTML page and open it for printing/saving as PDF.
 * Matches the style of the attendance report (HTML + window.print).
 *
 * @param {object} center - full center object { _id, name, type, address, location, pincode, capacity }
 * @param {function} apiFetch - api.get bound function
 */
export async function downloadMembersPdf(center, apiFetch) {
  const res = await apiFetch(`/centers/${center._id}`);
  const members = (res.data.members || [])
    .filter((m) => (m.memberType || "regular") === "regular");

  function fmt(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  }

  const addressParts = [center.address, center.location, center.pincode].filter(Boolean);
  const addressLine  = addressParts.join("  ·  ");

  const rows = members.length > 0
    ? members.map((m, i) => `
        <tr>
          <td>${i + 1}</td>
          <td class="name">${m.name || "—"}</td>
          <td>${m.phone || "—"}</td>
          <td>${m.planDays ? `${m.planDays} days` : "—"}</td>
          <td>${fmt(m.createdAt)}</td>
          <td>${fmt(m.joinDate)}</td>
          <td>${fmt(m.expiryDate)}</td>
        </tr>`).join("")
    : `<tr><td colspan="7" class="empty-row">No members found.</td></tr>`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Members — ${center.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      padding: 32px;
      color: #111;
      background: #fff;
    }

    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-left: 5px solid #c19c27;
      padding-left: 16px;
      margin-bottom: 28px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e5e5e5;
    }
    .header-left h1 {
      font-size: 22px;
      font-weight: 800;
      color: #111;
      margin-bottom: 4px;
    }
    .badge {
      display: inline-block;
      background: #c19c27;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 20px;
      margin-left: 6px;
      vertical-align: middle;
      letter-spacing: 0.04em;
    }
    .header-left .address {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }
    .header-left .generated {
      font-size: 11px;
      color: #999;
      margin-top: 4px;
      font-style: italic;
    }
    .header-right {
      text-align: right;
    }
    .header-right .big-count {
      font-size: 48px;
      font-weight: 900;
      color: #c19c27;
      line-height: 1;
    }
    .header-right .count-label {
      font-size: 11px;
      font-weight: 700;
      color: #888;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .header-right .capacity {
      font-size: 10px;
      color: #aaa;
      margin-top: 3px;
    }

    /* ── Section label ── */
    .section-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #c19c27;
      margin-bottom: 10px;
      padding-bottom: 4px;
      border-bottom: 1.5px solid #c19c27;
      display: inline-block;
    }

    /* ── Table ── */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
    }
    thead th {
      background: #1a1a2e;
      color: #fff;
      padding: 9px 10px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.03em;
    }
    tbody td {
      padding: 8px 10px;
      border-bottom: 1px solid #eeeeee;
      color: #222;
    }
    tbody td.name { font-weight: 600; }
    tbody tr:nth-child(even) td { background: #f9f8f5; }
    tbody tr:last-child td { border-bottom: none; }
    .empty-row {
      text-align: center;
      color: #888;
      padding: 24px;
    }

    /* ── Footer ── */
    .footer {
      margin-top: 24px;
      font-size: 11px;
      color: #aaa;
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #e5e5e5;
      padding-top: 10px;
    }

    @media print {
      body { padding: 16px; }
      .footer { position: fixed; bottom: 0; width: 100%; }
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="header-left">
      <h1>${center.name}${center.type ? `<span class="badge">${center.type}</span>` : ""}</h1>
      ${addressLine ? `<div class="address">📍 ${addressLine}</div>` : ""}
      <div class="generated">Generated on ${new Date().toLocaleString("en-IN")}</div>
    </div>
    <div class="header-right">
      <div class="big-count">${members.length}</div>
      <div class="count-label">Members</div>
      ${center.capacity ? `<div class="capacity">Capacity: ${center.capacity}</div>` : ""}
    </div>
  </div>

  <div class="section-label">Member Details</div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Name</th>
        <th>Phone</th>
        <th>Plan</th>
        <th>Joined</th>
        <th>Start Date</th>
        <th>End Date</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    <span>${center.name}</span>
    <span>Total: ${members.length} member${members.length !== 1 ? "s" : ""}</span>
  </div>

  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
}
