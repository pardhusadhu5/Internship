import { useEffect, useState } from 'react';
import { Users, ClipboardList, Wallet, Receipt, Scale, IndianRupee } from 'lucide-react';
import { api, formatCurrency } from '../../api/client';
import KPICard from '../../components/KPICard';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.admin.dashboard().then(setStats).catch(() => {});
  }, []);

  if (!stats) return <div>Loading...</div>;

  const cards = [
    { icon: Users, label: 'Total Reporters', value: stats.totalReporters, color: '#3498DB' },
    { icon: ClipboardList, label: 'Active Assignments', value: stats.activeAssignments, color: '#F39C12' },
    { icon: Wallet, label: 'Advances Issued', value: formatCurrency(stats.advancesIssued), color: '#27AE60' },
    { icon: Receipt, label: 'Pending Expenses', value: stats.pendingExpenses, color: '#E74C3C' },
    { icon: Scale, label: 'Settlements Pending', value: stats.settlementsPending, color: '#9B59B6' },
    { icon: IndianRupee, label: 'Total Expenses', value: formatCurrency(stats.totalExpenseAmount), color: '#C0392B' },
  ];

  return (
    <div>
      <div className="kpi-grid">
        {cards.map(c => <KPICard key={c.label} {...c} />)}
      </div>
      <div className="card">
        <div className="card-header"><h3>Quick Overview</h3></div>
        <div className="card-body">
          <p style={{ color: 'var(--text-muted)' }}>
            Welcome to the Namaste Telangana Admin Dashboard. Manage field assignments, approve advances and expenses,
            track settlements, and view analytics from the sidebar navigation.
          </p>
        </div>
      </div>
    </div>
  );
}
