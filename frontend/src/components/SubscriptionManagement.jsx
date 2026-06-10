import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, Edit, Check, X, ShieldAlert, Award, UserCheck } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const SubscriptionManagement = ({ token, user, showAlert, showConfirm }) => {
  const [plans, setPlans] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('plans'); // plans | user_assignment

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState(0);
  const [newPaperLimit, setNewPaperLimit] = useState(5);
  const [newClassLimit, setNewClassLimit] = useState(3);
  const [newSubjectLimit, setNewSubjectLimit] = useState(5);
  
  // Feature flags
  const [featBranding, setFeatBranding] = useState(true);
  const [featLivePreview, setFeatLivePreview] = useState(false);
  const [featAISuggest, setFeatAISuggest] = useState(false);
  const [featSmartScanner, setFeatSmartScanner] = useState(false);
  const [featVoiceTyping, setFeatVoiceTyping] = useState(false);
  const [featTeacherManagement, setFeatTeacherManagement] = useState(false);

  // Edit states
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState(0);
  const [editPriceCycle, setEditPriceCycle] = useState('yearly');
  const [editPaperLimit, setEditPaperLimit] = useState(0);
  const [editClassLimit, setEditClassLimit] = useState(0);
  const [editSubjectLimit, setEditSubjectLimit] = useState(0);
  const [editFeatures, setEditFeatures] = useState([]);
  const [newPriceCycle, setNewPriceCycle] = useState('yearly');

  // Assignment states
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [assignDuration, setAssignDuration] = useState(1);
  const [assignUnit, setAssignUnit] = useState('years'); // months | years

  const fetchPlans = async () => {
    try {
      const res = await fetch(`${API}/subscriptions/plans`);
      if (res.ok) setPlans(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API}/subscriptions/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setUsers(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPlans();
    if (user?.role === 'superadmin') {
      fetchUsers();
    }
  }, [token, user]);

  const handleNewCycleChange = (newCycle) => {
    setNewPriceCycle(newCycle);
  };

  const handleEditCycleChange = (newCycle) => {
    setEditPriceCycle(newCycle);
  };

  const handleAddPlan = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);

    const features = [];
    if (featBranding) features.push('branding');
    if (featLivePreview) features.push('live_preview');
    if (featAISuggest) features.push('ai_suggestions');
    if (featSmartScanner) features.push('smart_scanner');
    if (featVoiceTyping) features.push('voice_typing');
    if (featTeacherManagement) features.push('teacher_management');

    try {
      const res = await fetch(`${API}/subscriptions/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newName.trim(),
          price: Number(newPrice),
          billing_cycle: newPriceCycle,
          paper_limit: Number(newPaperLimit),
          class_limit: Number(newClassLimit),
          subject_limit: Number(newSubjectLimit),
          features
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to add subscription plan');
      
      setNewName('');
      setNewPrice(0);
      setNewPriceCycle('yearly');
      setNewPaperLimit(5);
      setNewClassLimit(3);
      setNewSubjectLimit(5);
      setFeatBranding(true);
      setFeatLivePreview(false);
      setFeatAISuggest(false);
      setFeatSmartScanner(false);
      setFeatVoiceTyping(false);
      setFeatTeacherManagement(false);
      setShowAddForm(false);
      
      fetchPlans();
      showAlert('Success', `Plan "${data.name}" added successfully.`, 'success');
    } catch (err) {
      showAlert('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const startEditPlan = (plan) => {
    setEditId(plan.id);
    setEditName(plan.name);
    setEditPrice(plan.price);
    setEditPriceCycle(plan.billing_cycle || 'monthly');
    setEditPaperLimit(plan.paper_limit);
    setEditClassLimit(plan.class_limit);
    setEditSubjectLimit(plan.subject_limit);
    setEditFeatures(plan.features || []);
    setShowAddForm(false);
  };

  const toggleEditFeature = (feat) => {
    if (editFeatures.includes(feat)) {
      setEditFeatures(prev => prev.filter(f => f !== feat));
    } else {
      setEditFeatures(prev => [...prev, feat]);
    }
  };

  const handleSaveEditPlan = async (planId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/subscriptions/plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editName.trim(),
          price: Number(editPrice),
          billing_cycle: editPriceCycle,
          paper_limit: Number(editPaperLimit),
          class_limit: Number(editClassLimit),
          subject_limit: Number(editSubjectLimit),
          features: editFeatures
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to update plan');
      setEditId(null);
      fetchPlans();
      showAlert('Updated', `Plan "${data.name}" updated.`, 'success');
    } catch (err) {
      showAlert('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = (plan) => {
    showConfirm('Delete Subscription Plan', `Are you sure you want to delete the "${plan.name}" plan? Users on this plan will revert to Free tier.`, async () => {
      try {
        const res = await fetch(`${API}/subscriptions/plans/${plan.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.detail || 'Failed to delete plan');
        }
        fetchPlans();
        showAlert('Deleted', `Plan "${plan.name}" removed successfully.`, 'success');
      } catch (err) {
        showAlert('Error', err.message, 'error');
      }
    });
  };

  const handleAssignPlan = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setLoading(true);

    const monthsToSend = selectedPlanId === '' ? 0 : (assignUnit === 'years' ? assignDuration * 12 : assignDuration);

    const params = new URLSearchParams();
    if (selectedPlanId) {
      params.append('plan_id', selectedPlanId);
    }
    params.append('months', monthsToSend);

    try {
      const url = `${API}/subscriptions/assign/${selectedUserId}?${params.toString()}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to assign plan');
      
      setSelectedUserId('');
      setSelectedPlanId('');
      fetchUsers();
      showAlert('Success', `Plan successfully assigned to user.`, 'success');
    } catch (err) {
      showAlert('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'superadmin') {
    return (
      <div className="card text-center" style={{ padding: 40 }}>
        <ShieldAlert size={48} style={{ color: 'var(--color-danger)', marginBottom: 16 }} />
        <h2 style={{ color: 'white' }}>Access Denied</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>Only SuperAdmins are allowed to view this management panel.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage Subscriptions</h1>
          <p className="page-subtitle">Configure subscription tiers, limits, and manually assign plans to users</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            className={`btn ${activeSubTab === 'plans' ? 'btn-primary' : 'btn-ghost'}`} 
            onClick={() => setActiveSubTab('plans')}
          >
            Subscription Plans
          </button>
          <button 
            className={`btn ${activeSubTab === 'user_assignment' ? 'btn-primary' : 'btn-ghost'}`} 
            onClick={() => setActiveSubTab('user_assignment')}
          >
            User Assignments
          </button>
        </div>
      </div>

      {activeSubTab === 'plans' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <button className="btn btn-primary" onClick={() => { setShowAddForm(v => !v); setEditId(null); }}>
              <Plus size={16} /> Add New Plan
            </button>
          </div>

          {showAddForm && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <span className="card-title">New Subscription Plan</span>
              </div>
              <form onSubmit={handleAddPlan} className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Plan Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Normal, Medium, Premium"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Price *</label>
                      <input
                        type="number"
                        className="form-control"
                        value={newPrice}
                        onChange={e => setNewPrice(e.target.value)}
                        required
                        min={0}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Billing Cycle *</label>
                      <select
                        className="form-control"
                        value={newPriceCycle}
                        onChange={e => handleNewCycleChange(e.target.value)}
                      >
                        <option value="yearly">Yearly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: -8, fontStyle: 'italic' }}>
                  {newPriceCycle === 'monthly' ? (
                    <>Calculation: ₹{newPrice}/mo = ₹{newPrice * 12}/yr (approx. ₹{(newPrice / 30).toFixed(2)}/day)</>
                  ) : (
                    <>Calculation: ₹{newPrice}/yr = ₹{Math.round(newPrice / 12)}/mo (approx. ₹{(newPrice / 365).toFixed(2)}/day)</>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Paper Limit (Total) *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newPaperLimit}
                      onChange={e => setNewPaperLimit(e.target.value)}
                      required
                      min={1}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Class / Standard Limit *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newClassLimit}
                      onChange={e => setNewClassLimit(e.target.value)}
                      required
                      min={1}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Subject Limit *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newSubjectLimit}
                      onChange={e => setNewSubjectLimit(e.target.value)}
                      required
                      min={1}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Enabled Features</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: 'var(--text-primary)' }}>
                      <input type="checkbox" checked={featBranding} onChange={e => setFeatBranding(e.target.checked)} />
                      Custom Logo Branding & Spacings
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: 'var(--text-primary)' }}>
                      <input type="checkbox" checked={featLivePreview} onChange={e => setFeatLivePreview(e.target.checked)} />
                      Visual Live PDF Preview
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: 'var(--text-primary)' }}>
                      <input type="checkbox" checked={featAISuggest} onChange={e => setFeatAISuggest(e.target.checked)} />
                      AI Question Suggestions (Gemini)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: 'var(--text-primary)' }}>
                      <input type="checkbox" checked={featSmartScanner} onChange={e => setFeatSmartScanner(e.target.checked)} />
                      Smart Scanner (PDF & Word Import)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: 'var(--text-primary)' }}>
                      <input type="checkbox" checked={featVoiceTyping} onChange={e => setFeatVoiceTyping(e.target.checked)} />
                      Multilingual Voice Typing
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: 'var(--text-primary)' }}>
                      <input type="checkbox" checked={featTeacherManagement} onChange={e => setFeatTeacherManagement(e.target.checked)} />
                      Multi-Teacher Delegation / Team Dashboard
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>Add Plan</button>
                </div>
              </form>
            </div>
          )}

          {editId && (
            <div className="card" style={{ marginBottom: 20, border: '1px solid var(--color-primary)' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="card-title">Edit Subscription Plan: {editName}</span>
                <button className="btn-icon" onClick={() => setEditId(null)}>
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleSaveEditPlan(editId); }} className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Plan Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Price *</label>
                      <input
                        type="number"
                        className="form-control"
                        value={editPrice}
                        onChange={e => setEditPrice(e.target.value)}
                        required
                        min={0}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Billing Cycle *</label>
                      <select
                        className="form-control"
                        value={editPriceCycle}
                        onChange={e => handleEditCycleChange(e.target.value)}
                      >
                        <option value="yearly">Yearly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: -8, fontStyle: 'italic' }}>
                  {editPriceCycle === 'monthly' ? (
                    <>Calculation: ₹{editPrice}/mo = ₹{editPrice * 12}/yr (approx. ₹{(editPrice / 30).toFixed(2)}/day)</>
                  ) : (
                    <>Calculation: ₹{editPrice}/yr = ₹{Math.round(editPrice / 12)}/mo (approx. ₹{(editPrice / 365).toFixed(2)}/day)</>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Paper Limit (Total) *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={editPaperLimit}
                      onChange={e => setEditPaperLimit(e.target.value)}
                      required
                      min={1}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Class / Standard Limit *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={editClassLimit}
                      onChange={e => setEditClassLimit(e.target.value)}
                      required
                      min={1}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Subject Limit *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={editSubjectLimit}
                      onChange={e => setEditSubjectLimit(e.target.value)}
                      required
                      min={1}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Enabled Features</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                    {['branding', 'live_preview', 'ai_suggestions', 'smart_scanner', 'voice_typing', 'teacher_management'].map(f => (
                      <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: 'var(--text-primary)' }}>
                        <input type="checkbox" checked={editFeatures.includes(f)} onChange={() => toggleEditFeature(f)} />
                        {f.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditId(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>Save Changes</button>
                </div>
              </form>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <span className="card-title">Available Plans</span>
              <span className="badge badge-primary">{plans.length} tiers</span>
            </div>
            
            <table className="data-table">
              <thead>
                <tr>
                  <th>Plan Name</th>
                  <th>Price</th>
                  <th>Limits (Papers/Classes/Subjects)</th>
                  <th>Features</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map(p => (
                  <tr key={p.id}>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</span>
                    </td>
                    <td>
                      {p.billing_cycle === 'yearly' ? (
                        <div>
                          <span style={{ fontWeight: 600 }}>₹{p.price}/yr</span>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            (₹{Math.round(p.price / 12)}/mo)
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span style={{ fontWeight: 600 }}>₹{p.price}/mo</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: 12 }}>
                        📄 {p.paper_limit >= 9999 ? 'Unlimited' : p.paper_limit} Papers | 
                        🏫 {p.class_limit >= 9999 ? 'Unlimited' : p.class_limit} Classes | 
                        📚 {p.subject_limit >= 9999 ? 'Unlimited' : p.subject_limit} Subjects
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(p.features || []).length === 0 ? (
                          <em style={{ fontSize: 12, opacity: 0.5 }}>No advanced features</em>
                        ) : (
                          p.features.map(f => (
                            <span key={f} className="badge badge-success" style={{ fontSize: 10 }}>
                              {f.replace('_', ' ')}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-icon" onClick={() => startEditPlan(p)} style={{ color: 'var(--color-primary)' }}>
                          <Edit size={16} />
                        </button>
                        <button className="btn-icon danger" onClick={() => handleDeletePlan(p)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeSubTab === 'user_assignment' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Assign Subscription</span>
            </div>
            <form onSubmit={handleAssignPlan} className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Select User / Teacher *</label>
                <select 
                  className="form-control"
                  value={selectedUserId}
                  onChange={e => setSelectedUserId(e.target.value)}
                  required
                >
                  <option value="">-- Choose User --</option>
                  {users.filter(u => u.role !== 'superadmin').map(u => (
                    <option key={u.id} value={u.id}>
                      {u.email} ({u.subscription_plan?.name || 'Free Trial'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Select Plan *</label>
                <select 
                  className="form-control"
                  value={selectedPlanId}
                  onChange={e => setSelectedPlanId(e.target.value)}
                >
                  <option value="">-- Remove Subscription (Revert to Free) --</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.billing_cycle === 'yearly' ? `₹${p.price}/yr — ₹${Math.round(p.price / 12)}/mo` : `₹${p.price}/mo`})
                    </option>
                  ))}
                </select>
              </div>

              {selectedPlanId !== '' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Duration *</label>
                      <input
                        type="number"
                        className="form-control"
                        value={assignDuration}
                        onChange={e => setAssignDuration(Math.max(1, Number(e.target.value)))}
                        required
                        min={1}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Unit *</label>
                      <select
                        className="form-control"
                        value={assignUnit}
                        onChange={e => setAssignUnit(e.target.value)}
                      >
                        <option value="years">Years</option>
                        <option value="months">Months</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: -8, marginBottom: 8, fontStyle: 'italic' }}>
                    Calculation: {assignDuration} {assignUnit === 'years' ? 'Year(s)' : 'Month(s)'} = approx. {assignUnit === 'years' ? assignDuration * 365 : assignDuration * 30} Days ({assignUnit === 'years' ? assignDuration * 12 : assignDuration} Month(s))
                  </div>
                </>
              )}

              <button type="submit" className="btn btn-primary" style={{ marginTop: 16 }}>
                Assign Plan
              </button>
            </form>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Users & Active Tiers</span>
            </div>
            <div className="card-body" style={{ maxHeight: 400, overflowY: 'auto', padding: 0 }}>
              {users.map(u => (
                <div 
                  key={u.id} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '12px 16px', 
                    borderBottom: '1px solid var(--border-color)' 
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{u.email}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      Role: {u.role} | Registered: {new Date(u.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {u.role === 'superadmin' ? (
                    <span className="badge badge-success" style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white', border: 'none' }}>
                      All Access
                    </span>
                  ) : (
                    <span className={`badge ${u.subscription_plan ? 'badge-success' : 'badge-primary'}`}>
                      {u.subscription_plan ? u.subscription_plan.name : 'Free Trial'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManagement;
