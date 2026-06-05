import React, { useEffect, useState } from 'react';
import { BookOpen, FileText, Users, TrendingUp, GraduationCap, ArrowRight, ShieldAlert, BarChart3, PieChart, CheckCircle2, AlertCircle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const Dashboard = ({ standards, token, user, onOpenClass }) => {
  const [stats, setStats] = useState({ totalPapers: 0, totalClasses: 0, totalTeachers: 0 });
  const [adminStats, setAdminStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        if (user?.role === 'superadmin') {
          const res = await fetch(`${API}/teachers/dashboard-analytics`, { headers });
          if (res.ok) {
            const data = await res.json();
            setAdminStats(data);
          }
        } else {
          const [papersRes] = await Promise.all([
            fetch(`${API}/papers`, { headers }),
          ]);
          const papers = papersRes.ok ? await papersRes.json() : [];
          setStats({
            totalPapers: papers.length,
            totalClasses: standards.length,
            totalTeachers: 0,
          });
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [token, standards, user]);

  const isAdmin = user?.role === 'superadmin';

  if (isAdmin) {
    if (loading) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <span className="spinner dark" />
        </div>
      );
    }

    const { total_papers, users, subjects, boards, top_teachers } = adminStats || {
      total_papers: 0,
      users: { total: 0, active: 0, blocked: 0, password_changed: 0, password_not_changed: 0 },
      subjects: [],
      boards: [],
      top_teachers: []
    };

    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">SuperAdmin Analytics Dashboard</h1>
            <p className="page-subtitle">System-wide monitoring and insights</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#e0f2fe' }}>
              <FileText size={22} color="#0284c7" />
            </div>
            <div>
              <div className="stat-value">{total_papers}</div>
              <div className="stat-label">Total Papers Created</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#d1fae5' }}>
              <Users size={22} color="#059669" />
            </div>
            <div>
              <div className="stat-value">{users.active}</div>
              <div className="stat-label">Active Teachers</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fee2e2' }}>
              <ShieldAlert size={22} color="#dc2626" />
            </div>
            <div>
              <div className="stat-value">{users.blocked}</div>
              <div className="stat-label">Blocked Accounts</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fef3c7' }}>
              <AlertCircle size={22} color="#d97706" />
            </div>
            <div>
              <div className="stat-value">{users.password_not_changed}</div>
              <div className="stat-label">Pending Pwd Reset</div>
            </div>
          </div>
        </div>

        {/* Layout Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Top Teachers and Board Splits */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Top Teachers */}
            <div className="card">
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={18} color="var(--color-primary)" />
                <span className="card-title">Top Engaged Teachers</span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {top_teachers.length === 0 ? (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)' }}>No paper creation activity recorded yet.</div>
                ) : (
                  top_teachers.map((teacher, idx) => {
                    const maxCount = top_teachers[0]?.count || 1;
                    const percent = Math.max(8, (teacher.count / maxCount) * 100);
                    return (
                      <div key={teacher.email} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{idx + 1}. {teacher.email}</span>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{teacher.count} papers</span>
                        </div>
                        <div style={{ width: '100%', height: 8, background: 'var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: 4 }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Board Distribution */}
            <div className="card">
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PieChart size={18} color="#10b981" />
                <span className="card-title">Board Distribution</span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {boards.length === 0 ? (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)' }}>No board data available.</div>
                ) : (
                  boards.map(b => {
                    const total = boards.reduce((acc, curr) => acc + curr.count, 0) || 1;
                    const percent = Math.round((b.count / total) * 100);
                    const color = b.board === 'CBSE' ? '#6366f1' : '#f59e0b';
                    return (
                      <div key={b.board} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.board} Board</span>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{b.count} papers ({percent}%)</span>
                        </div>
                        <div style={{ width: '100%', height: 10, background: 'var(--border-color)', borderRadius: 5, overflow: 'hidden' }}>
                          <div style={{ width: `${percent}%`, height: '100%', background: color, borderRadius: 5 }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Subject Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="card" style={{ height: '100%' }}>
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={18} color="#ec4899" />
                <span className="card-title">Papers by Subject</span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {subjects.length === 0 ? (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)' }}>No subject metrics recorded yet.</div>
                ) : (
                  subjects.map((sub, idx) => {
                    const maxSubCount = subjects[0]?.count || 1;
                    const percent = Math.max(8, (sub.count / maxSubCount) * 100);
                    return (
                      <div key={sub.subject} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sub.subject}</span>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{sub.count} papers</span>
                        </div>
                        <div style={{ width: '100%', height: 8, background: 'var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, #ec4899, #f43f5e)', borderRadius: 4 }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eef2ff' }}>
            <GraduationCap size={22} color="#6366f1" />
          </div>
          <div>
            <div className="stat-value">{loading ? '…' : stats.totalClasses}</div>
            <div className="stat-label">Classes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#d1fae5' }}>
            <FileText size={22} color="#10b981" />
          </div>
          <div>
            <div className="stat-value">{loading ? '…' : stats.totalPapers}</div>
            <div className="stat-label">Question Papers</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fce7f3' }}>
            <TrendingUp size={22} color="#ec4899" />
          </div>
          <div>
            <div className="stat-value">PDF</div>
            <div className="stat-label">Export Ready</div>
          </div>
        </div>
      </div>

      {/* Classes Grid */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">All Classes</span>
        </div>
        {standards.length === 0 ? (
          <div className="empty-state">
            <GraduationCap size={48} />
            <p>No classes yet. Add a class from the sidebar.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, padding: 24 }}>
            {standards.map(std => (
              <button
                key={std.id}
                onClick={() => onOpenClass(std)}
                style={{
                  background: 'var(--bg-app)',
                  border: '2px solid var(--border-color)',
                  borderRadius: 12,
                  padding: '20px 18px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-primary-bg)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-app)'; }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GraduationCap size={20} color="white" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{std.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                    Open class <ArrowRight size={12} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;