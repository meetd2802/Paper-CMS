import React, { useState, useEffect } from 'react';
import { Sparkles, X, Plus } from 'lucide-react';

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

export default function AISuggestModal({ isOpen, onClose, onAddQuestions, paperDetails, board, token, showAlert, targetField, targetQType, isMultiAdd }) {
  const [topic, setTopic] = useState('');
  const [qType, setQType] = useState(board === 'GSEB' ? 'Part A: MCQ (1 Mark)' : 'MCQ (1 Mark)');
  const [count, setCount] = useState(3);
  
  const currentQuestionTypes = board === 'GSEB' ? GSEB_QUESTION_TYPES : CBSE_QUESTION_TYPES;

  useEffect(() => {
    if (isOpen) {
      if (targetField === 'section') {
        setTopic(`Section headers for Class ${paperDetails.className || ''} ${paperDetails.subject || ''}`);
        setQType(board === 'GSEB' ? 'Part A: MCQ (1 Mark)' : 'MCQ (1 Mark)');
        setCount(5);
      } else if (targetQType) {
        const matched = currentQuestionTypes.find(t => t.toLowerCase().includes(targetQType.toLowerCase()) || targetQType.toLowerCase().includes(t.toLowerCase()));
        setQType(matched || targetQType);
        setTopic('');
        setCount(3);
      } else {
        setTopic('');
        setQType(board === 'GSEB' ? 'Part A: MCQ (1 Mark)' : 'MCQ (1 Mark)');
        setCount(3);
      }
    }
  }, [isOpen, targetField, targetQType, board, paperDetails]);
  
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  
  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!topic.trim()) {
      showAlert('Validation', 'Please enter a topic or instruction.', 'warning');
      return;
    }

    setLoading(true);
    setSuggestions([]);

    try {
      const res = await fetch(`${API}/ai/suggest-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          class_name: paperDetails.className,
          subject: paperDetails.subject,
          topic: topic,
          question_type: qType,
          count: count
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to generate questions');
      }

      // Ensure data is array
      if (Array.isArray(data)) {
        setSuggestions(data.map(q => ({
          ...q,
          question_type: qType,
          section: 'Suggested',
        })));
      } else {
        setSuggestions([]);
        showAlert('Error', 'Invalid AI response format.', 'error');
      }
    } catch (err) {
      showAlert('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };


  const handleAddQuestion = (idx) => {
    const q = suggestions[idx];
    onAddQuestions([q], topic, qType);
    if (!isMultiAdd) {
      onClose();
    } else {
      setSuggestions(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const handleAddAll = () => {
    onAddQuestions(suggestions, topic, qType);
    setSuggestions([]);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 600, display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#ffffff' }}>
            <Sparkles size={18} color="var(--color-primary)" />
            {targetField === 'section' ? 'AI Section Suggestions' : 'AI Question Suggestions'}
          </h2>
          <button className="btn-icon" onClick={onClose} style={{ color: 'rgba(255, 255, 255, 0.6)', background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">{targetField === 'section' ? 'Instructions / Section Details' : 'Topic / Focus Area'}</label>
              <input 
                className="form-control" 
                placeholder={targetField === 'section' ? 'e.g. Grammar section with tenses' : "e.g. Newton's laws of motion"}
                value={topic}
                onChange={e => setTopic(e.target.value)}
              />
            </div>
            {targetField !== 'section' && (
              <>
                <div className="form-group">
                  <label className="form-label">Question Type</label>
                  <select className="form-control" value={qType} onChange={e => setQType(e.target.value)}>
                    {currentQuestionTypes.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Number of Questions</label>
                  <input 
                    type="number"
                    className="form-control" 
                    min={1} max={10}
                    value={count}
                    onChange={e => setCount(Number(e.target.value))}
                  />
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
              {loading ? <span className="spinner" /> : <><Sparkles size={15} /> Generate</>}
            </button>
          </div>

          {/* Results */}
          {suggestions.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#ffffff' }}>Generated {targetField === 'section' ? 'Headers' : 'Questions'}</h3>
                {isMultiAdd && (
                  <button className="btn btn-secondary btn-sm" onClick={handleAddAll}>Add All</button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {suggestions.map((q, idx) => (
                  <div key={idx} className="item-card" style={{ border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: 8, padding: 12, background: 'rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1, fontSize: 13 }}>
                        <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#ffffff' }}>{q.question_text}</p>
                        {q.sub_questions && q.sub_questions.length > 0 && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
                            {q.sub_questions.map((sq, i) => (
                              <div key={i} style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                {String.fromCharCode(65 + i)}. {sq.text}
                              </div>
                            ))}
                          </div>
                        )}
                        {q.answer_text && (
                          <p style={{ margin: 0, color: '#34d399', fontWeight: 500 }}>Ans: {q.answer_text}</p>
                        )}
                      </div>
                      {!isMultiAdd ? (
                        <button className="btn btn-primary btn-sm" style={{ alignSelf: 'center' }} onClick={() => handleAddQuestion(idx)}>
                          Use Suggestion
                        </button>
                      ) : (
                        <button className="btn-icon" style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.15)', width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Add to paper" onClick={() => handleAddQuestion(idx)}>
                          <Plus size={16} color="#a5b4fc" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
