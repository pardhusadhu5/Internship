import { useEffect, useState } from 'react';
import { api, formatDate } from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';

export default function ReporterAssignments() {
  const [data, setData] = useState({ data: [], total: 0, page: 1, limit: 10 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const load = (page = 1) => api.reporter.assignments({ search, status, page, limit: 10 }).then(setData);
  useEffect(() => { load(); }, []);
  useEffect(() => { load(1); }, [search, status]);

  const accept = async (id) => { await api.reporter.acceptAssignment(id); load(data.page); };
  const complete = async (id) => { await api.reporter.completeAssignment(id); load(data.page); };

  return (
    <div className="card">
      <div className="card-header"><h3>My Assignments</h3></div>
      <div className="card-body">
        <div className="table-toolbar">
          <input className="search-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="filter-select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Status</option>
            {['Assigned', 'In Progress', 'Completed', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Title</th><th>Location</th><th>Dates</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {data.data.map(row => (
                <tr key={row.id}>
                  <td>#{row.id}</td>
                  <td><strong>{row.title}</strong><br /><small style={{ color: 'var(--text-muted)' }}>{row.description?.slice(0, 60)}...</small></td>
                  <td>{row.location}</td>
                  <td>{formatDate(row.start_date)} – {formatDate(row.end_date)}</td>
                  <td><StatusBadge status={row.priority} /></td>
                  <td><StatusBadge status={row.status} /></td>
                  <td>
                    <div className="btn-group">
                      {row.status === 'Assigned' && <button className="btn btn-primary btn-sm" onClick={() => accept(row.id)}>Accept</button>}
                      {row.status === 'In Progress' && <button className="btn btn-success btn-sm" onClick={() => complete(row.id)}>Complete</button>}
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
