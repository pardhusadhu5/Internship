import { useEffect, useState } from 'react';
import { ClipboardList, Wallet, Receipt, Scale, FileText, CheckCircle } from 'lucide-react';
import { api, formatCurrency } from '../../api/client';
import KPICard from '../../components/KPICard';

export default function ReporterDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.reporter.dashboard().then(setStats).catch(() => {});
  }, []);

  if (!stats) return <div>Loading...</div>;

  const cards = [
    { icon: ClipboardList, label: 'Assigned Tasks', value: stats.assignedTasks, color: '#3498DB' },
    { icon: FileText, label: 'Pending Assignments', value: stats.pendingAssignments, color: '#F39C12' },
    { icon: Wallet, label: 'Advance Received', value: formatCurrency(stats.advanceReceived), color: '#27AE60' },
    { icon: Receipt, label: 'Submitted Expenses', value: stats.submittedExpenses, color: '#9B59B6' },
    { icon: CheckCircle, label: 'Pending Submissions', value: stats.pendingExpenseSubmission, color: '#E74C3C' },
    { icon: Scale, label: 'Settlement Pending', value: stats.settlementPending, color: '#C0392B' },
  ];

  return (
    <div>
      <div className="kpi-grid">
        {cards.map(c => <KPICard key={c.label} {...c} />)}
      </div>
      <div className="card">
        <div className="card-header"><h3>Your Workflow</h3></div>
        <div className="card-body">
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.8 }}>
            1. View and accept your field assignments<br />
            2. Request advance before travel<br />
            3. Submit expenses with receipts after assignment<br />
            4. Track settlement status (Advance − Expenses = Balance)
          </p>
        </div>
      </div>
    </div>
  );
}
