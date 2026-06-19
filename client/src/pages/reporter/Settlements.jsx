import { useEffect, useState } from 'react';
import { api, formatCurrency } from '../../api/client';
import StatusBadge from '../../components/StatusBadge';

export default function ReporterSettlements() {
  const [data, setData] = useState([]);

  useEffect(() => {
    api.reporter.settlements().then(setData).catch(() => {});
  }, []);

  return (
    <div className="card">
      <div className="card-header"><h3>Settlement Tracking</h3></div>
      <div className="card-body">
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Settlement = Advance Given − Actual Expenses. Positive balance means you return excess; negative means company pays you.
        </p>
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Assignment</th><th>Advance</th><th>Expenses</th><th>Balance</th><th>Status</th></tr></thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={5} className="empty-state">No settlements yet</td></tr>
              ) : data.map(row => (
                <tr key={row.id}>
                  <td><strong>{row.assignment_title}</strong></td>
                  <td>{formatCurrency(row.advance_amount)}</td>
                  <td>{formatCurrency(row.expense_amount)}</td>
                  <td>
                    <strong style={{ color: row.balance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {row.balance >= 0 ? `Return ${formatCurrency(row.balance)}` : `Receive ${formatCurrency(Math.abs(row.balance))}`}
                    </strong>
                  </td>
                  <td><StatusBadge status={row.settlement_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
