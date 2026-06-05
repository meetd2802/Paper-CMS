import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Save, Plus, Trash2, ArrowUp, ArrowDown,
  FileText, Key, RefreshCw, Upload, Download, Sparkles
} from 'lucide-react';
import AISuggestModal from './AISuggestModal';

const API = import.meta.env.VITE_API_URL;

const CBSE_QUESTION_TYPES = [
  'MCQ (1 Mark)',
  'Assertion-Reason',
  'Case-Based / Source-Based',
  'Very Short Answer (2 Marks)',
  'Short Answer (3 Marks)',
  'Long Answer (5 Marks)',
  'Extract-Based Question',
  'Match the Following',
  'Fill in the Blank',
  'True/False',
  'Formal Letter',
  'Analytical Paragraph',
  'Notice / Message / Diary Entry',
  'Diagram / Labeling Question',
  'Map Work'
];

const GSEB_QUESTION_TYPES = [
  'Part A: MCQ (1 Mark)',
  'Very Short Answer (1 Mark)',
  'Short Answer (2 Marks)',
  'Long Answer (3 Marks)',
  'Detailed Answer (5 Marks / 8 Marks)',
  'Fill in the Blank',
  'True/False',
  'Match the Following',
  'Grammar: Opposites (વિરોધી / विलोમ)',
  'Grammar: Synonyms (સમાનાર્થી / पर्यायवाची)',
  'Grammar: Muhavre / Rudhi Prayog',
  'Grammar: Samas / Sandhi',
  'Grammar: translation',
  'Essay Writing',
  'Letter Writing',
  'Paragraph Writing',
  'Translation Question',
  'Map Work'
];

const defaultMCQOptions = () => ['', '', '', ''];

const PaperEditor = ({ paperId, standardId, standardName, standards = [], onBack, token, user, subjects, activeSubject, showAlert, showConfirm }) => {
  // Metadata
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(activeSubject || '');
  const [className, setClassName] = useState(standardName || '');
  const [dateStr, setDateStr] = useState('');
  const [timeDuration, setTimeDuration] = useState('');
  const [maxMarks, setMaxMarks] = useState(25);
  const [instructions, setInstructions] = useState('');
  const [logoPath, setLogoPath] = useState('/uploads/logo.png');

  // Spacing layout states
  const [spacingQuestions, setSpacingQuestions] = useState(12);
  const [spacingSubQuestions, setSpacingSubQuestions] = useState(8);
  const [spacingSections, setSpacingSections] = useState(14);
  const [fontSizeBase, setFontSizeBase] = useState(11);

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
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiSessionMainQIdx, setAiSessionMainQIdx] = useState(null);
  const [aiTargetQIdx, setAiTargetQIdx] = useState(null);
  const [aiTargetSqIdx, setAiTargetSqIdx] = useState(null);
  const [aiTargetField, setAiTargetField] = useState(null);

  const isAdmin = user?.role === 'superadmin';

  const filteredStandards = React.useMemo(() => {
    const currentStandard = standards.find(s => String(s.id) === String(standardId));
    const currentBoard = currentStandard?.board;
    if (!currentBoard) return standards;
    return standards.filter(s => s.board === currentBoard);
  }, [standards, standardId]);

  const currentBoard = React.useMemo(() => {
    const std = standards.find(s => String(s.id) === String(standardId));
    return std?.board || user?.boards?.[0] || 'CBSE';
  }, [standards, standardId, user]);

  const currentQuestionTypes = React.useMemo(() => {
    return currentBoard === 'GSEB' ? GSEB_QUESTION_TYPES : CBSE_QUESTION_TYPES;
  }, [currentBoard]);

  // Subjects available to this user for this standard
  const availableSubjects = React.useMemo(() => {
    if (isAdmin) return subjects;
    // For teachers: prefer assignment-based filtering (admin-assigned subjects per class)
    if (user?.assignments?.length > 0) {
      const assignedNames = user.assignments
        .filter(a => String(a.standard_id) === String(standardId))
        .map(a => a.subject);
      if (assignedNames.length > 0) {
        // Return full subject objects where we have them, else name-only stubs
        return assignedNames.map(name => {
          const found = subjects.find(s => s.name === name);
          return found || { name };
        });
      }
    }
    // Fallback: show all of the teacher's own subjects filtered by the current board
    if (subjects.length > 0) {
      return currentBoard ? subjects.filter(s => s.board === currentBoard) : subjects;
    }
    return [];
  }, [user, standardId, subjects, isAdmin, currentBoard]);

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

        if (data.structure_json) {
          const struct = typeof data.structure_json === 'string' ? JSON.parse(data.structure_json) : data.structure_json;
          if (struct.spacing_questions !== undefined) setSpacingQuestions(struct.spacing_questions);
          if (struct.spacing_sub_questions !== undefined) setSpacingSubQuestions(struct.spacing_sub_questions);
          if (struct.spacing_sections !== undefined) setSpacingSections(struct.spacing_sections);
          if (struct.font_size_base !== undefined) setFontSizeBase(struct.font_size_base);
        }

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
    const defaultType = currentBoard === 'GSEB' ? 'Part A: MCQ (1 Mark)' : 'MCQ (1 Mark)';
    setQuestions(prev => [...prev, {
      id: null,
      section: '',
      question_type: defaultType,
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

  const handleOpenAISuggestGeneral = () => {
    setAiSessionMainQIdx(null);
    setAiTargetQIdx(null);
    setAiTargetSqIdx(null);
    setAiTargetField(null);
    setIsAIModalOpen(true);
  };

  const handleOpenAISuggestForQuestion = (idx) => {
    setAiSessionMainQIdx(null);
    setAiTargetQIdx(idx);
    setAiTargetSqIdx(null);
    setAiTargetField(null);
    setIsAIModalOpen(true);
  };

  const handleOpenAISuggestForSubQuestion = (idx, si) => {
    setAiSessionMainQIdx(null);
    setAiTargetQIdx(idx);
    setAiTargetSqIdx(si);
    setAiTargetField(null);
    setIsAIModalOpen(true);
  };

  const handleOpenAISuggestForSection = (idx) => {
    setAiSessionMainQIdx(null);
    setAiTargetQIdx(idx);
    setAiTargetSqIdx(null);
    setAiTargetField('section');
    setIsAIModalOpen(true);
  };

  const handleOpenAISuggestForSubQuestions = (idx) => {
    setAiSessionMainQIdx(null);
    setAiTargetQIdx(idx);
    setAiTargetSqIdx(null);
    setAiTargetField('sub_questions');
    setIsAIModalOpen(true);
  };

  const handleAISuggestionsAdded = (newQuestions, topic, qType) => {
    // Check if we are replacing/populating an existing target
    if (aiTargetField === 'section') {
      if (aiTargetQIdx !== null) {
        const suggestedHeader = newQuestions[0]?.question_text || '';
        updateQuestion(aiTargetQIdx, 'section', suggestedHeader);
      }
      return;
    }

    if (aiTargetField === 'sub_questions') {
      if (aiTargetQIdx !== null) {
        const convertedSubs = newQuestions.map(q => {
          const isMCQ = q.question_type?.includes('MCQ') || (q.sub_questions && q.sub_questions.length > 0);
          return {
            text: q.question_text || '',
            answer: q.answer_text || '',
            type: isMCQ ? 'MCQ' : 'text',
            options: isMCQ && q.sub_questions ? q.sub_questions.map(opt => opt.text || '') : defaultMCQOptions(),
            marks: Number(q.marks) || 1
          };
        });

        setQuestions(prev => {
          const updated = [...prev];
          if (updated[aiTargetQIdx]) {
            const existingSubs = updated[aiTargetQIdx].sub_questions || [];
            const addedMarks = convertedSubs.reduce((sum, s) => sum + s.marks, 0);
            updated[aiTargetQIdx] = {
              ...updated[aiTargetQIdx],
              sub_questions: [...existingSubs, ...convertedSubs],
              marks: Number(updated[aiTargetQIdx].marks || 0) + addedMarks
            };
          }
          return updated;
        });
      }
      return;
    }

    if (aiTargetQIdx !== null) {
      const q = newQuestions[0];
      if (!q) return;

      if (aiTargetSqIdx !== null) {
        // Overwrite the specific sub-question
        const isMCQ = q.question_type?.includes('MCQ') || (q.sub_questions && q.sub_questions.length > 0);
        const newSubObj = {
          text: q.question_text || '',
          answer: q.answer_text || '',
          type: isMCQ ? 'MCQ' : 'text',
          options: isMCQ && q.sub_questions ? q.sub_questions.map(opt => opt.text || '') : defaultMCQOptions(),
          marks: Number(q.marks) || 1
        };
        
        setQuestions(prev => {
          const updated = [...prev];
          if (updated[aiTargetQIdx]) {
            const subs = [...(updated[aiTargetQIdx].sub_questions || [])];
            subs[aiTargetSqIdx] = newSubObj;
            updated[aiTargetQIdx] = { ...updated[aiTargetQIdx], sub_questions: subs };
          }
          return updated;
        });
      } else {
        // Overwrite the main question
        const isMCQ = q.question_type?.includes('MCQ') || (q.sub_questions && q.sub_questions.length > 0);
        let newSubs = [];
        if (isMCQ) {
          newSubs = q.sub_questions ? q.sub_questions.map(opt => ({ text: opt.text || '', answer: '', type: 'text', options: defaultMCQOptions() })) : [];
        } else if (q.sub_questions && q.sub_questions.length > 0) {
          newSubs = q.sub_questions.map(sq => ({
            text: sq.text || '',
            answer: sq.answer || '',
            type: sq.type || 'text',
            options: sq.options || defaultMCQOptions(),
            marks: sq.marks || 1
          }));
        }

        setQuestions(prev => {
          const updated = [...prev];
          if (updated[aiTargetQIdx]) {
            updated[aiTargetQIdx] = {
              ...updated[aiTargetQIdx],
              question_text: q.question_text || '',
              answer_text: q.answer_text || '',
              marks: Number(q.marks) || 1,
              sub_questions: newSubs
            };
          }
          return updated;
        });
      }
      return;
    }

    // General Suggest: Group suggestions as subquestions of a single main question
    const convertedSubs = newQuestions.map(q => {
      const isMCQ = q.question_type?.includes('MCQ') || (q.sub_questions && q.sub_questions.length > 0);
      return {
        text: q.question_text || '',
        answer: q.answer_text || '',
        type: isMCQ ? 'MCQ' : 'text',
        options: isMCQ && q.sub_questions ? q.sub_questions.map(opt => opt.text || '') : defaultMCQOptions(),
        marks: Number(q.marks) || 1
      };
    });

    if (aiSessionMainQIdx !== null && questions[aiSessionMainQIdx]) {
      // Append to the existing main question in this session
      const existingMain = questions[aiSessionMainQIdx];
      const updatedSubs = [...(existingMain.sub_questions || []), ...convertedSubs];
      const addedMarks = convertedSubs.reduce((sum, s) => sum + s.marks, 0);
      
      setQuestions(prev => {
        const updated = [...prev];
        updated[aiSessionMainQIdx] = {
          ...updated[aiSessionMainQIdx],
          sub_questions: updatedSubs,
          marks: Number(updated[aiSessionMainQIdx].marks || 0) + addedMarks
        };
        return updated;
      });
    } else {
      // Create a new main question
      const addedMarks = convertedSubs.reduce((sum, s) => sum + s.marks, 0);
      const mainText = topic ? `Answer the following questions based on: ${topic}` : 'Answer the following questions:';
      
      const newMainQ = {
        id: null,
        section: newQuestions[0]?.section || '',
        question_type: 'Short Answer', // So it renders its subquestions
        question_text: mainText,
        answer_text: '',
        marks: addedMarks,
        display_order: questions.length,
        sub_questions: convertedSubs
      };

      setQuestions(prev => {
        const updated = [...prev, newMainQ];
        // Save the index of the newly added question for subsequent adds in this session
        setAiSessionMainQIdx(updated.length - 1);
        return updated;
      });
    }
  };

  // Sub-questions
  const addSubQuestion = (qIdx) => {
    const q = questions[qIdx];
    if (q.question_type === 'MCQ') {
      const mainOptions = (q.sub_questions || []).map(sq => sq.text || '');
      const firstSub = {
        text: q.question_text || 'Sub-question 1',
        answer: q.answer_text || '',
        type: 'MCQ',
        options: mainOptions.length ? mainOptions : defaultMCQOptions(),
        marks: Number(q.marks) || 1
      };
      const secondSub = {
        text: '',
        answer: '',
        type: 'text',
        options: defaultMCQOptions(),
        marks: 1
      };
      setQuestions(prev => {
        const updated = [...prev];
        updated[qIdx] = {
          ...updated[qIdx],
          question_type: 'Short Answer',
          question_text: q.question_text || q.section || 'Choose the correct options:',
          answer_text: '',
          sub_questions: [firstSub, secondSub]
        };
        return updated;
      });
    } else {
      updateQuestion(qIdx, 'sub_questions', [
        ...(q.sub_questions || []),
        { text: '', answer: '', type: 'text', options: defaultMCQOptions() }
      ]);
    }
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
        structure_json: {
          spacing_questions: Number(spacingQuestions),
          spacing_sub_questions: Number(spacingSubQuestions),
          spacing_sections: Number(spacingSections),
          font_size_base: Number(fontSizeBase)
        }
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

  const handleFormat = (id, beforeText, afterText, onUpdate) => {
    const textarea = document.getElementById(id);
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = beforeText + selectedText + afterText;
    const newValue = text.substring(0, start) + replacement + text.substring(end);
    
    onUpdate(newValue);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + beforeText.length, start + beforeText.length + selectedText.length);
    }, 0);
  };

  const FormattingToolbar = ({ textareaId, value, onChange }) => {
    const mathSymbols = ['√', 'π', 'θ', '±', '×', '÷', '≠', '≤', '≥', '²', '³', '1/3', '1/2', '1/4', 'α', 'β', 'γ', 'Δ', '∠', '∴'];

    return (
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4, padding: '4px 6px', background: '#f8fafc', border: '1px solid var(--border-color)', borderBottom: 'none', borderTopLeftRadius: 6, borderTopRightRadius: 6, alignItems: 'center' }}>
        <button
          type="button"
          className="btn-xs"
          style={{ fontWeight: 'bold' }}
          onClick={() => handleFormat(textareaId, '<b>', '</b>', onChange)}
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          className="btn-xs"
          style={{ fontStyle: 'italic' }}
          onClick={() => handleFormat(textareaId, '<i>', '</i>', onChange)}
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          className="btn-xs"
          onClick={() => handleFormat(textareaId, '<sub>', '</sub>', onChange)}
          title="Subscript"
        >
          X<sub>a</sub>
        </button>
        <button
          type="button"
          className="btn-xs"
          onClick={() => handleFormat(textareaId, '<sup>', '</sup>', onChange)}
          title="Superscript"
        >
          X<sup>a</sup>
        </button>
        <div style={{ width: 1, height: 16, background: 'var(--border-color)', margin: '0 4px' }} />
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-secondary)', marginRight: 4 }}>Math:</span>
        {mathSymbols.map(sym => (
          <button
            key={sym}
            type="button"
            className="btn-xs"
            onClick={() => handleFormat(textareaId, sym, '', onChange)}
          >
            {sym}
          </button>
        ))}
      </div>
    );
  };

  // Debounced Live Preview
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      const fetchPreview = async () => {
        setPreviewLoading(true);
        try {
          const payload = {
            title: title || 'Untitled Paper',
            subject: subject || 'General',
            class_name: className || '',
            date_str: dateStr || '',
            time_duration: timeDuration || '',
            max_marks: Number(maxMarks) || 25,
            logo_path: logoPath || '',
            instructions: instructions || '',
            questions: questions.map(q => ({
              section: q.section || '',
              question_type: q.question_type || 'Short Answer',
              question_text: q.question_text || '',
              answer_text: q.answer_text || '',
              marks: Number(q.marks) || 0,
              sub_questions: (q.sub_questions || []).map(sq => ({
                text: sq.text || '',
                answer: sq.answer || '',
                type: sq.type || 'text',
                options: sq.options || [],
                marks: Number(sq.marks) || 0
              }))
            })),
            is_answer_key: previewType === 'answer',
            structure_json: {
              spacing_questions: Number(spacingQuestions),
              spacing_sub_questions: Number(spacingSubQuestions),
              spacing_sections: Number(spacingSections),
              font_size_base: Number(fontSizeBase)
            }
          };

          const res = await fetch(`${API}/papers/preview-pdf`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            const blob = await res.blob();
            if (previewUrl) {
              URL.revokeObjectURL(previewUrl);
            }
            setPreviewUrl(URL.createObjectURL(blob));
          }
        } catch (e) {
          console.error(e);
        } finally {
          setPreviewLoading(false);
        }
      };
      fetchPreview();
    }, 600);

    return () => clearTimeout(delayDebounce);
  }, [
    title, subject, className, dateStr, timeDuration, maxMarks,
    logoPath, instructions, questions, previewType,
    spacingQuestions, spacingSubQuestions, spacingSections, fontSizeBase
  ]);

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
              <label className="form-label">Class / Standard *</label>
              <select 
                className="form-control" 
                value={className} 
                onChange={e => setClassName(e.target.value)}
                required
              >
                <option value="">-- Select Class --</option>
                {filteredStandards.map(std => (
                  <option key={std.id} value={std.name}>{std.name}</option>
                ))}
              </select>
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
              <FormattingToolbar
                textareaId="instructions-editor"
                value={instructions}
                onChange={setInstructions}
              />
              <textarea
                id="instructions-editor"
                className="form-control"
                rows={3}
                style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
                placeholder="General instructions for the paper…"
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Formatting & Spacing Details */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">Formatting & Spacing (pt)</span>
          </div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Base Font Size:</span>
                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{fontSizeBase}pt</span>
              </label>
              <input type="range" min={8} max={18} value={fontSizeBase} onChange={e => setFontSizeBase(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--color-primary)' }} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Question Spacing:</span>
                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{spacingQuestions}pt</span>
              </label>
              <input type="range" min={4} max={30} value={spacingQuestions} onChange={e => setSpacingQuestions(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--color-primary)' }} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Sub-Question Spacing:</span>
                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{spacingSubQuestions}pt</span>
              </label>
              <input type="range" min={2} max={20} value={spacingSubQuestions} onChange={e => setSpacingSubQuestions(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--color-primary)' }} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Section Spacing:</span>
                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{spacingSections}pt</span>
              </label>
              <input type="range" min={4} max={40} value={spacingSections} onChange={e => setSpacingSections(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--color-primary)' }} />
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Questions ({questions.length})</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm" onClick={handleOpenAISuggestGeneral} style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>
                <Sparkles size={14} /> Suggest Questions
              </button>
              <button className="btn btn-primary btn-sm" onClick={addQuestion}>
                <Plus size={14} /> Add Question
              </button>
            </div>
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
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'center' }}>
                      <select
                        className="form-control"
                        style={{ fontSize: 12.5, padding: '5px 9px' }}
                        value={q.question_type || (currentBoard === 'GSEB' ? 'Part A: MCQ (1 Mark)' : 'MCQ (1 Mark)')}
                        onChange={e => updateQuestion(idx, 'question_type', e.target.value)}
                      >
                        {currentQuestionTypes.map(t => <option key={t}>{t}</option>)}
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <label className="form-label" style={{ fontSize: 12, margin: 0 }}>Question Text</label>
                        <button
                          type="button"
                          className="btn-link"
                          style={{ fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          onClick={() => handleOpenAISuggestForQuestion(idx)}
                        >
                          <Sparkles size={11} /> Suggest Question
                        </button>
                      </div>
                      <FormattingToolbar
                        textareaId={`q-text-${idx}`}
                        value={q.question_text || ''}
                        onChange={val => updateQuestion(idx, 'question_text', val)}
                      />
                      <textarea
                        id={`q-text-${idx}`}
                        className="form-control"
                        rows={2}
                        style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
                        placeholder="Enter question here…"
                        value={q.question_text || ''}
                        onChange={e => updateQuestion(idx, 'question_text', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <label className="form-label" style={{ fontSize: 12, margin: 0 }}>Section Header (optional, e.g. Section A, Choose the correct options)</label>
                        <button
                          type="button"
                          className="btn-link"
                          style={{ fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          onClick={() => handleOpenAISuggestForSection(idx)}
                        >
                          <Sparkles size={11} /> Suggest Header
                        </button>
                      </div>
                      <input
                        className="form-control"
                        style={{ fontSize: 12.5 }}
                        placeholder="e.g. SECTION A or Part 1"
                        value={q.section || ''}
                        onChange={e => updateQuestion(idx, 'section', e.target.value)}
                      />
                    </div>

                    {/* MCQ options */}
                    {q.question_type === 'MCQ' && (
                      <div>
                        <label className="form-label" style={{ fontSize: 12, marginBottom: 6 }}>MCQ Options</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          {Array.from({ length: 4 }).map((_, si) => {
                            const sq = q.sub_questions?.[si] || { text: '' };
                            return (
                              <div key={si} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', minWidth: 20 }}>
                                  {String.fromCharCode(65 + si)}.
                                </span>
                                <input
                                  className="form-control"
                                  style={{ fontSize: 12.5 }}
                                  placeholder={`Option ${String.fromCharCode(65 + si)}`}
                                  value={sq.text || ''}
                                  onChange={e => {
                                    const newSubs = [...(q.sub_questions || [])];
                                    while (newSubs.length <= si) {
                                      newSubs.push({ text: '', answer: '', type: 'text', options: defaultMCQOptions() });
                                    }
                                    newSubs[si] = { ...newSubs[si], text: e.target.value };
                                    updateQuestion(idx, 'sub_questions', newSubs);
                                  }}
                                />
                              </div>
                            );
                          })}
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
                              <div key={si} style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'flex-start' }}>
                                <span style={{ fontSize: 12, fontWeight: 700, minWidth: 22, paddingTop: 8, color: 'var(--color-primary)' }}>
                                  {si + 1}.
                                </span>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                  <FormattingToolbar
                                    textareaId={`sq-text-${idx}-${si}`}
                                    value={sq.text || ''}
                                    onChange={val => updateSubQuestion(idx, si, 'text', val)}
                                  />
                                  <textarea
                                    id={`sq-text-${idx}-${si}`}
                                    className="form-control"
                                    rows={2}
                                    style={{ fontSize: 12.5, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
                                    placeholder="Sub-question text…"
                                    value={sq.text || ''}
                                    onChange={e => updateSubQuestion(idx, si, 'text', e.target.value)}
                                  />
                                  
                                  {/* MCQ Options for Sub-Question */}
                                  {sq.type === 'MCQ' && (
                                    <>
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8, paddingLeft: 12, borderLeft: '2px solid var(--border-color)' }}>
                                        {(sq.options || defaultMCQOptions()).map((opt, optIdx) => (
                                          <div key={optIdx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
                                              {String.fromCharCode(97 + optIdx)}.
                                            </span>
                                            <input
                                              className="form-control"
                                              style={{ fontSize: 12, padding: '4px 8px' }}
                                              placeholder={`Option ${String.fromCharCode(97 + optIdx)}`}
                                              value={opt || ''}
                                              onChange={e => {
                                                const newOpts = [...(sq.options || defaultMCQOptions())];
                                                newOpts[optIdx] = e.target.value;
                                                updateSubQuestion(idx, si, 'options', newOpts);
                                              }}
                                            />
                                          </div>
                                        ))}
                                      </div>
                                      <div style={{ marginTop: 8, paddingLeft: 12 }}>
                                        <label className="form-label" style={{ fontSize: 11 }}>Correct Option / Answer</label>
                                        <input
                                          className="form-control"
                                          style={{ fontSize: 12, padding: '4px 8px' }}
                                          placeholder="e.g. a or text"
                                          value={sq.answer || ''}
                                          onChange={e => updateSubQuestion(idx, si, 'answer', e.target.value)}
                                        />
                                      </div>
                                    </>
                                  )}
                                  
                                  {/* Answer Key Points for Text type */}
                                  {sq.type !== 'MCQ' && (
                                    <div style={{ marginTop: 6 }}>
                                      <input
                                        className="form-control"
                                        style={{ fontSize: 11.5, padding: '4px 8px' }}
                                        placeholder="Answer / Key points (for answer key PDF)…"
                                        value={sq.answer || ''}
                                        onChange={e => updateSubQuestion(idx, si, 'answer', e.target.value)}
                                      />
                                    </div>
                                  )}
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 100, marginTop: 4 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <label style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 35 }}>Marks:</label>
                                    <input
                                      type="number"
                                      className="form-control"
                                      style={{ width: 45, fontSize: 12, padding: '4px 6px' }}
                                      min={0}
                                      value={sq.marks || 0}
                                      onChange={e => updateSubQuestion(idx, si, 'marks', Number(e.target.value))}
                                    />
                                  </div>
                                  <select
                                    className="form-control"
                                    style={{ fontSize: 11, padding: '2px 4px', height: 24 }}
                                    value={sq.type || 'text'}
                                    onChange={e => updateSubQuestion(idx, si, 'type', e.target.value)}
                                  >
                                    <option value="text">Text type</option>
                                    <option value="MCQ">MCQ type</option>
                                  </select>
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                                  <button
                                    type="button"
                                    className="btn-icon"
                                    style={{ color: 'var(--color-primary)' }}
                                    title="Suggest Sub-question"
                                    onClick={() => handleOpenAISuggestForSubQuestion(idx, si)}
                                  >
                                    <Sparkles size={13} />
                                  </button>
                                  <button className="btn-icon danger" style={{ marginTop: 0 }} onClick={() => removeSubQuestion(idx, si)}>
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                      </>
                    )}

                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 12 }}
                        onClick={() => addSubQuestion(idx)}
                      >
                        <Plus size={12} /> Add Sub-Question
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: 12, color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
                        onClick={() => handleOpenAISuggestForSubQuestions(idx)}
                      >
                        <Sparkles size={12} /> Suggest Sub-questions
                      </button>
                    </div>
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
              <p>Type paper details to see preview</p>
            </div>
          )}
        </div>
      </div>

      <AISuggestModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        token={token}
        showAlert={showAlert}
        paperDetails={{ className, subject }}
        board={currentBoard}
        onAddQuestions={handleAISuggestionsAdded}
        targetField={aiTargetField}
        targetQType={
          aiTargetField === 'section'
            ? null
            : aiTargetField === 'sub_questions'
            ? (questions[aiTargetQIdx]?.sub_questions?.[0]?.type === 'MCQ' || questions[aiTargetQIdx]?.question_type?.includes('MCQ') ? 'MCQ' : (questions[aiTargetQIdx]?.question_type || 'Short Answer'))
            : aiTargetSqIdx !== null
            ? (questions[aiTargetQIdx]?.sub_questions?.[aiTargetSqIdx]?.type === 'MCQ' ? 'MCQ' : 'Short Answer')
            : aiTargetQIdx !== null
            ? questions[aiTargetQIdx]?.question_type
            : null
        }
        isMultiAdd={aiTargetQIdx === null || aiTargetField === 'sub_questions'}
      />
    </div>
  );
};

export default PaperEditor;