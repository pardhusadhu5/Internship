import { useEffect, useState } from 'react';
import { api, formatCurrency } from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';

export default function AdminAdvances() {
  const [data, setData] = useState({ data: [], total: 0, page: 1, limit: 10 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const load = (page = 1) => api.admin.advances({ search, status, page, limit: 10 }).then(setData);
  useEffect(() => { load(); }, []);
  useEffect(() => { load(1); }, [search, status]);

  const handleStatus = async (id, newStatus) => {
    await api.admin.advanceStatus(id, newStatus);
    load(data.page);
  };

  return (
    <div className="card">
      <div className="card-header"><h3>Advance Management</h3></div>
      <div className="card-body">
        <div className="table-toolbar">
          <input className="search-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="filter-select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Status</option>
            {['Pending', 'Approved', 'Rejected'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Reporter</th><th>Assignment</th><th>Amount</th><th>Purpose</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {data.data.map(row => (
                <tr key={row.id}>
                  <td>#{row.id}</td>
                  <td>{row.reporter_name}</td>
                  <td>{row.assignment_title}</td>
                  <td><strong>{formatCurrency(row.amount)}</strong></td>
                  <td>{row.purpose || '—'}</td>
                  <td>{row.date}</td>
                  <td><StatusBadge status={row.status} /></td>
                  <td>
                    {row.status === 'Pending' && (
                      <div className="btn-group">
                        <button className="btn btn-success btn-sm" onClick={() => handleStatus(row.id, 'Approved')}>Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleStatus(row.id, 'Rejected')}>Reject</button>
                      </div>
                    )}
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
