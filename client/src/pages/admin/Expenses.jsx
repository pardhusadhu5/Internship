import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { api, formatCurrency, formatDate, exportCSV } from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import ReceiptPreview from '../../components/ReceiptPreview';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';

export default function AdminExpenses() {
  const [data, setData] = useState({ data: [], total: 0, page: 1, limit: 10 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [preview, setPreview] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [remarks, setRemarks] = useState('');

  const load = (page = 1) => api.admin.expenses({ search, status, category, page, limit: 10 }).then(setData);
  useEffect(() => { load(); }, []);
  useEffect(() => { load(1); }, [search, status, category]);

  const handleStatus = async (id, newStatus, r = '') => {
    await api.admin.expenseStatus(id, newStatus, r);
    setRejectModal(null);
    setRemarks('');
    load(data.page);
  };

  const handleExport = async () => {
    const rows = await api.admin.exportExpenses();
    exportCSV(rows, 'expenses-report.csv');
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3>Expense Verification</h3>
        <button className="btn btn-secondary btn-sm" onClick={handleExport}><Download size={16} /> Export CSV</button>
      </div>
      <div className="card-body">
        <div className="table-toolbar">
          <input className="search-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="filter-select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Status</option>
            {['Pending', 'Approved', 'Rejected'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="filter-select" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {['Travel', 'Food', 'Accommodation', 'Local Transport', 'Miscellaneous'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Reporter</th><th>Assignment</th><th>Category</th><th>Amount</th><th>Date</th><th>Receipt</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {data.data.map(row => (
                <tr key={row.id}>
                  <td>#{row.id}</td>
                  <td>{row.reporter_name}</td>
                  <td>{row.assignment_title}</td>
                  <td>{row.category}</td>
                  <td><strong>{formatCurrency(row.amount)}</strong></td>
                  <td>{formatDate(row.expense_date)}</td>
                  <td>
                    {row.receipt ? (
                      <span className="receipt-link" onClick={() => setPreview(row.receipt)}>View</span>
                    ) : '—'}
                  </td>
                  <td><StatusBadge status={row.status} /></td>
                  <td>
                    {row.status === 'Pending' && (
                      <div className="btn-group">
                        <button className="btn btn-success btn-sm" onClick={() => handleStatus(row.id, 'Approved')}>Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setRejectModal(row.id)}>Reject</button>
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

      <ReceiptPreview open={!!preview} onClose={() => setPreview(null)} receipt={preview} />
      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Expense"
        footer={<><button className="btn btn-secondary" onClick={() => setRejectModal(null)}>Cancel</button><button className="btn btn-danger" onClick={() => handleStatus(rejectModal, 'Rejected', remarks)}>Reject</button></>}>
        <div className="form-group">
          <label>Remarks</label>
          <textarea className="form-textarea" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Reason for rejection..." />
        </div>
      </Modal>
    </div>
  );
}
