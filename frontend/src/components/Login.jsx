import React, { useState } from 'react';
import { LogIn, Key, Mail, AlertTriangle, Eye, EyeOff } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [mustReset, setMustReset] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetDone, setResetDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Invalid credentials');
      if (data.must_reset_password) {
        setResetToken(data.access_token);
        setMustReset(true);
      } else {
        onLoginSuccess(data.access_token);
      }
    } catch (err) {
      setError(err.message || 'Server error. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resetToken}` },
        body: JSON.stringify({ new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to reset password');
      setResetDone(true);
      setTimeout(() => onLoginSuccess(resetToken), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card glass-card">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Key size={26} color="white" />
          </div>
          <h2 className="auth-title">Question Paper CMS</h2>
          <p className="auth-subtitle">
            {mustReset ? 'Set your new password to continue' : 'Sign in to manage question papers'}
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {resetDone && (
          <div className="alert alert-success">Password reset! Logging you in…</div>
        )}

        {!mustReset ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" htmlFor="email">
                <Mail size={14} /> Email Address
              </label>
              <input
                id="email"
                type="email"
                className="form-control"
                placeholder="admin@school.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="form-group" style={{ marginBottom: 24, position: 'relative' }}>
              <label className="form-label" htmlFor="password">
                <Key size={14} /> Password
              </label>
              <input
                id="password"
                type={showPwd ? 'text' : 'password'}
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={{ position: 'absolute', right: 10, bottom: 9, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px' }} disabled={loading}>
              {loading ? <span className="spinner" /> : <><LogIn size={16} /> Sign In</>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset}>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading || resetDone}>
              {loading ? <span className="spinner" /> : 'Set New Password & Continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;