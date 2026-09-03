'use client';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '../../../components/Sidebar';
import Navbar from '../../../components/Navbar';
import {
  getRepoById,
  getEventsForRepo,
  REPOS,
  STATUS_CONFIG,
  EVENT_CONFIG,
  type Repo,
} from '../../../lib/data';

export default function RepoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const repo: Repo | undefined = getRepoById(Number(id));
  const events = repo ? getEventsForRepo(repo.id) : [];

  if (!repo) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Navbar />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>◧</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Repository not found</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            No repo with ID <code style={{ fontFamily: 'JetBrains Mono, monospace' }}>{id}</code> exists.
          </p>
          <button className="btn btn-primary" onClick={() => router.push('/dashboard/repos')}>
            ← Back to repositories
          </button>
        </div>
      </div>
    );
  }

  const st = STATUS_CONFIG[repo.status];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <div className="flex" style={{ paddingTop: 'var(--nav-height)' }}>
        <Sidebar />
        <main style={{ flex: 1, marginLeft: 240, padding: '32px' }}>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2" style={{ marginBottom: 24, fontSize: 13, color: 'var(--text-muted)' }}>
            <Link href="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Dashboard</Link>
            <span>›</span>
            <Link href="/dashboard/repos" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Repositories</Link>
            <span>›</span>
            <span style={{ color: 'var(--purple-400)', fontWeight: 600 }}>{repo.name}</span>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between" style={{ marginBottom: 32 }}>
            <div className="flex items-center gap-4">
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'rgba(139,92,246,0.1)', border: '1px solid var(--border-card)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
              }}>◧</div>
              <div>
                <div className="flex items-center gap-3" style={{ marginBottom: 4 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 800 }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>{repo.org} / </span>
                    <span style={{ color: 'var(--purple-400)' }}>{repo.name}</span>
                  </h1>
                  <div className="flex items-center gap-2">
                    <div className={`status-dot ${st.dot}`} />
                    <span style={{ fontSize: 12, color: st.color }}>{st.label}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>⎇ {repo.branch}</span>
                  <span>·</span>
                  <span>{repo.language}</span>
                  <span>·</span>
                  <span>Last indexed {repo.lastIndexed}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="btn btn-ghost btn-sm" onClick={() => router.push('/impact')} style={{ fontSize: 13 }}>
                ⚡ Impact report
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/dashboard?repo=${repo.name}`)}
                style={{ fontSize: 13, background: 'rgba(34,211,238,0.08)', color: 'var(--cyan-400)', borderColor: 'rgba(34,211,238,0.2)' }}>
                ◈ Ask about code
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => router.push('/graph')}
                style={{ fontSize: 13, background: 'rgba(52,211,153,0.08)', color: 'var(--emerald-400)', borderColor: 'rgba(52,211,153,0.2)' }}>
                ⬡ View graph
              </button>
            </div>
          </div>

          {/* Description */}
          {repo.description && (
            <div style={{ marginBottom: 32, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 640 }}>
              {repo.description}
            </div>
          )}

          {/* Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 32 }}>
            {[
              { label: 'Functions', value: repo.functions.toLocaleString(), color: 'var(--purple-400)', icon: '⟟' },
              { label: 'Files', value: repo.files.toString(), color: 'var(--cyan-400)', icon: '◧' },
              { label: 'Graph coverage', value: `${repo.coverage}%`, color: repo.coverage > 90 ? 'var(--emerald-400)' : 'var(--orange-400)', icon: '◈' },
              { label: 'Impact reports', value: repo.impactReports.toString(), color: 'var(--orange-400)', icon: '⚡' },
              { label: 'Open PRs', value: repo.openPRs.toString(), color: 'var(--purple-300)', icon: '⬡' },
            ].map((s) => (
              <div key={s.label} className="card" style={{ padding: '18px 20px' }}>
                <div style={{ fontSize: 20, marginBottom: 10, color: s.color }}>{s.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Coverage bar */}
          <div className="card" style={{ padding: '20px 24px', marginBottom: 32 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Call graph coverage</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: repo.coverage > 90 ? 'var(--emerald-400)' : 'var(--orange-400)' }}>
                {repo.coverage}%
              </span>
            </div>
            <div className="progress-bar" style={{ height: 8 }}>
              <div className="progress-fill" style={{
                width: `${repo.coverage}%`,
                background: repo.coverage > 90 ? 'var(--grad-success)' : 'var(--grad-primary)',
              }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              {Math.round((repo.coverage / 100) * repo.functions).toLocaleString()} of {repo.functions.toLocaleString()} functions mapped in call graph
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Recent Commits */}
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Recent Commits</h2>
              <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                {repo.commits.map((commit, i) => (
                  <div key={commit.sha} style={{
                    padding: '14px 20px',
                    borderBottom: i < repo.commits.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                      <code style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--purple-400)', background: 'rgba(139,92,246,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                        {commit.sha}
                      </code>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{commit.time}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 4 }}>{commit.message}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      👤 {commit.author} · {commit.filesChanged} file{commit.filesChanged !== 1 ? 's' : ''} changed
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Repo Activity */}
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Ripple Activity</h2>
              {events.length === 0 ? (
                <div className="glass-card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                  No activity yet for this repo.
                </div>
              ) : (
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                  {events.map((event, i) => {
                    const ec = EVENT_CONFIG[event.type];
                    return (
                      <div key={i} style={{
                        padding: '14px 20px',
                        borderBottom: i < events.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: ec.bg, color: ec.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, flexShrink: 0,
                        }}>{ec.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{event.msg}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                            {event.user === 'system' ? '🤖 system' : `👤 ${event.user}`} · {event.time}
                          </div>
                        </div>
                        {event.severity !== 'none' && (
                          <div className={`badge badge-${event.severity === 'high' ? 'red' : event.severity === 'medium' ? 'orange' : 'yellow'}`}
                            style={{ fontSize: 9, flexShrink: 0 }}>
                            {event.severity.toUpperCase()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Switch repo quick links */}
              {REPOS.filter((r) => r.id !== repo.id).length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                    Other repositories
                  </div>
                  <div className="flex flex-col gap-2">
                    {REPOS.filter((r) => r.id !== repo.id).map((r) => (
                      <button
                        key={r.id}
                        onClick={() => router.push(`/dashboard/repo/${r.id}`)}
                        className="card"
                        style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: '1px solid var(--border-subtle)', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'Inter, sans-serif' }}
                      >
                        <div className={`status-dot ${r.status}`} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{r.org} / <span style={{ color: 'var(--purple-400)' }}>{r.name}</span></div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>⎇ {r.branch} · {r.functions.toLocaleString()} functions</div>
                        </div>
                        <span style={{ color: 'var(--text-muted)' }}>›</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
