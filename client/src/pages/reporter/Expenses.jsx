import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, formatCurrency, formatDate } from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import ReceiptPreview from '../../components/ReceiptPreview';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';

const CATEGORIES = ['Travel', 'Food', 'Accommodation', 'Local Transport', 'Miscellaneous'];

export default function ReporterExpenses() {
  const [data, setData] = useState({ data: [], total: 0, page: 1, limit: 10 });
  const [assignments, setAssignments] = useState([]);
  const [receiptLimit, setReceiptLimit] = useState(500);
  const [modal, setModal] = useState(false);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({ assignment_id: '', category: 'Travel', amount: '', expense_date: '', description: '' });
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');

  const load = (page = 1) => api.reporter.expenses({ page, limit: 10 }).then(setData);
  useEffect(() => {
    load();
    api.reporter.assignmentsList().then(setAssignments);
    api.receiptLimit().then(r => setReceiptLimit(r.receipt_limit));
  }, []);

  const handleSubmit = async () => {
    setError('');
    const fd = new FormData();
    fd.append('assignment_id', form.assignment_id);
    fd.append('category', form.category);
    fd.append('amount', form.amount);
    fd.append('expense_date', form.expense_date);
    fd.append('description', form.description);
    if (receipt) fd.append('receipt', receipt);

    try {
      await api.reporter.createExpense(fd);
      setModal(false);
      setForm({ assignment_id: '', category: 'Travel', amount: '', expense_date: '', description: '' });
      setReceipt(null);
      load(data.page);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3>My Expenses</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}><Plus size={16} /> Submit Expense</button>
      </div>
      <div className="card-body">
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Assignment</th><th>Category</th><th>Amount</th><th>Date</th><th>Receipt</th><th>Status</th><th>Remarks</th></tr></thead>
            <tbody>
              {data.data.map(row => (
                <tr key={row.id}>
                  <td>#{row.id}</td>
                  <td>{row.assignment_title}</td>
                  <td>{row.category}</td>
                  <td><strong>{formatCurrency(row.amount)}</strong></td>
                  <td>{formatDate(row.expense_date)}</td>
                  <td>
                    {row.receipt ? <span className="receipt-link" onClick={() => setPreview(row.receipt)}>View</span> : '—'}
                  </td>
                  <td><StatusBadge status={row.status} /></td>
                  <td>{row.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={data.page} total={data.total} limit={data.limit} onPageChange={load} />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Submit Expense"
        footer={<><button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit}>Submit</button></>}>
        {error && <div className="form-error">{error}</div>}
        <div className="form-group">
          <label>Assignment</label>
          <select className="form-select" value={form.assignment_id} onChange={e => setForm({ ...form, assignment_id: e.target.value })}>
            <option value="">Select Assignment</option>
            {assignments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Category</label>
            <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Amount (₹)</label>
            <input className="form-input" type="number" min="1" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label>Expense Date</label>
          <input className="form-input" type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Receipt (JPG, PNG, PDF) {Number(form.amount) > receiptLimit && <span style={{ color: 'var(--danger)' }}>* Required above ₹{receiptLimit}</span>}</label>
          <input className="form-input" type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => setReceipt(e.target.files[0])} />
        </div>
      </Modal>

      <ReceiptPreview open={!!preview} onClose={() => setPreview(null)} receipt={preview} />
    </div>
  );
}
