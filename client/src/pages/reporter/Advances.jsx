import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, formatCurrency } from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';

export default function ReporterAdvances() {
  const [data, setData] = useState({ data: [], total: 0, page: 1, limit: 10 });
  const [assignments, setAssignments] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ assignment_id: '', amount: '', purpose: '' });
  const [error, setError] = useState('');

  const load = (page = 1) => api.reporter.advances({ page, limit: 10 }).then(setData);
  useEffect(() => { load(); api.reporter.assignmentsList().then(setAssignments); }, []);

  const handleSubmit = async () => {
    setError('');
    try {
      await api.reporter.createAdvance({ ...form, assignment_id: Number(form.assignment_id), amount: Number(form.amount) });
      setModal(false);
      setForm({ assignment_id: '', amount: '', purpose: '' });
      load(data.page);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3>Advance Requests</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}><Plus size={16} /> Request Advance</button>
      </div>
      <div className="card-body">
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Assignment</th><th>Amount</th><th>Purpose</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {data.data.map(row => (
                <tr key={row.id}>
                  <td>#{row.id}</td>
                  <td>{row.assignment_title}</td>
                  <td><strong>{formatCurrency(row.amount)}</strong></td>
                  <td>{row.purpose || '—'}</td>
                  <td>{row.date}</td>
                  <td><StatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={data.page} total={data.total} limit={data.limit} onPageChange={load} />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Request Advance"
        footer={<><button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit}>Submit</button></>}>
        {error && <div className="form-error">{error}</div>}
        <div className="form-group">
          <label>Assignment</label>
          <select className="form-select" value={form.assignment_id} onChange={e => setForm({ ...form, assignment_id: e.target.value })}>
            <option value="">Select Assignment</option>
            {assignments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Amount (₹)</label>
          <input className="form-input" type="number" min="1" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Purpose</label>
          <textarea className="form-textarea" value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
