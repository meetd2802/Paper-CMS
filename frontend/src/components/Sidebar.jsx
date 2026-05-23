import React, { useState } from 'react';
import {
  LayoutDashboard, Users, BookOpen, LogOut, ChevronDown, ChevronRight,
  FolderOpen, Plus, Trash2, GraduationCap
} from 'lucide-react';

const API = 'http://localhost:8000/api';

const Sidebar = ({ user, standards, activeTab, activeStandard, onTabChange, onOpenClass, onLogout, token, fetchStandards, showAlert, showConfirm }) => {
  const [classesOpen, setClassesOpen] = useState(true);
  const [newClassName, setNewClassName] = useState('');
  const [addingClass, setAddingClass] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const isAdmin = user?.role === 'superadmin';

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setAddingClass(true);
    try {
      const res = await fetch(`${API}/standards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newClassName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to add class');
      setNewClassName('');
      setShowAddForm(false);
      fetchStandards();
    } catch (err) {
      showAlert('Error', err.message, 'error');
    } finally {
      setAddingClass(false);
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
        {/* Dashboard */}
        <button
          className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => onTabChange('dashboard')}
        >
          <LayoutDashboard size={17} />
          Dashboard
        </button>

        {/* Classes */}
        <div>
          <button
            className="sidebar-item"
            onClick={() => setClassesOpen(v => !v)}
            style={{ justifyContent: 'space-between' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FolderOpen size={17} />
              Classes
            </span>
            {classesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {classesOpen && (
            <div style={{ paddingLeft: 12 }}>
              {standards.map(std => (
                <div key={std.id} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                  <button
                    className={`sidebar-item ${activeTab === 'class' && activeStandard?.id === std.id ? 'active' : ''}`}
                    style={{ flex: 1, fontSize: 13 }}
                    onClick={() => onOpenClass(std)}
                  >
                    <GraduationCap size={14} />
                    {std.name}
                  </button>
                  {isAdmin && (
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

              {isAdmin && (
                <>
                  {showAddForm ? (
                    <form onSubmit={handleAddClass} style={{ padding: '8px 4px', display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        className="form-control"
                        style={{ fontSize: 12, padding: '5px 8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
                        placeholder="Class name..."
                        value={newClassName}
                        onChange={e => setNewClassName(e.target.value)}
                        autoFocus
                      />
                      <button type="submit" className="btn btn-primary btn-sm" disabled={addingClass} style={{ padding: '5px 10px', fontSize: 12 }}>
                        {addingClass ? '...' : 'Add'}
                      </button>
                    </form>
                  ) : (
                    <button
                      className="sidebar-item"
                      style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}
                      onClick={() => setShowAddForm(true)}
                    >
                      <Plus size={13} /> Add Class
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Subjects - admin only */}
        {isAdmin && (
          <button
            className={`sidebar-item ${activeTab === 'subjects' ? 'active' : ''}`}
            onClick={() => onTabChange('subjects')}
          >
            <BookOpen size={17} />
            Subjects
          </button>
        )}

        {/* Teachers - admin only */}
        {isAdmin && (
          <button
            className={`sidebar-item ${activeTab === 'teachers' ? 'active' : ''}`}
            onClick={() => onTabChange('teachers')}
          >
            <Users size={17} />
            Teachers
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{ padding: '8px 12px', marginBottom: 8, borderRadius: 8, background: 'rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Logged in as</div>
          <div style={{ fontSize: 13, color: 'white', fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.role === 'superadmin' ? '👑 Super Admin' : '👤 Teacher'}
          </div>
        </div>
        <button className="sidebar-item" style={{ color: '#fca5a5' }} onClick={onLogout}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;