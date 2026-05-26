import React, { useEffect, useState } from 'react';
import { BookOpen, FileText, Users, TrendingUp, GraduationCap, ArrowRight } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const Dashboard = ({ standards, token, user, onOpenClass }) => {
  const [stats, setStats] = useState({ totalPapers: 0, totalClasses: 0, totalTeachers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [papersRes, teachersRes] = await Promise.all([
          fetch(`${API}/papers`, { headers }),
          user?.role === 'superadmin' ? fetch(`${API}/teachers`, { headers }) : Promise.resolve(null),
        ]);
        const papers = papersRes.ok ? await papersRes.json() : [];
        const teachers = teachersRes && teachersRes.ok ? await teachersRes.json() : [];
        setStats({
          totalPapers: papers.length,
          totalClasses: standards.length,
          totalTeachers: teachers.length,
        });
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [token, standards, user]);

  const isAdmin = user?.role === 'superadmin';

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
        {isAdmin && (
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fef3c7' }}>
              <Users size={22} color="#f59e0b" />
            </div>
            <div>
              <div className="stat-value">{loading ? '…' : stats.totalTeachers}</div>
              <div className="stat-label">Teachers</div>
            </div>
          </div>
        )}
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