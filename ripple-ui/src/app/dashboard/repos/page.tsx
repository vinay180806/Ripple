'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import { REPOS, STATUS_CONFIG } from '../../lib/data';

export default function ReposPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newRepoUrl, setNewRepoUrl] = useState('');

  const filtered = REPOS.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.org.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <div className="flex" style={{ paddingTop: 'var(--nav-height)' }}>
        <Sidebar />
        <main style={{ flex: 1, marginLeft: 240, padding: '32px' }}>

          {/* Header */}
          <div className="flex items-center justify-between" style={{ marginBottom: 32 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Repositories</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                {REPOS.length} repos connected · {REPOS.filter(r => r.status === 'online').length} indexed
              </p>
            </div>
            <button className="btn btn-primary" id="connect-new-repo" onClick={() => setShowModal(true)}>
              + Connect Repository
            </button>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 24, maxWidth: 400 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}>⌕</span>
            <input
              className="input"
              style={{ paddingLeft: 36 }}
              placeholder="Search repositories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              id="repo-search"
            />
          </div>

          {/* Table */}
          <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 140px',
              padding: '12px 24px', borderBottom: '1px solid var(--border-subtle)', gap: 16,
            }}>
              {['Repository', 'Status', 'Functions', 'Coverage', 'Impact Reports', 'Actions'].map((h) => (
                <div key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
              ))}
            </div>

            {filtered.map((repo, i) => {
              const st = STATUS_CONFIG[repo.status];
              return (
                <div
                  key={repo.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 140px',
                    padding: '18px 24px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    gap: 16, alignItems: 'center', cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(139,92,246,0.04)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => router.push(`/dashboard/repo/${repo.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: 'rgba(139,92,246,0.1)', border: '1px solid var(--border-card)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
                    }}>◧</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {repo.org} / <span style={{ color: 'var(--purple-400)' }}>{repo.name}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                        ⎇ {repo.branch} · {repo.language}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={`status-dot ${st.dot}`} />
                    <span style={{ fontSize: 13, color: st.color }}>{st.label}</span>
                  </div>

                  <div style={{ fontSize: 14, fontWeight: 600 }}>{repo.functions.toLocaleString()}</div>

                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: repo.coverage > 90 ? 'var(--emerald-400)' : 'var(--orange-400)' }}>
                      {repo.coverage}%
                    </div>
                    <div className="progress-bar" style={{ marginTop: 4, maxWidth: 80 }}>
                      <div className="progress-fill" style={{
                        width: `${repo.coverage}%`,
                        background: repo.coverage > 90 ? 'var(--emerald-400)' : 'var(--orange-400)',
                      }} />
                    </div>
                  </div>

                  <div style={{ fontSize: 14, fontWeight: 600 }}>{repo.impactReports}</div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '5px 10px' }}
                      onClick={() => router.push('/impact')}>⚡</button>
                    <button className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11, padding: '5px 10px', background: 'rgba(34,211,238,0.08)', color: 'var(--cyan-400)', borderColor: 'rgba(34,211,238,0.2)' }}
                      onClick={() => router.push('/chat')}>◈</button>
                    <button className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '5px 10px' }}>⋯</button>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                No repositories match &quot;{search}&quot;
              </div>
            )}
          </div>

          {/* Connect Modal */}
          {showModal && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(5,8,20,0.85)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }} onClick={() => setShowModal(false)}>
              <div className="glass-card" style={{ padding: 36, maxWidth: 480, width: '90%', position: 'relative' }}
                onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setShowModal(false)}
                  style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>×</button>
                <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Connect a Repository</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                  Paste a GitHub URL or search your connected orgs.
                </p>
                <input className="input" placeholder="https://github.com/org/repo"
                  value={newRepoUrl} onChange={(e) => setNewRepoUrl(e.target.value)}
                  style={{ marginBottom: 16 }} id="repo-url-input" />
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} id="connect-confirm-btn">Connect &amp; Index</button>
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                </div>
                <div style={{ marginTop: 20, padding: '14px 16px', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-secondary)' }}>
                  ◈ Ripple will clone the repo, run AST parsing, build the call graph, and embed all functions. First index typically takes 1–5 minutes.
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
