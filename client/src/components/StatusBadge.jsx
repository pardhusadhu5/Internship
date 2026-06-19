const STATUS_MAP = {
  Assigned: 'assigned', Pending: 'pending', 'In Progress': 'in-progress',
  Completed: 'completed', Cancelled: 'cancelled', Approved: 'approved',
  Rejected: 'rejected', Verified: 'verified', Settled: 'settled',
  High: 'high', Medium: 'medium', Low: 'low',
};

export default function StatusBadge({ status }) {
  const cls = STATUS_MAP[status] || 'pending';
  return <span className={`badge badge-${cls}`}>{status}</span>;
}
