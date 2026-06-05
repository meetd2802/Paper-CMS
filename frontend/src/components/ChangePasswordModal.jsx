import React, { useState } from 'react';
import { Lock, X, Key, AlertTriangle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

export default function ChangePasswordModal({ isOpen, onClose, token, user, fetchProfile, showAlert, onLogout, isFirstLogin }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  if (!isOpen) return null;

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword) return;
    if (newPassword !== confirmPassword) {
      showAlert('Password Mismatch', 'New password and confirmation do not match.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showAlert('Weak Password', 'Password must be at least 6 characters.', 'error');
      return;
    }

    setPwdLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to change password');
      showAlert('Success', 'Password updated successfully.', 'success');
      setNewPassword('');
      setConfirmPassword('');
      // Refresh profile to update must_reset_password flag in client state
      await fetchProfile(token);
      onClose();
    } catch (err) {
      showAlert('Error', err.message, 'error');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={isFirstLogin ? undefined : onClose}>
      <div className="modal-box" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: 'white' }}>
            <Lock size={18} color="var(--color-primary)" />
            {isFirstLogin ? 'Reset Password' : 'Change Password'}
          </h3>
          {!isFirstLogin && (
            <button className="btn-icon" onClick={onClose} style={{ color: 'rgba(255, 255, 255, 0.6)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          )}
        </div>
        <form onSubmit={handleResetPassword}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {isFirstLogin && (
              <div className="alert alert-warning" style={{ margin: 0, padding: '12px 14px', borderRadius: 8, background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fde68a', fontSize: 13 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}>
                  <AlertTriangle size={15} /> Password Reset Required
                </div>
                <p style={{ marginTop: 4, fontSize: 12, lineHeight: 1.4 }}>
                  For security reasons, you must change your temporary password before you start using the system.
                </p>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                <Lock size={13} color="var(--color-primary)" /> New Password
              </label>
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

            <div className="form-group">
              <label className="form-label">
                <Lock size={13} color="var(--color-primary)" /> Confirm New Password
              </label>
              <input
                type="password"
                className="form-control"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="modal-footer">
            {isFirstLogin ? (
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onLogout}
                style={{ background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                Sign Out
              </button>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={pwdLoading}>
              {pwdLoading ? <span className="spinner" /> : <><Key size={15} /> Update Password</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
