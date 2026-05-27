import React, { useState } from 'react';
import { Sparkles, X, Plus } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const QUESTION_TYPES = [
  'Short Answer',
  'Long Answer',
  'MCQ',
  'Fill in the Blank',
  'True/False',
  'Match the Following',
  'Image Question'
];

export default function AISuggestModal({ isOpen, onClose, onAddQuestions, paperDetails, token, showAlert }) {
  const [topic, setTopic] = useState('');
  const [qType, setQType] = useState('MCQ');
  const [count, setCount] = useState(3);
  
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
    onAddQuestions([q]);
    // Remove it from suggestions so it isn't added twice
    setSuggestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddAll = () => {
    onAddQuestions(suggestions);
    setSuggestions([]);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20
    }}>
      <div style={{
        background: 'white',
        borderRadius: 12,
        width: '100%',
        maxWidth: 600,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="var(--color-primary)" />
            AI Question Suggestions
          </h2>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Topic / Focus Area</label>
              <input 
                className="form-control" 
                placeholder="e.g. Newton's laws of motion"
                value={topic}
                onChange={e => setTopic(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Question Type</label>
              <select className="form-control" value={qType} onChange={e => setQType(e.target.value)}>
                {QUESTION_TYPES.map(t => <option key={t}>{t}</option>)}
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
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Generated Questions</h3>
                <button className="btn btn-ghost btn-sm" onClick={handleAddAll}>Add All</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {suggestions.map((q, idx) => (
                  <div key={idx} style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 12, background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1, fontSize: 13 }}>
                        <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>{q.question_text}</p>
                        {q.sub_questions && q.sub_questions.length > 0 && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
                            {q.sub_questions.map((sq, i) => (
                              <div key={i} style={{ color: 'var(--text-secondary)' }}>
                                {String.fromCharCode(65 + i)}. {sq.text}
                              </div>
                            ))}
                          </div>
                        )}
                        <p style={{ margin: 0, color: 'var(--color-success)' }}>Ans: {q.answer_text}</p>
                      </div>
                      <button className="btn-icon" style={{ background: 'white', border: '1px solid var(--border-color)' }} title="Add to paper" onClick={() => handleAddQuestion(idx)}>
                        <Plus size={16} color="var(--color-primary)" />
                      </button>
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
