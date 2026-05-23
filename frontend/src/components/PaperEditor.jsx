import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Save, Plus, Trash2, ArrowUp, ArrowDown,
  FileText, Key, RefreshCw, Upload, Download
} from 'lucide-react';

const API = 'http://localhost:8000/api';

const QUESTION_TYPES = ['Short Answer', 'Long Answer', 'MCQ', 'Fill in the Blank', 'True/False', 'Match the Following', 'Image Question'];

const defaultMCQOptions = () => ['', '', '', ''];

const PaperEditor = ({ paperId, standardId, standardName, onBack, token, user, subjects, activeSubject, showAlert, showConfirm }) => {
  // Metadata
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(activeSubject || '');
  const [className, setClassName] = useState(standardName || '');
  const [dateStr, setDateStr] = useState('');
  const [timeDuration, setTimeDuration] = useState('');
  const [maxMarks, setMaxMarks] = useState(25);
  const [instructions, setInstructions] = useState('');
  const [logoPath, setLogoPath] = useState('/uploads/logo.png');

  // Questions
  const [questions, setQuestions] = useState([]);
  const [deletedIds, setDeletedIds] = useState([]);

  // UI
  const [loading, setLoading] = useState(!!paperId);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState('paper'); // 'paper' | 'answer'
  const [refreshPreview, setRefreshPreview] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const logoInputRef = useRef();

  const isAdmin = user?.role === 'superadmin';

  // Subjects available to this user for this standard
  const availableSubjects = React.useMemo(() => {
    if (isAdmin) return subjects;
    if (!user?.assignments) return [];
    return user.assignments
      .filter(a => String(a.standard_id) === String(standardId))
      .map(a => ({ name: a.subject }));
  }, [user, standardId, subjects, isAdmin]);

  // Load paper if editing
  useEffect(() => {
    if (!paperId) {
      // New paper: pre-fill instructions from subject
      if (subject && subjects.length) {
        const sub = subjects.find(s => s.name === subject);
        if (sub?.default_instructions) setInstructions(sub.default_instructions);
      }
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/papers/${paperId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load paper');
        const data = await res.json();
        setTitle(data.title || '');
        setSubject(data.subject || '');
        setClassName(data.class_name || standardName || '');
        setDateStr(data.date_str || '');
        setTimeDuration(data.time_duration || '');
        setMaxMarks(data.max_marks || 25);
        setInstructions(data.instructions || '');
        setLogoPath(data.logo_path || '/uploads/logo.png');

        // Load questions
        const qRes = await fetch(`${API}/questions/paper/${paperId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (qRes.ok) {
          const qs = await qRes.json();
          setQuestions(qs.map(q => ({
            ...q,
            sub_questions: q.sub_questions || [],
          })));
        }
      } catch (err) {
        showAlert('Error', err.message, 'error');
      }
      setLoading(false);
    };
    load();
  }, [paperId]);

  // Auto-fill instructions when subject changes (new paper only)
  useEffect(() => {
    if (paperId) return;
    if (!subject) return;
    const sub = subjects.find(s => s.name === subject);
    if (sub?.default_instructions) {
      setInstructions(sub.default_instructions);
    }
  }, [subject]);

  const addQuestion = () => {
    setQuestions(prev => [...prev, {
      id: null,
      section: '',
      question_type: 'Short Answer',
      question_text: '',
      answer_text: '',
      marks: 1,
      display_order: prev.length,
      sub_questions: [],
    }]);
  };

  const updateQuestion = (idx, field, value) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const removeQuestion = (idx) => {
    const q = questions[idx];
    if (q.id) setDeletedIds(prev => [...prev, q.id]);
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const moveQuestion = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= questions.length) return;
    setQuestions(prev => {
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  // Sub-questions
  const addSubQuestion = (qIdx) => {
    updateQuestion(qIdx, 'sub_questions', [
      ...(questions[qIdx].sub_questions || []),
      { text: '', answer: '', type: 'text', options: defaultMCQOptions() }
    ]);
  };

  const updateSubQuestion = (qIdx, sIdx, field, value) => {
    const subs = [...(questions[qIdx].sub_questions || [])];
    subs[sIdx] = { ...subs[sIdx], [field]: value };
    updateQuestion(qIdx, 'sub_questions', subs);
  };

  const removeSubQuestion = (qIdx, sIdx) => {
    const subs = (questions[qIdx].sub_questions || []).filter((_, i) => i !== sIdx);
    updateQuestion(qIdx, 'sub_questions', subs);
  };

  // Logo upload
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API}/uploads/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      setLogoPath(data.path);
      showAlert('Success', 'Logo uploaded!', 'success');
    } catch (err) {
      showAlert('Error', err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  // Save
  const handleSave = async () => {
    if (!title.trim()) { showAlert('Validation', 'Paper title is required.', 'warning'); return; }
    if (!subject.trim()) { showAlert('Validation', 'Subject is required.', 'warning'); return; }

    setSaving(true);
    try {
      let pid = paperId;

      const paperPayload = {
        standard_id: standardId,
        title: title.trim(),
        subject: subject.trim(),
        class_name: className.trim() || standardName,
        date_str: dateStr,
        time_duration: timeDuration,
        max_marks: Number(maxMarks) || 25,
        logo_path: logoPath,
        instructions: instructions,
      };

      if (!pid) {
        // Create
        const res = await fetch(`${API}/papers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(paperPayload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to create paper');
        pid = data.id;
      } else {
        // Update
        const res = await fetch(`${API}/papers/${pid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(paperPayload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || 'Failed to update paper');
        }
      }

      // Delete removed questions
      for (const qid of deletedIds) {
        await fetch(`${API}/questions/${qid}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      }
      setDeletedIds([]);

      // Save questions in order
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const qPayload = {
          section: q.section || '',
          question_type: q.question_type || 'Short Answer',
          question_text: q.question_text || '',
          answer_text: q.answer_text || '',
          marks: Number(q.marks) || 1,
          display_order: i,
          sub_questions: q.sub_questions || [],
        };
        if (q.id) {
          await fetch(`${API}/questions/${q.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(qPayload),
          });
        } else {
          const res = await fetch(`${API}/questions/paper/${pid}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(qPayload),
          });
          if (res.ok) {
            const created = await res.json();
            setQuestions(prev => {
              const arr = [...prev];
              arr[i] = { ...arr[i], id: created.id };
              return arr;
            });
          }
        }
      }

      showAlert('Saved', 'Paper saved successfully!', 'success');
      // Refresh preview
      setRefreshPreview(v => v + 1);
    } catch (err) {
      showAlert('Error', err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Download
  const handleDownload = async (type = 'paper') => {
    try {
      const pid = paperId;
      if (!pid) { showAlert('Info', 'Save the paper first before downloading.', 'info'); return; }
      const url = type === 'answer' ? `${API}/papers/${pid}/answer-key-pdf` : `${API}/papers/${pid}/pdf`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to generate PDF');
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${title || 'paper'}_${type}.pdf`;
      link.click();
    } catch (err) {
      showAlert('Error', err.message, 'error');
    }
  };

  // Preview
  useEffect(() => {
    if (!paperId) return;
    const fetchPreview = async () => {
      setPreviewLoading(true);
      try {
        const url = previewType === 'answer'
          ? `${API}/papers/${paperId}/answer-key-pdf`
          : `${API}/papers/${paperId}/preview-pdf`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const blob = await res.blob();
          setPreviewUrl(URL.createObjectURL(blob));
        }
      } catch (e) { console.error(e); }
      setPreviewLoading(false);
    };
    fetchPreview();
  }, [paperId, refreshPreview, previewType]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <span className="spinner dark" style={{ width: 32, height: 32 }} />
          <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>Loading paper…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-app)' }}>
      {/* Left: Editor */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24, minWidth: 0 }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={onBack}>
              <ArrowLeft size={15} /> Back
            </button>
            <h1 style={{ fontSize: 18, fontWeight: 700 }}>{paperId ? 'Edit Paper' : 'New Paper'}</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {paperId && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDownload('paper')}>
                  <Download size={14} /> PDF
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDownload('answer')}>
                  <Key size={14} /> Answer Key
                </button>
              </>
            )}
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <span className="spinner" /> : <><Save size={15} /> Save</>}
            </button>
          </div>
        </div>

        {/* Metadata Card */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">Paper Details</span>
          </div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Paper Title *</label>
              <input className="form-control" placeholder="e.g. Unit Test 1 - Mathematics" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Subject *</label>
              <select className="form-control" value={subject} onChange={e => setSubject(e.target.value)}>
                <option value="">-- Select Subject --</option>
                {availableSubjects.map(s => <option key={s.id || s.name} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Class / Standard</label>
              <input className="form-control" value={className} onChange={e => setClassName(e.target.value)} placeholder={standardName} />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-control" placeholder="e.g. 12 June 2025" value={dateStr} onChange={e => setDateStr(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Time Duration</label>
              <input className="form-control" placeholder="e.g. 2 Hours" value={timeDuration} onChange={e => setTimeDuration(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Max Marks</label>
              <input className="form-control" type="number" min={1} value={maxMarks} onChange={e => setMaxMarks(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Logo</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="file" accept="image/*" ref={logoInputRef} style={{ display: 'none' }} onChange={handleLogoUpload} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => logoInputRef.current?.click()} disabled={uploading}>
                  <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload Logo'}
                </button>
                {logoPath && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{logoPath.split('/').pop()}</span>}
              </div>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Instructions</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="General instructions for the paper…"
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Questions ({questions.length})</span>
            <button className="btn btn-primary btn-sm" onClick={addQuestion}>
              <Plus size={14} /> Add Question
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <FileText size={40} />
              <p>No questions yet. Click "Add Question" to begin.</p>
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {questions.map((q, idx) => (
                <div key={idx} style={{ margin: '12px 20px', border: '1.5px solid var(--border-color)', borderRadius: 10, overflow: 'hidden', background: 'white' }}>
                  {/* Question header */}
                  <div style={{ background: 'var(--bg-app)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-primary)', minWidth: 28 }}>Q{idx + 1}</span>
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 10, alignItems: 'center' }}>
                      <input
                        className="form-control"
                        style={{ fontSize: 12.5, padding: '5px 9px' }}
                        placeholder="Section (optional, e.g. Section A)"
                        value={q.section || ''}
                        onChange={e => updateQuestion(idx, 'section', e.target.value)}
                      />
                      <select
                        className="form-control"
                        style={{ fontSize: 12.5, padding: '5px 9px' }}
                        value={q.question_type || 'Short Answer'}
                        onChange={e => updateQuestion(idx, 'question_type', e.target.value)}
                      >
                        {QUESTION_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <label style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Marks:</label>
                        <input
                          type="number"
                          className="form-control"
                          style={{ width: 56, fontSize: 12.5, padding: '5px 9px' }}
                          min={0}
                          value={q.marks || 1}
                          onChange={e => updateQuestion(idx, 'marks', e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-icon" onClick={() => moveQuestion(idx, -1)} title="Move Up" disabled={idx === 0}><ArrowUp size={14} /></button>
                        <button className="btn-icon" onClick={() => moveQuestion(idx, 1)} title="Move Down" disabled={idx === questions.length - 1}><ArrowDown size={14} /></button>
                        <button className="btn-icon danger" onClick={() => removeQuestion(idx)} title="Remove"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>

                  {/* Question body */}
                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: 12 }}>Question Text</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        placeholder="Enter question here…"
                        value={q.question_text || ''}
                        onChange={e => updateQuestion(idx, 'question_text', e.target.value)}
                      />
                    </div>

                    {/* MCQ options */}
                    {q.question_type === 'MCQ' && (
                      <div>
                        <label className="form-label" style={{ fontSize: 12, marginBottom: 6 }}>MCQ Options</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          {(q.sub_questions?.length ? q.sub_questions : [{ text: '', answer: '', type: 'text', options: defaultMCQOptions() }]).map((sq, si) => (
                            <div key={si} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', minWidth: 20 }}>
                                {String.fromCharCode(65 + si)}.
                              </span>
                              <input
                                className="form-control"
                                style={{ fontSize: 12.5 }}
                                placeholder={`Option ${String.fromCharCode(65 + si)}`}
                                value={sq.text || ''}
                                onChange={e => updateSubQuestion(idx, si, 'text', e.target.value)}
                              />
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <label className="form-label" style={{ fontSize: 12 }}>Correct Answer</label>
                          <input
                            className="form-control"
                            style={{ fontSize: 12.5 }}
                            placeholder="e.g. A or Option text"
                            value={q.answer_text || ''}
                            onChange={e => updateQuestion(idx, 'answer_text', e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {/* Sub-questions for non-MCQ */}
                    {q.question_type !== 'MCQ' && (
                      <>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: 12 }}>Answer / Key Points</label>
                          <textarea
                            className="form-control"
                            rows={2}
                            placeholder="Answer key (for answer key PDF)…"
                            value={q.answer_text || ''}
                            onChange={e => updateQuestion(idx, 'answer_text', e.target.value)}
                          />
                        </div>

                        {/* Sub-questions */}
                        {(q.sub_questions || []).length > 0 && (
                          <div style={{ background: 'var(--bg-app)', borderRadius: 8, padding: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>Sub-Questions</div>
                            {q.sub_questions.map((sq, si) => (
                              <div key={si} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                                <span style={{ fontSize: 12, fontWeight: 700, minWidth: 22, paddingTop: 8, color: 'var(--color-primary)' }}>
                                  {si + 1}.
                                </span>
                                <textarea
                                  className="form-control"
                                  rows={2}
                                  style={{ fontSize: 12.5 }}
                                  placeholder="Sub-question text…"
                                  value={sq.text || ''}
                                  onChange={e => updateSubQuestion(idx, si, 'text', e.target.value)}
                                />
                                <button className="btn-icon danger" style={{ marginTop: 4 }} onClick={() => removeSubQuestion(idx, si)}>
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ alignSelf: 'flex-start', fontSize: 12 }}
                          onClick={() => addSubQuestion(idx)}
                        >
                          <Plus size={12} /> Add Sub-Question
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              <div style={{ padding: '12px 20px' }}>
                <button className="btn btn-ghost" onClick={addQuestion}>
                  <Plus size={15} /> Add Another Question
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Preview pane */}
      {paperId && (
        <div style={{ width: 420, borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'white' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Preview</span>
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
              <button
                className={`btn btn-sm ${previewType === 'paper' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setPreviewType('paper')}
              >
                <FileText size={13} /> Paper
              </button>
              <button
                className={`btn btn-sm ${previewType === 'answer' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setPreviewType('answer')}
              >
                <Key size={13} /> Answer Key
              </button>
              <button
                className="btn-icon"
                title="Refresh preview"
                onClick={() => setRefreshPreview(v => v + 1)}
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {previewLoading ? (
              <div style={{ textAlign: 'center' }}>
                <span className="spinner dark" />
                <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>Generating preview…</p>
              </div>
            ) : previewUrl ? (
              <iframe
                src={previewUrl}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="PDF Preview"
              />
            ) : (
              <div className="empty-state">
                <FileText size={40} />
                <p>Save paper to see preview</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaperEditor;