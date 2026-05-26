import React, { useState, useEffect } from 'react';
import { Plus, FileText, Trash2, Edit, Download, ArrowLeft, Eye } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const ClassView = ({ standard, activeSubject, onSetSubject, onCreatePaper, onEditPaper, token, user, subjects, showAlert, showConfirm, onBack }) => {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'superadmin';

  // For teachers, get their assigned subjects for this standard
  const assignedSubjects = React.useMemo(() => {
    if (isAdmin) return subjects;
    if (!user?.assignments) return [];
    return user.assignments
      .filter(a => String(a.standard_id) === String(standard.id))
      .map(a => ({ name: a.subject }));
  }, [user, standard, subjects, isAdmin]);

  const fetchPapers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ standard_id: standard.id });
      if (activeSubject) params.append('subject', activeSubject);
      const res = await fetch(`${API}/papers?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setPapers(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchPapers(); }, [standard.id, activeSubject]);

  const handleDelete = (paper) => {
    showConfirm('Delete Paper', `Delete "${paper.title}"? This cannot be undone.`, async () => {
      try {
        const res = await fetch(`${API}/papers/${paper.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.detail || 'Failed to delete');
        }
        fetchPapers();
      } catch (err) {
        showAlert('Error', err.message, 'error');
      }
    });
  };

  const handleDownload = async (paper, type = 'pdf') => {
    try {
      const url = type === 'answer' ? `${API}/papers/${paper.id}/answer-key-pdf` : `${API}/papers/${paper.id}/pdf`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to generate PDF');
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${paper.title}_${type}.pdf`;
      link.click();
    } catch (err) {
      showAlert('Error', err.message, 'error');
    }
  };

  const subjectList = isAdmin ? subjects : assignedSubjects;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>
            <ArrowLeft size={15} /> Back
          </button>
          <div>
            <h1 className="page-title">{standard.name}</h1>
            <p className="page-subtitle">Manage question papers for this class</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => onCreatePaper(standard)}>
          <Plus size={16} /> New Paper
        </button>
      </div>

      {/* Subject filter tabs */}
      {subjectList.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${!activeSubject ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => onSetSubject(null)}
          >
            All Subjects
          </button>
          {subjectList.map(sub => (
            <button
              key={sub.id || sub.name}
              className={`btn btn-sm ${activeSubject === sub.name ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => onSetSubject(sub.name)}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}

      {/* Papers */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            Question Papers {activeSubject ? `— ${activeSubject}` : ''}
          </span>
          <span className="badge badge-primary">{papers.length} papers</span>
        </div>

        {loading ? (
          <div className="empty-state"><span className="spinner dark" /></div>
        ) : papers.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <p>No papers yet. Create one to get started.</p>
          </div>
        ) : (
          <div>
            {papers.map(paper => (
              <div key={paper.id} className="paper-item">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {paper.title}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className="badge badge-primary">{paper.subject}</span>
                    {paper.max_marks && <span className="badge" style={{ background: '#f3f4f6', color: '#374151' }}>{paper.max_marks} Marks</span>}
                    {paper.date_str && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{paper.date_str}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    className="btn-icon"
                    title="Download PDF"
                    onClick={() => handleDownload(paper, 'pdf')}
                  >
                    <Download size={15} />
                  </button>
                  <button
                    className="btn-icon"
                    title="Download Answer Key"
                    onClick={() => handleDownload(paper, 'answer')}
                    style={{ color: 'var(--color-success)' }}
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    className="btn-icon"
                    title="Edit Paper"
                    onClick={() => onEditPaper(paper.id, standard)}
                    style={{ color: 'var(--color-primary)' }}
                  >
                    <Edit size={15} />
                  </button>
                  <button
                    className="btn-icon danger"
                    title="Delete Paper"
                    onClick={() => handleDelete(paper)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassView;