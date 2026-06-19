import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { api, formatCurrency, exportCSV } from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';

export default function AdminSettlements() {
  const [data, setData] = useState({ data: [], total: 0, page: 1, limit: 10 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const load = (page = 1) => api.admin.settlements({ search, status, page, limit: 10 }).then(setData);
  useEffect(() => { load(); }, []);
  useEffect(() => { load(1); }, [search, status]);

  const handleUpdate = async (id, settlement_status) => {
    await api.admin.updateSettlement(id, settlement_status);
    load(data.page);
  };

  const handleExport = async () => {
    const rows = await api.admin.exportSettlements();
    exportCSV(rows, 'settlements-report.csv');
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3>Settlement Management</h3>
        <button className="btn btn-secondary btn-sm" onClick={handleExport}><Download size={16} /> Export CSV</button>
      </div>
      <div className="card-body">
        <div className="table-toolbar">
          <input className="search-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="filter-select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Status</option>
            {['Pending', 'Verified', 'Settled'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Reporter</th><th>Assignment</th><th>Advance</th><th>Expenses</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {data.data.map(row => (
                <tr key={row.id}>
                  <td>#{row.id}</td>
                  <td>{row.reporter_name}</td>
                  <td>{row.assignment_title}</td>
                  <td>{formatCurrency(row.advance_amount)}</td>
                  <td>{formatCurrency(row.expense_amount)}</td>
                  <td>
                    <strong style={{ color: row.balance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {row.balance >= 0 ? `Return ${formatCurrency(row.balance)}` : `Pay ${formatCurrency(Math.abs(row.balance))}`}
                    </strong>
                  </td>
                  <td><StatusBadge status={row.settlement_status} /></td>
                  <td>
                    <div className="btn-group">
                      {row.settlement_status === 'Pending' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleUpdate(row.id, 'Verified')}>Verify</button>
                      )}
                      {row.settlement_status !== 'Settled' && (
                        <button className="btn btn-success btn-sm" onClick={() => handleUpdate(row.id, 'Settled')}>Settle</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={data.page} total={data.total} limit={data.limit} onPageChange={load} />
      </div>
    </div>
  );
}
