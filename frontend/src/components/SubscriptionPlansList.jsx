import React, { useState, useEffect } from 'react';
import { CreditCard, Check, X, ShieldAlert, Award, Star, Compass, CheckCircle2 } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const SubscriptionPlansList = ({ token, user, fetchProfile, showAlert }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPlans = async () => {
    try {
      const res = await fetch(`${API}/subscriptions/plans`);
      if (res.ok) {
        const sortedPlans = (await res.json()).sort((a, b) => a.price - b.price);
        setPlans(sortedPlans);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCheckout = async (plan) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/subscriptions/phonepe/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan_id: plan.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Payment initiation failed');
      
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        throw new Error('Redirect URL not returned by PhonePe');
      }
    } catch (e) {
      showAlert('Payment Error', e.message, 'error');
      setLoading(false);
    }
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return new Date();
    const normalized = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : `${dateStr}Z`;
    return new Date(normalized);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = parseDate(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const isExpired = user?.subscription_expires_at && parseDate(user.subscription_expires_at) < new Date();
  const currentPlanId = (!user?.subscription_plan || isExpired) ? null : user.subscription_plan.id;

  const renderStatus = (hasFeature, valueText) => {
    if (valueText !== undefined) {
      return <span style={{ fontWeight: 700, color: '#ffffff', fontSize: 13.5 }}>{valueText}</span>;
    }
    return hasFeature ? (
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: '#6366f1', color: '#ffffff' }}>
        <Check size={13} strokeWidth={3} />
      </div>
    ) : (
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', border: '2.5px solid rgba(255, 255, 255, 0.15)', color: 'rgba(255, 255, 255, 0.3)' }}>
        <X size={11} strokeWidth={3} />
      </div>
    );
  };

  const hasFeat = (plan, featureKey) => {
    return plan.features && plan.features.includes(featureKey);
  };

  return (
    <div style={{ 
      background: '#1e1b4b', // Deep indigo sidebar color
      color: '#ffffff', 
      minHeight: '85vh', 
      borderRadius: '16px', 
      padding: '40px 30px', 
      fontFamily: "'Outfit', sans-serif",
      boxShadow: '0 20px 40px rgba(15, 23, 42, 0.3)',
      border: '1px solid rgba(255,255,255,0.08)'
    }}>
      {/* Title */}
      <div style={{ maxWidth: 900, margin: '0 auto 40px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0, color: '#ffffff', letterSpacing: '-0.5px' }}>Choose the plan that's right for you</h1>
          <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0 0', display: 'flex', flexDirection: 'column', gap: 6, color: '#cbd5e1', fontSize: 14 }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check size={14} style={{ color: '#818cf8' }} /> Unlimited papers, classes and subjects in Enterprise plan.
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check size={14} style={{ color: '#818cf8' }} /> Upgrade or cancel your active subscription anytime.
            </li>
          </ul>
        </div>
        
        {/* Redesigned Current Plan Status Box */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.04)', 
          border: '1px solid rgba(255, 255, 255, 0.1)', 
          padding: '16px 24px', 
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: 40, 
            height: 40, 
            borderRadius: '50%', 
            background: 'rgba(99, 102, 241, 0.2)', 
            color: '#a5b4fc' 
          }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.8 }}>Current Plan Status</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', marginTop: 2, letterSpacing: '-0.3px' }}>
              {user?.subscription_plan ? user.subscription_plan.name : 'Free Trial'}
            </div>
            {user?.subscription_expires_at && !isExpired && (
              <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 2 }}>
                Expires on: {formatDate(user.subscription_expires_at)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comparison Grid Table */}
      <div style={{ maxWidth: 900, margin: '0 auto', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr>
              <th style={{ width: '35%', padding: '24px 16px', borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: '#818cf8', letterSpacing: '-0.5px' }}>QP CMS</span>
              </th>
              {plans.map(p => {
                const isCurrent = currentPlanId === p.id;
                return (
                  <th 
                    key={p.id} 
                    style={{ 
                      width: `${65 / Math.max(1, plans.length)}%`, 
                      padding: '24px 16px', 
                      textAlign: 'center',
                      borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                      background: isCurrent ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                      borderTop: isCurrent ? '3px solid #818cf8' : 'none',
                      borderTopLeftRadius: 12,
                      borderTopRightRadius: 12
                    }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#818cf8' }}>
                      ₹{p.price}
                    </div>
                    <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>
                      / {p.billing_cycle === 'yearly' ? 'year' : 'month'}
                    </div>
                    {p.billing_cycle === 'yearly' && (
                      <div style={{ fontSize: 11.5, color: '#a5b4fc', marginTop: 4, fontWeight: 600 }}>
                        (₹{Math.round(p.price / 12)} / mo)
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            
            {/* Limit Rows */}
            <tr>
              <td style={{ padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', color: '#e2e8f0', fontSize: 14, fontWeight: 500 }}>
                Paper creation limit
              </td>
              {plans.map(p => (
                <td key={p.id} style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', background: currentPlanId === p.id ? 'rgba(99, 102, 241, 0.04)' : 'transparent' }}>
                  {renderStatus(true, p.paper_limit >= 9999 ? 'Unlimited' : `${p.paper_limit} Papers`)}
                </td>
              ))}
            </tr>

            <tr>
              <td style={{ padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', color: '#e2e8f0', fontSize: 14, fontWeight: 500 }}>
                Class / Standard limit
              </td>
              {plans.map(p => (
                <td key={p.id} style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', background: currentPlanId === p.id ? 'rgba(99, 102, 241, 0.04)' : 'transparent' }}>
                  {renderStatus(true, p.class_limit >= 9999 ? 'Unlimited' : `${p.class_limit} Classes`)}
                </td>
              ))}
            </tr>

            <tr>
              <td style={{ padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', color: '#e2e8f0', fontSize: 14, fontWeight: 500 }}>
                Subject master limit
              </td>
              {plans.map(p => (
                <td key={p.id} style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', background: currentPlanId === p.id ? 'rgba(99, 102, 241, 0.04)' : 'transparent' }}>
                  {renderStatus(true, p.subject_limit >= 9999 ? 'Unlimited' : `${p.subject_limit} Subjects`)}
                </td>
              ))}
            </tr>

            {/* Feature Rows */}
            <tr>
              <td style={{ padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', color: '#e2e8f0', fontSize: 14, fontWeight: 500 }}>
                Custom Logo branding
              </td>
              {plans.map(p => (
                <td key={p.id} style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', background: currentPlanId === p.id ? 'rgba(99, 102, 241, 0.04)' : 'transparent' }}>
                  {renderStatus(hasFeat(p, 'branding'))}
                </td>
              ))}
            </tr>

            <tr>
              <td style={{ padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', color: '#e2e8f0', fontSize: 14, fontWeight: 500 }}>
                Visual live PDF preview
              </td>
              {plans.map(p => (
                <td key={p.id} style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', background: currentPlanId === p.id ? 'rgba(99, 102, 241, 0.04)' : 'transparent' }}>
                  {renderStatus(hasFeat(p, 'live_preview'))}
                </td>
              ))}
            </tr>

            <tr>
              <td style={{ padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', color: '#e2e8f0', fontSize: 14, fontWeight: 500 }}>
                AI Question suggestions
              </td>
              {plans.map(p => (
                <td key={p.id} style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', background: currentPlanId === p.id ? 'rgba(99, 102, 241, 0.04)' : 'transparent' }}>
                  {renderStatus(hasFeat(p, 'ai_suggestions'))}
                </td>
              ))}
            </tr>

            <tr>
              <td style={{ padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', color: '#e2e8f0', fontSize: 14, fontWeight: 500 }}>
                Smart Scanner (PDF/Word Scan)
              </td>
              {plans.map(p => (
                <td key={p.id} style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', background: currentPlanId === p.id ? 'rgba(99, 102, 241, 0.04)' : 'transparent' }}>
                  {renderStatus(hasFeat(p, 'smart_scanner'))}
                </td>
              ))}
            </tr>

            <tr>
              <td style={{ padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', color: '#e2e8f0', fontSize: 14, fontWeight: 500 }}>
                Multilingual Voice Typing
              </td>
              {plans.map(p => (
                <td key={p.id} style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', background: currentPlanId === p.id ? 'rgba(99, 102, 241, 0.04)' : 'transparent' }}>
                  {renderStatus(hasFeat(p, 'voice_typing'))}
                </td>
              ))}
            </tr>

            <tr>
              <td style={{ padding: '16px', borderBottom: '2px solid rgba(255, 255, 255, 0.1)', color: '#e2e8f0', fontSize: 14, fontWeight: 500 }}>
                Teacher delegation management
              </td>
              {plans.map(p => (
                <td key={p.id} style={{ padding: '16px', textAlign: 'center', borderBottom: '2px solid rgba(255, 255, 255, 0.1)', background: currentPlanId === p.id ? 'rgba(99, 102, 241, 0.04)' : 'transparent' }}>
                  {renderStatus(hasFeat(p, 'teacher_management'))}
                </td>
              ))}
            </tr>

            {/* Action Row */}
            <tr>
              <td style={{ padding: '24px 16px' }} />
              {plans.map(p => {
                const isCurrent = currentPlanId === p.id;
                return (
                  <td 
                    key={p.id} 
                    style={{ 
                      padding: '24px 16px', 
                      textAlign: 'center',
                      background: isCurrent ? 'rgba(99, 102, 241, 0.04)' : 'transparent',
                      borderBottomLeftRadius: 12,
                      borderBottomRightRadius: 12
                    }}
                  >
                    <button
                      onClick={() => handleCheckout(p)}
                      disabled={loading || isCurrent}
                      style={{
                        background: isCurrent ? 'transparent' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        color: 'white',
                        border: isCurrent ? '2px solid rgba(255, 255, 255, 0.2)' : 'none',
                        padding: '10px 24px',
                        borderRadius: 6,
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: loading || isCurrent ? 'default' : 'pointer',
                        width: '100%',
                        maxWidth: 160,
                        transition: 'all 0.2s ease',
                        boxShadow: isCurrent ? 'none' : '0 4px 15px rgba(99, 102, 241, 0.3)'
                      }}
                    >
                      {loading ? <span className="spinner" /> : (isCurrent ? 'Current Plan' : 'Choose Plan')}
                    </button>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SubscriptionPlansList;
