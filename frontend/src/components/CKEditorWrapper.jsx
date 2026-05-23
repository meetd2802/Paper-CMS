import React from 'react';

// Simple rich-text area wrapper (CKEditor optional - uses textarea as fallback)
const CKEditorWrapper = ({ value, onChange, placeholder, rows = 3 }) => {
  return (
    <textarea
      className="form-control"
      rows={rows}
      placeholder={placeholder || 'Enter text here…'}
      value={value || ''}
      onChange={e => onChange && onChange(e.target.value)}
      style={{ fontFamily: 'inherit', fontSize: 13.5 }}
    />
  );
};

export default CKEditorWrapper;