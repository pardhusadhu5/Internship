import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import Pagination from '../../components/Pagination';

export default function AdminAuditLogs() {
  const [data, setData] = useState({ data: [], total: 0, page: 1, limit: 15 });
  const [search, setSearch] = useState('');

  const load = (page = 1) => api.admin.auditLogs({ search, page, limit: 15 }).then(setData);
  useEffect(() => { load(); }, []);
  useEffect(() => { load(1); }, [search]);

  return (
    <div className="card">
      <div className="card-header"><h3>Audit Logs</h3></div>
      <div className="card-body">
        <div className="table-toolbar">
          <input className="search-input" placeholder="Search actions..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>ID</th><th>User</th><th>Action</th><th>Old Value</th><th>New Value</th><th>Timestamp</th></tr></thead>
            <tbody>
              {data.data.map(row => (
                <tr key={row.id}>
                  <td>#{row.id}</td>
                  <td>{row.user_name || 'System'}</td>
                  <td><strong>{row.action}</strong></td>
                  <td>{row.old_value || '—'}</td>
                  <td>{row.new_value || '—'}</td>
                  <td>{new Date(row.timestamp).toLocaleString('en-IN')}</td>
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
