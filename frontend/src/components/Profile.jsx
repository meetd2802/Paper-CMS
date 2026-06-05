import React, { useState, useEffect } from 'react';
import { Mail, Shield, Check, Save, User, X } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const Profile = ({ isOpen, onClose, token, user, fetchProfile, showAlert }) => {
  const [email, setEmail] = useState(user?.email || '');
  const [boards, setBoards] = useState(user?.boards || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setBoards(user.boards || []);
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          boards: user?.role === 'superadmin' ? null : boards,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to update profile');
      showAlert('Success', 'Profile details updated successfully!', 'success');
      await fetchProfile(token);
      onClose();
    } catch (err) {
      showAlert('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleBoard = (b) => {
    setBoards(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
  };

  const getInitials = (emailStr) => {
    if (!emailStr) return 'U';
    return emailStr.substring(0, 2).toUpperCase();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: 'white' }}>
            <User size={18} color="var(--color-primary)" /> My Profile Settings
          </h3>
          <button className="btn-icon" onClick={onClose} style={{ color: 'rgba(255, 255, 255, 0.6)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleUpdateProfile}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* User Overview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 18,
                fontWeight: 700,
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)'
              }}>
                {getInitials(user?.email)}
              </div>
              <div>
                <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                  {user?.email}
                </h4>
                <span className="badge" style={{ 
                  marginTop: 4, 
                  background: user?.role === 'superadmin' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                  color: user?.role === 'superadmin' ? '#fca5a5' : '#a5b4fc',
                  border: user?.role === 'superadmin' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
                  fontWeight: 600,
                  fontSize: 11
                }}>
                  {user?.role === 'superadmin' ? '👑 Super Admin' : '👤 Teacher'}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <Mail size={13} color="var(--color-primary)" /> Email Address
              </label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Shield size={13} color="var(--color-primary)" /> Account Role
              </label>
              <input
                type="text"
                className="form-control"
                value={user?.role === 'superadmin' ? 'Super Admin' : 'Teacher'}
                disabled
                style={{ opacity: 0.7 }}
              />
            </div>

            {user?.role !== 'superadmin' && (
              <div className="form-group">
                <label className="form-label" style={{ marginBottom: 4 }}>Select Boards Access</label>
                <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                  {['CBSE', 'GSEB'].map(b => {
                    const active = boards.includes(b);
                    return (
                      <label 
                        key={b} 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 13.5,
                          cursor: 'pointer',
                          padding: '8px 14px',
                          borderRadius: 8,
                          border: `1.5px solid ${active ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.15)'}`,
                          background: active ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: active ? '#a5b4fc' : 'rgba(255, 255, 255, 0.7)',
                          fontWeight: 500,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleBoard(b)}
                          style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                        />
                        {b} Board
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : <><Save size={15} /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
