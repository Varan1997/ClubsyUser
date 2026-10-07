export default function StatCards({ summary }) {
  const s = summary || { total: 0, active: 0, expiring: 0, expired: 0 };
  return (
    <div className="stats">
      <div className="stat">
        <div className="num">{s.total}</div>
        <div className="label">Total Members</div>
      </div>
      <div className="stat active">
        <div className="num">{s.active}</div>
        <div className="label">Active</div>
      </div>
      <div className="stat expiring">
        <div className="num">{s.expiring}</div>
        <div className="label">Expiring Soon</div>
      </div>
      <div className="stat expired">
        <div className="num">{s.expired}</div>
        <div className="label">Expired</div>
      </div>
    </div>
  );
}
