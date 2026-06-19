import { useEffect, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { api } from '../../api/client';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';

export default function AdminReporters() {
  const [data, setData] = useState({ data: [], total: 0, page: 1, limit: 10 });
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [editForm, setEditForm] = useState({ name: '', email: '', active: true });
  const [editId, setEditId] = useState(null);

  const load = (page = 1) => api.admin.reporters({ search, page, limit: 10 }).then(setData);
  useEffect(() => { load(); }, []);
  useEffect(() => { load(1); }, [search]);

  const handleCreate = async () => {
    await api.admin.createReporter(form);
    setModal(false);
    setForm({ name: '', email: '', password: '' });
    load(data.page);
  };

  const handleEdit = async () => {
    await api.admin.updateReporter(editId, editForm);
    setEditModal(false);
    load(data.page);
  };

  const handleReset = async (id) => {
    if (confirm('Reset password to reporter123?')) {
      await api.admin.resetPassword(id);
      alert('Password reset to reporter123');
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3>Reporter Management</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}><Plus size={16} /> Add Reporter</button>
      </div>
      <div className="card-body">
        <div className="table-toolbar">
          <input className="search-input" placeholder="Search reporters..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              {data.data.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.name}</strong></td>
                  <td>{r.email}</td>
                  <td><span className={`badge badge-${r.active ? 'approved' : 'rejected'}`}>{r.active ? 'Active' : 'Disabled'}</span></td>
                  <td>{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                  <td>
                    <div className="btn-group">
                      <button className="btn btn-secondary btn-sm" onClick={() => { setEditId(r.id); setEditForm({ name: r.name, email: r.email, active: !!r.active }); setEditModal(true); }}><Pencil size={14} /></button>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleReset(r.id)}>Reset PW</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={data.page} total={data.total} limit={data.limit} onPageChange={load} />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Add Reporter"
        footer={<><button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreate}>Add</button></>}>
        <div className="form-group"><label>Name</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div className="form-group"><label>Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
        <div className="form-group"><label>Password</label><input className="form-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
      </Modal>

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Reporter"
        footer={<><button className="btn btn-secondary" onClick={() => setEditModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleEdit}>Save</button></>}>
        <div className="form-group"><label>Name</label><input className="form-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
        <div className="form-group"><label>Email</label><input className="form-input" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
        <div className="form-group">
          <label><input type="checkbox" checked={editForm.active} onChange={e => setEditForm({ ...editForm, active: e.target.checked })} /> Active</label>
        </div>
      </Modal>
    </div>
  );
}
