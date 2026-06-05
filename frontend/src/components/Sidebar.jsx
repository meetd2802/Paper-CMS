import React, { useState } from 'react';
import {
  LayoutDashboard, Users, BookOpen, LogOut, ChevronDown, ChevronRight,
  FolderOpen, Plus, Trash2, GraduationCap, User, Lock
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const Sidebar = ({ user, standards, activeTab, activeStandard, onTabChange, onOpenClass, onLogout, token, fetchStandards, showAlert, showConfirm, onOpenProfile, onOpenChangePassword }) => {
  const [cbseOpen, setCbseOpen] = useState(true);
  const [gsebOpen, setGsebOpen] = useState(true);
  
  const [showCbseAddForm, setShowCbseAddForm] = useState(false);
  const [newCbseClassName, setNewCbseClassName] = useState('');
  const [addingCbseClass, setAddingCbseClass] = useState(false);
  
  const [showGsebAddForm, setShowGsebAddForm] = useState(false);
  const [newGsebClassName, setNewGsebClassName] = useState('');
  const [addingGsebClass, setAddingGsebClass] = useState(false);

  const isAdmin = user?.role === 'superadmin';
  const userBoards = user?.boards || [];
  const hasCBSE = !isAdmin && userBoards.includes('CBSE');
  const hasGSEB = !isAdmin && userBoards.includes('GSEB');

  const handleAddClass = async (board, e) => {
    e.preventDefault();
    const className = board === 'CBSE' ? newCbseClassName : newGsebClassName;
    if (!className.trim()) return;
    
    const setAdding = board === 'CBSE' ? setAddingCbseClass : setAddingGsebClass;
    const setNewClass = board === 'CBSE' ? setNewCbseClassName : setNewGsebClassName;
    const setShowForm = board === 'CBSE' ? setShowCbseAddForm : setShowGsebAddForm;
    
    setAdding(true);
    try {
      const res = await fetch(`${API}/standards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: className.trim(), board: board }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to add class');
      setNewClass('');
      setShowForm(false);
      fetchStandards();
    } catch (err) {
      showAlert('Error', err.message, 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteClass = (std) => {
    showConfirm('Delete Class', `Delete "${std.name}" and all its papers? This cannot be undone.`, async () => {
      try {
        const res = await fetch(`${API}/standards/${std.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.detail || 'Failed to delete');
        }
        fetchStandards();
        if (activeStandard?.id === std.id) onTabChange('dashboard');
      } catch (err) {
        showAlert('Error', err.message, 'error');
      }
    });
  };

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <h2>📄 QP CMS</h2>
        <p>{user?.email}</p>
      </div>

      <div className="sidebar-nav">
        {user?.must_reset_password ? (
          <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 8, color: '#fca5a5', fontSize: 13, marginBottom: 12 }}>
            ⚠️ Password reset required to unlock dashboard features.
          </div>
        ) : (
          <>
            {/* Dashboard */}
            <button
              className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => onTabChange('dashboard')}
            >
              <LayoutDashboard size={17} />
              Dashboard
            </button>

            {/* CBSE Section */}
            {hasCBSE && (
              <div style={{ marginTop: 8 }}>
                <button
                  className="sidebar-item"
                  onClick={() => setCbseOpen(v => !v)}
                  style={{ justifyContent: 'space-between', color: '#a5b4fc', fontWeight: 'bold' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FolderOpen size={17} />
                    CBSE Classes
                  </span>
                  {cbseOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {cbseOpen && (
                  <div style={{ paddingLeft: 12 }}>
                    {standards.filter(s => s.board === 'CBSE').map(std => (
                      <div key={std.id} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                        <button
                          className={`sidebar-item ${activeTab === 'class' && activeStandard?.id === std.id ? 'active' : ''}`}
                          style={{ flex: 1, fontSize: 13 }}
                          onClick={() => onOpenClass(std)}
                        >
                          <GraduationCap size={14} />
                          {std.name}
                        </button>
                        {!isAdmin && (
                          <button
                            className="btn-icon danger"
                            style={{ width: 26, height: 26, borderRadius: 6, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}
                            onClick={(e) => { e.stopPropagation(); handleDeleteClass(std); }}
                            title="Delete class"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}

                    {!isAdmin && (
                      <>
                        {showCbseAddForm ? (
                          <form onSubmit={(e) => handleAddClass('CBSE', e)} style={{ padding: '8px 4px', display: 'flex', gap: 6 }}>
                            <input
                              type="text"
                              className="form-control"
                              style={{ fontSize: 12, padding: '5px 8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
                              placeholder="Class name..."
                              value={newCbseClassName}
                              onChange={e => setNewCbseClassName(e.target.value)}
                              autoFocus
                            />
                            <button type="submit" className="btn btn-primary btn-sm" disabled={addingCbseClass} style={{ padding: '5px 10px', fontSize: 12 }}>
                              {addingCbseClass ? '...' : 'Add'}
                            </button>
                          </form>
                        ) : (
                          <button
                            className="sidebar-item"
                            style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}
                            onClick={() => setShowCbseAddForm(true)}
                          >
                            <Plus size={13} /> Add CBSE Class
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* GSEB Section */}
            {hasGSEB && (
              <div style={{ marginTop: 8 }}>
                <button
                  className="sidebar-item"
                  onClick={() => setGsebOpen(v => !v)}
                  style={{ justifyContent: 'space-between', color: '#fcd34d', fontWeight: 'bold' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FolderOpen size={17} />
                    GSEB Classes
                  </span>
                  {gsebOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {gsebOpen && (
                  <div style={{ paddingLeft: 12 }}>
                    {standards.filter(s => s.board === 'GSEB').map(std => (
                      <div key={std.id} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                        <button
                          className={`sidebar-item ${activeTab === 'class' && activeStandard?.id === std.id ? 'active' : ''}`}
                          style={{ flex: 1, fontSize: 13 }}
                          onClick={() => onOpenClass(std)}
                        >
                          <GraduationCap size={14} />
                          {std.name}
                        </button>
                        {!isAdmin && (
                          <button
                            className="btn-icon danger"
                            style={{ width: 26, height: 26, borderRadius: 6, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}
                            onClick={(e) => { e.stopPropagation(); handleDeleteClass(std); }}
                            title="Delete class"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}

                    {!isAdmin && (
                      <>
                        {showGsebAddForm ? (
                          <form onSubmit={(e) => handleAddClass('GSEB', e)} style={{ padding: '8px 4px', display: 'flex', gap: 6 }}>
                            <input
                              type="text"
                              className="form-control"
                              style={{ fontSize: 12, padding: '5px 8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
                              placeholder="Class name..."
                              value={newGsebClassName}
                              onChange={e => setNewGsebClassName(e.target.value)}
                              autoFocus
                            />
                            <button type="submit" className="btn btn-primary btn-sm" disabled={addingGsebClass} style={{ padding: '5px 10px', fontSize: 12 }}>
                              {addingGsebClass ? '...' : 'Add'}
                            </button>
                          </form>
                        ) : (
                          <button
                            className="sidebar-item"
                            style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}
                            onClick={() => setShowGsebAddForm(true)}
                          >
                            <Plus size={13} /> Add GSEB Class
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Subjects - teacher only (personal view) */}
            {!isAdmin && (
              <button
                className={`sidebar-item ${activeTab === 'subjects' ? 'active' : ''}`}
                onClick={() => onTabChange('subjects')}
                style={{ marginTop: 8 }}
              >
                <BookOpen size={17} />
                My Subjects
              </button>
            )}

            {/* Teachers - admin only */}
            {isAdmin && (
              <button
                className={`sidebar-item ${activeTab === 'teachers' ? 'active' : ''}`}
                onClick={() => onTabChange('teachers')}
                style={{ marginTop: 8 }}
              >
                <Users size={17} />
                Teachers
              </button>
            )}
          </>
        )}

        {/* Profile Link */}
        <button
          className="sidebar-item"
          onClick={onOpenProfile}
          style={{ marginTop: 8 }}
        >
          <User size={17} />
          My Profile
        </button>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{ padding: '8px 12px', marginBottom: 8, borderRadius: 8, background: 'rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Logged in as</div>
          <div style={{ fontSize: 13, color: 'white', fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isAdmin ? '👑 Super Admin' : '👤 Teacher'}
          </div>
        </div>
        <button className="sidebar-item" style={{ color: '#a5b4fc', marginBottom: 4 }} onClick={onOpenChangePassword}>
          <Lock size={16} /> Change Password
        </button>
        <button className="sidebar-item" style={{ color: '#fca5a5' }} onClick={onLogout}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;