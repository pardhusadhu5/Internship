const API = import.meta.env.VITE_API_URL || '/api';
export const BACKEND_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : '';

function getToken() {
  return localStorage.getItem('token');
}

async function request(url, options = {}) {
  const headers = { ...options.headers, 'Bypass-Tunnel-Reminder': 'true' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API}${url}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),

  admin: {
    dashboard: () => request('/admin/dashboard'),
    assignments: (params) => request(`/admin/assignments?${new URLSearchParams(params)}`),
    createAssignment: (data) => request('/admin/assignments', { method: 'POST', body: JSON.stringify(data) }),
    updateAssignment: (id, data) => request(`/admin/assignments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteAssignment: (id) => request(`/admin/assignments/${id}`, { method: 'DELETE' }),
    reporters: (params) => request(`/admin/reporters?${new URLSearchParams(params)}`),
    reportersAll: () => request('/admin/reporters/all'),
    createReporter: (data) => request('/admin/reporters', { method: 'POST', body: JSON.stringify(data) }),
    updateReporter: (id, data) => request(`/admin/reporters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    resetPassword: (id, password) => request(`/admin/reporters/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) }),
    advances: (params) => request(`/admin/advances?${new URLSearchParams(params)}`),
    advanceStatus: (id, status) => request(`/admin/advances/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
    expenses: (params) => request(`/admin/expenses?${new URLSearchParams(params)}`),
    expenseStatus: (id, status, remarks) => request(`/admin/expenses/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, remarks }) }),
    settlements: (params) => request(`/admin/settlements?${new URLSearchParams(params)}`),
    updateSettlement: (id, settlement_status) => request(`/admin/settlements/${id}`, { method: 'PUT', body: JSON.stringify({ settlement_status }) }),
    analytics: () => request('/admin/analytics'),
    auditLogs: (params) => request(`/admin/audit-logs?${new URLSearchParams(params)}`),
    exportExpenses: () => request('/admin/export/expenses'),
    exportSettlements: () => request('/admin/export/settlements'),
  },

  reporter: {
    dashboard: () => request('/reporter/dashboard'),
    assignments: (params) => request(`/reporter/assignments?${new URLSearchParams(params)}`),
    acceptAssignment: (id) => request(`/reporter/assignments/${id}/accept`, { method: 'PUT' }),
    completeAssignment: (id) => request(`/reporter/assignments/${id}/complete`, { method: 'PUT' }),
    assignmentsList: () => request('/reporter/assignments/list'),
    advances: (params) => request(`/reporter/advances?${new URLSearchParams(params)}`),
    createAdvance: (data) => request('/reporter/advances', { method: 'POST', body: JSON.stringify(data) }),
    expenses: (params) => request(`/reporter/expenses?${new URLSearchParams(params)}`),
    createExpense: (formData) => request('/reporter/expenses', { method: 'POST', body: formData }),
    settlements: () => request('/reporter/settlements'),
  },

  notifications: () => request('/notifications'),
  markRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () => request('/notifications/read-all', { method: 'PUT' }),
  receiptLimit: () => request('/settings/receipt-limit'),
};

export function exportCSV(data, filename) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
}

export function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
