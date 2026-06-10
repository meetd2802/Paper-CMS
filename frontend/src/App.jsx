import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ClassView from './components/ClassView';
import PaperEditor from './components/PaperEditor';
import TeacherManagement from './components/TeacherManagement';
import SubjectManagement from './components/SubjectManagement';
import Signup from './components/Signup';
import Profile from './components/Profile';
import ChangePasswordModal from './components/ChangePasswordModal';
import SubscriptionManagement from './components/SubscriptionManagement';
import SubscriptionPlansList from './components/SubscriptionPlansList';


const API = import.meta.env.VITE_API_URL;

// Custom Alert Modal
const AlertModal = ({ alert, onClose }) => {
  if (!alert) return null;
  const colorMap = {
    success: { bg: 'rgba(16, 185, 129, 0.15)', color: '#a7f3d0', border: 'rgba(16, 185, 129, 0.3)' },
    error: { bg: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: 'rgba(239, 68, 68, 0.3)' },
    warning: { bg: 'rgba(245, 158, 11, 0.15)', color: '#fde68a', border: 'rgba(245, 158, 11, 0.3)' },
    info: { bg: 'rgba(99, 102, 241, 0.15)', color: '#c7d2fe', border: 'rgba(99, 102, 241, 0.3)' },
  };
  const style = colorMap[alert.type] || colorMap.info;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{alert.title}</h3>
        </div>
        <div className="modal-body">
          <div style={{ padding: '12px 16px', borderRadius: 8, background: style.bg, color: style.color, border: `1px solid ${style.border}`, fontSize: 14 }}>
            {alert.message}
          </div>
        </div>
        <div className="modal-footer" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
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
        <div className="modal-header" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{confirm.title || 'Confirm'}</h3>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)' }}>{confirm.message}</p>
        </div>
        <div className="modal-footer" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
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
  const [prefilledPaperData, setPrefilledPaperData] = useState(null);
  const [activeSubject, setActiveSubject] = useState(null);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

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

  useEffect(() => {
    if (token) {
      const params = new URLSearchParams(window.location.search);
      const paymentStatus = params.get('payment_status');
      if (paymentStatus) {
        if (paymentStatus === 'success') {
          showAlert('Payment Successful', 'Thank you! Your subscription has been successfully updated.', 'success');
          setActiveTab('pricing');
          fetchProfile(token);
        } else if (paymentStatus === 'failed') {
          showAlert('Payment Failed', 'The payment transaction could not be completed. Please try again.', 'error');
          setActiveTab('pricing');
        }
        
        // Clean up query parameters from browser URL
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: newUrl }, '', newUrl);
      }
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

  const handleOpenEditor = (paperId, standard, prefilledData = null) => {
    setActivePaperId(paperId);
    setActiveStandard(standard);
    setPrefilledPaperData(prefilledData);
    setActiveTab('editor');
  };

  const handleBackFromEditor = () => {
    setActivePaperId(null);
    setPrefilledPaperData(null);
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
        {isSigningUp ? (
          <Signup onGoToLogin={() => setIsSigningUp(false)} showAlert={showAlert} />
        ) : (
          <Login onLoginSuccess={handleLoginSuccess} onGoToSignup={() => setIsSigningUp(true)} />
        )}
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
          standards={standards}
          onBack={handleBackFromEditor}
          token={token}
          user={user}
          subjects={subjects}
          activeSubject={activeSubject}
          showAlert={showAlert}
          showConfirm={showConfirm}
          prefilledData={prefilledPaperData}
          onSave={(pid) => {
            setActivePaperId(pid);
            setPrefilledPaperData(null);
          }}
          onRedirectToPricing={() => {
            setActiveTab('pricing');
            setActivePaperId(null);
          }}
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
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenChangePassword={() => setShowChangePasswordModal(true)}
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
              onCreatePaper={(std, prefilledData) => handleOpenEditor(null, std, prefilledData)}
              onEditPaper={(paperId, std) => handleOpenEditor(paperId, std)}
              token={token}
              user={user}
              subjects={subjects}
              showAlert={showAlert}
              showConfirm={showConfirm}
              onBack={handleBackFromClass}
              onRedirectToPricing={() => setActiveTab('pricing')}
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
              user={user}
              subjects={subjects}
              fetchSubjects={fetchSubjects}
              showAlert={showAlert}
              showConfirm={showConfirm}
            />
          )}
          {activeTab === 'pricing' && (
            <SubscriptionPlansList
              token={token}
              user={user}
              fetchProfile={fetchProfile}
              showAlert={showAlert}
            />
          )}
          {activeTab === 'subscriptions' && (
            <SubscriptionManagement
              token={token}
              user={user}
              showAlert={showAlert}
              showConfirm={showConfirm}
            />
          )}
        </div>
      </div>
      <Profile
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        token={token}
        user={user}
        fetchProfile={fetchProfile}
        showAlert={showAlert}
      />
      <ChangePasswordModal
        isOpen={showChangePasswordModal || (token && user?.must_reset_password)}
        onClose={() => setShowChangePasswordModal(false)}
        token={token}
        user={user}
        fetchProfile={fetchProfile}
        showAlert={showAlert}
        onLogout={handleLogout}
        isFirstLogin={user?.must_reset_password}
      />
      <AlertModal alert={alertData} onClose={() => setAlertData(null)} />
      <ConfirmModal confirm={confirmData} onConfirm={handleConfirmYes} onCancel={handleConfirmNo} />
    </div>
  );
}

export default App;
