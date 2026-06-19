import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api, formatDate } from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';

const empty = { reporter_id: '', title: '', location: '', start_date: '', end_date: '', priority: 'Medium', description: '', status: 'Assigned' };

export default function AdminAssignments() {
  const [data, setData] = useState({ data: [], total: 0, page: 1, limit: 10 });
  const [reporters, setReporters] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);

  const load = (page = 1) => {
    api.admin.assignments({ search, status, page, limit: 10 }).then(setData);
  };

  useEffect(() => { load(); api.admin.reportersAll().then(setReporters); }, []);
  useEffect(() => { load(1); }, [search, status]);

  const openCreate = () => { setForm(empty); setEditId(null); setModal(true); };
  const openEdit = (row) => {
    setForm({ reporter_id: row.reporter_id, title: row.title, location: row.location, start_date: row.start_date, end_date: row.end_date, priority: row.priority, description: row.description || '', status: row.status });
    setEditId(row.id);
    setModal(true);
  };

  const handleSave = async () => {
    if (editId) await api.admin.updateAssignment(editId, form);
    else await api.admin.createAssignment(form);
    setModal(false);
    load(data.page);
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this assignment?')) {
      await api.admin.deleteAssignment(id);
      load(data.page);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3>Assignment Management</h3>
        <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={16} /> Create Assignment</button>
      </div>
      <div className="card-body">
        <div className="table-toolbar">
          <input className="search-input" placeholder="Search assignments..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="filter-select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Status</option>
            {['Assigned', 'In Progress', 'Completed', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>ID</th><th>Title</th><th>Reporter</th><th>Location</th><th>Dates</th><th>Priority</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {data.data.map(row => (
                <tr key={row.id}>
                  <td>#{row.id}</td>
                  <td><strong>{row.title}</strong></td>
                  <td>{row.reporter_name}</td>
                  <td>{row.location}</td>
                  <td>{formatDate(row.start_date)} – {formatDate(row.end_date)}</td>
                  <td><StatusBadge status={row.priority} /></td>
                  <td><StatusBadge status={row.status} /></td>
                  <td>
                    <div className="btn-group">
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(row)}><Pencil size={14} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={data.page} total={data.total} limit={data.limit} onPageChange={load} />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit Assignment' : 'Create Assignment'}
        footer={<><button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save</button></>}>
        <div className="form-row">
          <div className="form-group">
            <label>Reporter</label>
            <select className="form-select" value={form.reporter_id} onChange={e => setForm({ ...form, reporter_id: Number(e.target.value) })}>
              <option value="">Select Reporter</option>
              {reporters.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select className="form-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
              {['High', 'Medium', 'Low'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Title</label>
          <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Location</label>
          <input className="form-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Start Date</label>
            <input className="form-input" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div className="form-group">
            <label>End Date</label>
            <input className="form-input" type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
          </div>
        </div>
        {editId && (
          <div className="form-group">
            <label>Status</label>
            <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              {['Assigned', 'In Progress', 'Completed', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
        <div className="form-group">
          <label>Description</label>
          <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
