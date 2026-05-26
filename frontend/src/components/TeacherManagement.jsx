import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Edit, X, Check, Mail, Users } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const TeacherManagement = ({ standards, subjects, token, showAlert, showConfirm }) => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // For add form
  const [addStandardIds, setAddStandardIds] = useState([]);
  const [addSubjects, setAddSubjects] = useState([]);

  // Edit modal
  const [editTeacher, setEditTeacher] = useState(null);
  const [editEmail, setEditEmail] = useState('');
  const [editStandardIds, setEditStandardIds] = useState([]);
  const [editSubjects, setEditSubjects] = useState([]);
  const [editSaving, setEditSaving] = useState(false);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/teachers`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setTeachers(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchTeachers(); }, []);

  const toggleStd = (id, arr, setArr) => {
    const numId = Number(id);
    setArr(prev => {
      const nums = prev.map(x => Number(x));
      return nums.includes(numId) ? nums.filter(x => x !== numId) : [...nums, numId];
    });
  };

  const toggleSub = (name, arr, setArr) => {
    setArr(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`${API}/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email: emailInput.trim(),
          standard_ids: addStandardIds,
          subjects: addSubjects,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to onboard teacher');
      setEmailInput('');
      setAddStandardIds([]);
      setAddSubjects([]);
      setShowAddForm(false);
      fetchTeachers();
      showAlert('Success', `Teacher "${data.email}" onboarded. Temporary password: Test@123`, 'success');
    } catch (err) {
      showAlert('Error', err.message, 'error');
    } finally {
      setAdding(false);
    }
  };

  const openEdit = (teacher) => {
    setEditTeacher(teacher);
    setEditEmail(teacher.email);
    setEditStandardIds(teacher.assignments?.map(a => Number(a.standard_id)) || []);
    setEditSubjects([...new Set(teacher.assignments?.map(a => a.subject) || [])]);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      const res = await fetch(`${API}/teachers/${editTeacher.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email: editEmail.trim(),
          standard_ids: editStandardIds,
          subjects: editSubjects,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to update teacher');
      setEditTeacher(null);
      fetchTeachers();
      showAlert('Success', 'Teacher updated successfully.', 'success');
    } catch (err) {
      showAlert('Error', err.message, 'error');
    } finally {
      setEditSaving(false);
    }
  };

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

  const getTeacherClasses = (teacher) => {
    const ids = [...new Set(teacher.assignments?.map(a => Number(a.standard_id)) || [])];
    return ids.map(id => standards.find(s => Number(s.id) === id)?.name).filter(Boolean);
  };

  const getTeacherSubjects = (teacher) => {
    return [...new Set(teacher.assignments?.map(a => a.subject) || [])];
  };

  // Dropdown: render a multi-select style using checkboxes in a dropdown
  const DropdownMulti = ({ label, options, selected, onToggle, getLabel, getValue }) => {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ position: 'relative' }}>
        <label className="form-label">{label}</label>
        <button
          type="button"
          className="form-control"
          style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          onClick={() => setOpen(v => !v)}
        >
          <span style={{ color: selected.length ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {selected.length ? `${selected.length} selected` : `Select ${label}…`}
          </span>
          <span style={{ fontSize: 10 }}>▼</span>
        </button>
        {open && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
            background: 'white', border: '1.5px solid var(--border-color)',
            borderRadius: 8, boxShadow: 'var(--shadow-md)', maxHeight: 200, overflowY: 'auto', marginTop: 4
          }}>
            {options.map(opt => {
              const val = getValue(opt);
              const checked = selected.includes(val);
              return (
                <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', fontSize: 13 }}>
                  <input type="checkbox" checked={checked} onChange={() => onToggle(val)} style={{ accentColor: 'var(--color-primary)' }} />
                  {getLabel(opt)}
                </label>
              );
            })}
            {options.length === 0 && <div style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 13 }}>No options available</div>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Teachers</h1>
          <p className="page-subtitle">Manage teacher accounts and class/subject assignments</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(v => !v)}>
          <UserPlus size={16} /> Add Teacher
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="card" style={{ marginBottom: 20, overflow: 'visible' }}>
          <div className="card-header">
            <span className="card-title">Onboard New Teacher</span>
          </div>
          <form onSubmit={handleAdd} className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label"><Mail size={13} /> Email *</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="teacher@school.edu"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <DropdownMulti
                label="Classes"
                options={standards}
                selected={addStandardIds}
                onToggle={(id) => toggleStd(id, addStandardIds, setAddStandardIds)}
                getLabel={s => s.name}
                getValue={s => s.id}
              />
              <DropdownMulti
                label="Subjects"
                options={subjects}
                selected={addSubjects}
                onToggle={(name) => toggleSub(name, addSubjects, setAddSubjects)}
                getLabel={s => s.name}
                getValue={s => s.name}
              />
            </div>
            <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--color-primary-bg)', borderRadius: 8, fontSize: 12.5, color: 'var(--color-primary)' }}>
              Default password will be <strong>Test@123</strong>. Teacher will be prompted to change on first login.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={adding}>
                {adding ? <span className="spinner" /> : 'Onboard Teacher'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Teachers List */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">All Teachers</span>
          <span className="badge badge-primary">{teachers.length} teachers</span>
        </div>

        {loading ? (
          <div className="empty-state"><span className="spinner dark" /></div>
        ) : teachers.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <p>No teachers yet. Onboard one above.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Password Status</th>
                <th>Classes</th>
                <th>Subjects</th>
                <th style={{ width: 90 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map(teacher => (
                <tr key={teacher.id}>
                  <td style={{ fontWeight: 600 }}>{teacher.email}</td>
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
                      <button className="btn-icon" onClick={() => openEdit(teacher)} style={{ color: 'var(--color-primary)' }}>
                        <Edit size={15} />
                      </button>
                      <button className="btn-icon danger" onClick={() => handleDelete(teacher)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {editTeacher && (
        <div className="modal-overlay" onClick={() => setEditTeacher(null)}>
          <div className="modal-box" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Edit Teacher</h3>
              <button className="btn-icon" onClick={() => setEditTeacher(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label"><Mail size={13} /> Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    required
                  />
                </div>

                {/* Classes dropdown */}
                <DropdownMulti
                  label="Assigned Classes"
                  options={standards}
                  selected={editStandardIds}
                  onToggle={(id) => toggleStd(id, editStandardIds, setEditStandardIds)}
                  getLabel={s => s.name}
                  getValue={s => s.id}
                />

                {/* Subjects dropdown */}
                <DropdownMulti
                  label="Assigned Subjects"
                  options={subjects}
                  selected={editSubjects}
                  onToggle={(name) => toggleSub(name, editSubjects, setEditSubjects)}
                  getLabel={s => s.name}
                  getValue={s => s.name}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditTeacher(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={editSaving}>
                  {editSaving ? <span className="spinner" /> : <><Check size={15} /> Save Changes</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherManagement;