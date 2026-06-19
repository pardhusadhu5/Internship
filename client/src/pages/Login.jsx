import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Newspaper, CheckCircle, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'admin' ? '/admin' : '/reporter');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="login-hero-content">
          <h1>Namaste Telangana</h1>
          <p>Journalist Field Assignment & Expense Management System</p>
          <ul className="login-features">
            <li><Newspaper size={18} /> Field Assignment Management</li>
            <li><CheckCircle size={18} /> Expense Tracking & Receipts</li>
            <li><Shield size={18} /> Role-Based Access Control</li>
          </ul>
        </div>
      </div>
      <div className="login-form-section">
        <div className="login-card">
          <h2>Welcome Back</h2>
          <p className="subtitle">Sign in to your account</p>
          {error && <div className="form-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@namaste.com" required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div className="demo-credentials">
            <strong>Demo Credentials</strong>
            Admin: admin@namaste.com / admin123<br />
            Reporter: ravi@namaste.com / reporter123
          </div>
        </div>
      </div>
    </div>
  );
}
