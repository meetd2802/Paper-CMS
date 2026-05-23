import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ClassView from './components/ClassView';
import PaperEditor from './components/PaperEditor';
import TeacherManagement from './components/TeacherManagement';
import SubjectManagement from './components/SubjectManagement';

const API = 'http://localhost:8000/api';

// Custom Alert Modal
const AlertModal = ({ alert, onClose }) => {
  if (!alert) return null;
  const colorMap = {
    success: { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
    error: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
    warning: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
    info: { bg: '#eef2ff', color: '#3730a3', border: '#a5b4fc' },
  };
  const style = colorMap[alert.type] || colorMap.info;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>{alert.title}</h3>
        </div>
        <div className="modal-body">
          <div style={{ padding: '12px 16px', borderRadius: 8, background: style.bg, color: style.color, border: `1px solid ${style.border}`, fontSize: 14 }}>
            {alert.message}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  );
};

// Custom Confirm Modal
const ConfirmModal = ({ confirm, onConfirm, onCancel }) => {
  if (!confirm) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>{confirm.title || 'Confirm'}</h3>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{confirm.message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [standards, setStandards] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeStandard, setActiveStandard] = useState(null);
  const [activePaperId, setActivePaperId] = useState(null);
  const [activeSubject, setActiveSubject] = useState(null);

  // Alert & Confirm state
  const [alertData, setAlertData] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  const [confirmCallback, setConfirmCallback] = useState(null);

  const showAlert = (title, message, type = 'info') => {
    setAlertData({ title, message, type });
  };

  const showConfirm = (title, message, callback) => {
    setConfirmData({ title, message });
    setConfirmCallback(() => callback);
  };

  const handleConfirmYes = () => {
    if (confirmCallback) confirmCallback();
    setConfirmData(null);
    setConfirmCallback(null);
  };

  const handleConfirmNo = () => {
    setConfirmData(null);
    setConfirmCallback(null);
  };

  const fetchStandards = async (authToken = token) => {
    try {
      const res = await fetch(`${API}/standards`, { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.ok) setStandards(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchSubjects = async (authToken = token) => {
    try {
      const res = await fetch(`${API}/subjects`, { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.ok) setSubjects(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchProfile = async (authToken) => {
    try {
      const res = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        if (data.must_reset_password) setActiveTab('reset-password');
      } else {
        handleLogout();
      }
    } catch (e) { handleLogout(); }
  };

  useEffect(() => {
    if (token) {
      fetchProfile(token);
      fetchStandards(token);
      fetchSubjects(token);
    }
  }, [token]);

  const handleLoginSuccess = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setActiveTab('dashboard');
  };

  const handleOpenClass = (standard) => {
    setActiveStandard(standard);
    setActiveSubject(null);
    setActiveTab('class');
  };

  const handleOpenEditor = (paperId, standard) => {
    setActivePaperId(paperId);
    setActiveStandard(standard);
    setActiveTab('editor');
  };

  const handleBackFromEditor = () => {
    setActivePaperId(null);
    setActiveTab('class');
    fetchStandards();
  };

  const handleBackFromClass = () => {
    setActiveTab('dashboard');
    setActiveStandard(null);
    setActiveSubject(null);
  };

  if (!token) {
    return (
      <>
        <Login onLoginSuccess={handleLoginSuccess} />
        <AlertModal alert={alertData} onClose={() => setAlertData(null)} />
      </>
    );
  }

  if (activeTab === 'editor') {
    return (
      <>
        <PaperEditor
          paperId={activePaperId}
          standardId={activeStandard?.id}
          standardName={activeStandard?.name}
          onBack={handleBackFromEditor}
          token={token}
          user={user}
          subjects={subjects}
          activeSubject={activeSubject}
          showAlert={showAlert}
          showConfirm={showConfirm}
        />
        <AlertModal alert={alertData} onClose={() => setAlertData(null)} />
        <ConfirmModal confirm={confirmData} onConfirm={handleConfirmYes} onCancel={handleConfirmNo} />
      </>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar
        user={user}
        standards={standards}
        activeTab={activeTab}
        activeStandard={activeStandard}
        onTabChange={setActiveTab}
        onOpenClass={handleOpenClass}
        onLogout={handleLogout}
        token={token}
        fetchStandards={fetchStandards}
        showAlert={showAlert}
        showConfirm={showConfirm}
      />
      <div className="main-content">
        <div className="page-body">
          {activeTab === 'dashboard' && (
            <Dashboard
              standards={standards}
              token={token}
              user={user}
              onOpenClass={handleOpenClass}
            />
          )}
          {activeTab === 'class' && activeStandard && (
            <ClassView
              standard={activeStandard}
              activeSubject={activeSubject}
              onSetSubject={setActiveSubject}
              onCreatePaper={(std) => handleOpenEditor(null, std)}
              onEditPaper={(paperId, std) => handleOpenEditor(paperId, std)}
              token={token}
              user={user}
              subjects={subjects}
              showAlert={showAlert}
              showConfirm={showConfirm}
              onBack={handleBackFromClass}
            />
          )}
          {activeTab === 'teachers' && (
            <TeacherManagement
              standards={standards}
              subjects={subjects}
              token={token}
              showAlert={showAlert}
              showConfirm={showConfirm}
            />
          )}
          {activeTab === 'subjects' && (
            <SubjectManagement
              token={token}
              subjects={subjects}
              fetchSubjects={fetchSubjects}
              showAlert={showAlert}
              showConfirm={showConfirm}
            />
          )}
        </div>
      </div>
      <AlertModal alert={alertData} onClose={() => setAlertData(null)} />
      <ConfirmModal confirm={confirmData} onConfirm={handleConfirmYes} onCancel={handleConfirmNo} />
    </div>
  );
}

export default App;
