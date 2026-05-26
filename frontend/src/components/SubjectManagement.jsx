import React, { useState } from 'react';
import { BookOpen, Plus, Trash2, Edit, Check, X } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const SubjectManagement = ({ token, subjects, fetchSubjects, showAlert, showConfirm }) => {
  const [newName, setNewName] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`${API}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName.trim(), default_instructions: newInstructions.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to add subject');
      setNewName('');
      setNewInstructions('');
      setShowAddForm(false);
      fetchSubjects();
      showAlert('Success', `Subject "${data.name}" added.`, 'success');
    } catch (err) {
      showAlert('Error', err.message, 'error');
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (sub) => {
    setEditId(sub.id);
    setEditName(sub.name);
    setEditInstructions(sub.default_instructions || '');
  };

  const handleSaveEdit = async (sub) => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/subjects/${sub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editName.trim(), default_instructions: editInstructions.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to update');
      setEditId(null);
      fetchSubjects();
    } catch (err) {
      showAlert('Error', err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (sub) => {
    showConfirm('Delete Subject', `Delete subject "${sub.name}"? This will affect all related papers.`, async () => {
      try {
        const res = await fetch(`${API}/subjects/${sub.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.detail || 'Failed to delete');
        }
        fetchSubjects();
        showAlert('Deleted', `Subject "${sub.name}" removed.`, 'success');
      } catch (err) {
        showAlert('Error', err.message, 'error');
      }
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Subjects</h1>
          <p className="page-subtitle">Manage subject masters with default instructions</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(v => !v)}>
          <Plus size={16} /> Add Subject
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">New Subject</span>
          </div>
          <form onSubmit={handleAdd} className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, alignItems: 'flex-start' }}>
              <div className="form-group">
                <label className="form-label">Subject Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Mathematics"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Default Instructions</label>
                <textarea
                  className="form-control"
                  placeholder="Instructions that auto-fill when creating a paper for this subject…"
                  value={newInstructions}
                  onChange={e => setNewInstructions(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={adding}>
                {adding ? <span className="spinner" /> : 'Add Subject'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subjects List */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">All Subjects</span>
          <span className="badge badge-primary">{subjects.length} subjects</span>
        </div>

        {subjects.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={48} />
            <p>No subjects yet. Add one above.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Default Instructions</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map(sub => (
                <tr key={sub.id}>
                  <td>
                    {editId === sub.id ? (
                      <input
                        className="form-control"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        style={{ fontSize: 13 }}
                      />
                    ) : (
                      <span style={{ fontWeight: 600 }}>{sub.name}</span>
                    )}
                  </td>
                  <td>
                    {editId === sub.id ? (
                      <textarea
                        className="form-control"
                        value={editInstructions}
                        onChange={e => setEditInstructions(e.target.value)}
                        rows={2}
                        style={{ fontSize: 13 }}
                      />
                    ) : (
                      <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                        {sub.default_instructions || <em style={{ opacity: 0.4 }}>None</em>}
                      </span>
                    )}
                  </td>
                  <td>
                    {editId === sub.id ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-icon" onClick={() => handleSaveEdit(sub)} style={{ color: 'var(--color-success)' }} disabled={saving}>
                          <Check size={15} />
                        </button>
                        <button className="btn-icon" onClick={() => setEditId(null)}>
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-icon" onClick={() => startEdit(sub)} style={{ color: 'var(--color-primary)' }}>
                          <Edit size={15} />
                        </button>
                        <button className="btn-icon danger" onClick={() => handleDelete(sub)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
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

export default SubjectManagement;