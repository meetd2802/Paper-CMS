import React, { useState } from 'react';
import { UserPlus, Mail, AlertTriangle, ArrowLeft } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const COMMON_BOARDS = ['CBSE', 'GSEB'];

export default function Signup({ onGoToLogin, showAlert }) {
  const [email, setEmail] = useState('');
  const [selectedBoards, setSelectedBoards] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const toggleBoard = (b) => {
    setSelectedBoards(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (selectedBoards.length === 0) {
      setError('Please select at least one board (CBSE or GSEB).');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          boards: selectedBoards
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Registration failed');
      setSuccess(true);
      showAlert('Account Created', 'Registration successful! Please log in using the temporary password: Test@123', 'success');
      setTimeout(() => {
        onGoToLogin();
      }, 4000);
    } catch (err) {
      setError(err.message || 'Server error. Could not complete registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card glass-card" style={{ maxWidth: 440 }}>
        <button 
          onClick={onGoToLogin} 
          style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', color: 'rgba(255, 255, 255, 0.7)', cursor: 'pointer', fontSize: 13, fontWeight: 500, marginBottom: 16, padding: 0 }}
        >
          <ArrowLeft size={14} /> Back to Login
        </button>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #10b981, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <UserPlus size={26} color="white" />
          </div>
          <h2 className="auth-title">Teacher Registration</h2>
          <p className="auth-subtitle">Create a private account to manage your classes and papers</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="alert alert-success" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            <p style={{ fontWeight: 600, margin: 0 }}>Registration Successful!</p>
            <p style={{ fontSize: 13, margin: 0 }}>Please log in using the default password: <strong>Test@123</strong>. You will be prompted to reset it immediately upon login.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Email */}
            <div className="form-group">
              <label className="form-label">
                <Mail size={14} /> Email Address
              </label>
              <input
                type="email"
                className="form-control"
                placeholder="teacher@school.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Boards */}
            <div className="form-group">
              <label className="form-label">Select Boards</label>
              <div style={{ display: 'flex', gap: 20, marginTop: 4 }}>
                {COMMON_BOARDS.map(b => (
                  <label key={b} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer', color: 'white' }}>
                    <input
                      type="checkbox"
                      checked={selectedBoards.includes(b)}
                      onChange={() => toggleBoard(b)}
                      style={{ cursor: 'pointer', width: 16, height: 16 }}
                    />
                    {b}
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px', marginTop: 10 }} disabled={loading}>
              {loading ? <span className="spinner" /> : 'Register Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
