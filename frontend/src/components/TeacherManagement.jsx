import React, { useState, useEffect } from 'react';
import { Trash2, Users, RotateCcw } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const TeacherManagement = ({ standards, subjects, token, showAlert, showConfirm }) => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterActive, setFilterActive] = useState(true);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/teachers`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setTeachers(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchTeachers(); }, []);

  const handleDelete = (teacher) => {
    showConfirm('Delete Teacher', `Remove teacher "${teacher.email}" and all their data?`, async () => {
      try {
        const res = await fetch(`${API}/teachers/${teacher.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.detail || 'Failed to delete');
        }
        fetchTeachers();
        showAlert('Deleted', 'Teacher removed.', 'success');
      } catch (err) {
        showAlert('Error', err.message, 'error');
      }
    });
  };

  const handleToggleActive = (teacher) => {
    const actionName = teacher.is_active ? 'Block' : 'Unblock & Restore';
    const actionVerb = teacher.is_active ? 'block' : 'unblock and restore';
    
    showConfirm(
      `${actionName} Teacher`,
      `Are you sure you want to ${actionVerb} teacher "${teacher.email}"?`,
      async () => {
        try {
          const res = await fetch(`${API}/teachers/${teacher.id}/toggle-active`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!res.ok) {
            const d = await res.json();
            throw new Error(d.detail || 'Failed to toggle status');
          }
          fetchTeachers();
          showAlert('Status Updated', `Teacher status successfully updated.`, 'success');
        } catch (err) {
          showAlert('Error', err.message, 'error');
        }
      }
    );
  };

  const getTeacherClasses = (teacher) => {
    const ids = [...new Set(teacher.assignments?.map(a => Number(a.standard_id)) || [])];
    return ids.map(id => standards.find(s => Number(s.id) === id)?.name).filter(Boolean);
  };

  const getTeacherSubjects = (teacher) => {
    return [...new Set(teacher.assignments?.map(a => a.subject) || [])];
  };

  const filteredTeachers = teachers.filter(teacher => !!teacher.is_active === filterActive);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Teachers</h1>
          <p className="page-subtitle">View teacher accounts, password update status, and manage active status</p>
        </div>
      </div>

      {/* Teachers List */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="card-title">All Teachers</span>
            <span className="badge badge-primary">
              {filteredTeachers.length} {filterActive ? 'active' : 'blocked'}
            </span>
          </div>

          {/* Segmented Control Filter Toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-app)', padding: 3, borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <button 
              type="button"
              onClick={() => setFilterActive(true)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                background: filterActive ? 'white' : 'transparent',
                color: filterActive ? 'var(--color-success)' : 'var(--text-secondary)',
                boxShadow: filterActive ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Active
            </button>
            <button 
              type="button"
              onClick={() => setFilterActive(false)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                background: !filterActive ? 'white' : 'transparent',
                color: !filterActive ? 'var(--color-danger)' : 'var(--text-secondary)',
                boxShadow: !filterActive ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Blocked
            </button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><span className="spinner dark" /></div>
        ) : teachers.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <p>No teachers have registered or onboarded yet.</p>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <p>{filterActive ? "No active teachers found." : "No blocked teachers found."}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Status</th>
                <th>Password Status</th>
                <th>Classes</th>
                <th>Subjects</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.map(teacher => (
                <tr key={teacher.id}>
                  <td style={{ fontWeight: 600 }}>{teacher.email}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <label className="switch" style={{ margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={teacher.is_active}
                          onChange={() => handleToggleActive(teacher)}
                        />
                        <span className="slider"></span>
                      </label>
                      <span style={{ fontSize: 13, fontWeight: 600, color: teacher.is_active ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {teacher.is_active ? 'Active' : 'Blocked'}
                      </span>
                    </div>
                  </td>
                  <td>
                    {teacher.must_reset_password ? (
                      <span className="badge" style={{ background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5' }}>
                        Default Password (Not Updated)
                      </span>
                    ) : (
                      <span className="badge" style={{ background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' }}>
                        Changed
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {getTeacherClasses(teacher).map(cls => (
                        <span key={cls} className="badge badge-primary" style={{ fontSize: 11 }}>{cls}</span>
                      ))}
                      {getTeacherClasses(teacher).length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>None</span>}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {getTeacherSubjects(teacher).map(sub => (
                        <span key={sub} className="badge badge-success" style={{ fontSize: 11 }}>{sub}</span>
                      ))}
                      {getTeacherSubjects(teacher).length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>None</span>}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {teacher.is_active ? (
                        <button className="btn-icon danger" onClick={() => handleDelete(teacher)} title="Delete Teacher">
                          <Trash2 size={15} />
                        </button>
                      ) : (
                        <button
                          className="btn-icon"
                          onClick={() => handleToggleActive(teacher)}
                          style={{ color: 'var(--color-success)' }}
                          title="Restore / Unblock Teacher"
                        >
                          <RotateCcw size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TeacherManagement;