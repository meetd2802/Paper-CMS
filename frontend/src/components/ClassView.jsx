import React, { useState, useEffect } from 'react';
import { Plus, FileText, Trash2, Edit, Download, ArrowLeft, Eye } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const ClassView = ({ standard, activeSubject, onSetSubject, onCreatePaper, onEditPaper, token, user, subjects, showAlert, showConfirm, onBack, onRedirectToPricing }) => {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileInputRef = React.useRef(null);

  const checkPaperLimit = async () => {
    if (user?.role === 'superadmin') return true;

    let limit = 1;
    if (user?.subscription_plan) {
      const expiresAt = user.subscription_expires_at;
      const isActive = !expiresAt || new Date(expiresAt) > new Date();
      if (isActive) {
        limit = user.subscription_plan.paper_limit;
      }
    }

    try {
      const res = await fetch(`${API}/papers`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch paper count');
      const allPapers = await res.json();
      if (allPapers.length >= limit) {
        showAlert(
          'Limit Reached',
          `You have reached your paper creation limit (${limit}). Please purchase or upgrade your subscription plan to continue creating question papers.`,
          'warning'
        );
        if (onRedirectToPricing) {
          onRedirectToPricing();
        }
        return false;
      }
      return true;
    } catch (err) {
      showAlert('Error', 'Unable to verify paper limit. Please try again.', 'error');
      return false;
    }
  };

  const handleImportClick = async () => {
    const allowed = await checkPaperLimit();
    if (allowed) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      showAlert('Invalid File', 'Please upload a PDF or DOCX file.', 'warning');
      return;
    }

    const allowed = await checkPaperLimit();
    if (!allowed) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API}/ai/import-paper`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to scan paper');
      }

      showAlert('Success', 'Paper scanned successfully! Prefilling editor...', 'success');
      onCreatePaper(standard, data);
    } catch (err) {
      showAlert('Import Error', err.message, 'error');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept=".pdf,.docx" 
            onChange={handleFileChange} 
          />
          <button className="btn btn-outline" onClick={handleImportClick} disabled={importing}>
            {importing ? <span className="spinner dark" /> : <Plus size={16} />} Import & Scan Paper
          </button>
          <button
            className="btn btn-primary"
            onClick={async () => {
              const allowed = await checkPaperLimit();
              if (allowed) {
                onCreatePaper(standard);
              }
            }}
            disabled={importing}
          >
            <Plus size={16} /> New Paper
          </button>
        </div>
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
      {importing && (
        <div className="modal-overlay" style={{ zIndex: 1000, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)' }}>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <span className="spinner" style={{ width: 40, height: 40, border: '3px solid white', borderTopColor: 'transparent', display: 'inline-block' }} />
            <h3 style={{ marginTop: 16, fontSize: 16, fontWeight: 600 }}>Scanning & Parsing Paper with AI…</h3>
            <p style={{ marginTop: 8, fontSize: 13, color: 'rgba(255, 255, 255, 0.6)', maxWidth: 320, margin: '8px auto 0 auto' }}>
              Gemini is reading the uploaded document to extract questions, sections, marks, and layout settings.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassView;