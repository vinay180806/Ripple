'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import {
  REPOS,
  ACTIVITY_EVENTS,
  EVENT_CONFIG,
  STATUS_CONFIG,
  CURRENT_USER,
} from '../lib/data';

const SUMMARY_STATS = [
  { label: 'Repositories', value: REPOS.length.toString(), icon: '◧', color: 'var(--purple-400)' },
  { label: 'Functions Indexed', value: REPOS.reduce((s, r) => s + r.functions, 0).toLocaleString(), icon: '⟟', color: 'var(--cyan-400)' },
  { label: 'Impact Reports', value: REPOS.reduce((s, r) => s + r.impactReports, 0).toString(), icon: '⚡', color: 'var(--orange-400)' },
  { label: 'Q&A Queries', value: '129', icon: '◈', color: 'var(--emerald-400)' },
];

const RECENT_ACTIVITY = ACTIVITY_EVENTS.slice(0, 5);

export default function DashboardPage() {
  const router = useRouter();
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <div className="flex" style={{ paddingTop: 'var(--nav-height)' }}>
        <Sidebar />
        <main style={{ flex: 1, marginLeft: 240, padding: '32px', minHeight: 'calc(100vh - var(--nav-height))' }}>

          {/* Header */}
          <div className="flex items-center justify-between" style={{ marginBottom: 32 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Dashboard</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                Welcome back, {CURRENT_USER.name.split(' ')[0]} — {REPOS.filter(r => r.status === 'online').length} of {REPOS.length} repos indexed
              </p>
            </div>
            <button className="btn btn-primary" id="connect-repo-btn" onClick={() => router.push('/dashboard/repos')}>
              + Connect Repo
            </button>
          </div>

          {/* Summary Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
            {SUMMARY_STATS.map((stat) => (
              <div key={stat.label} className="card" style={{ padding: '20px 24px' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 22, color: stat.color }}>{stat.icon}</span>
                  <span className="badge badge-purple" style={{ fontSize: 10 }}>+12%</span>
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>{stat.value}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
            {/* Repos */}
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Connected Repositories</h2>
                <Link href="/dashboard/repos" style={{ fontSize: 13, color: 'var(--purple-400)', textDecoration: 'none' }}>View all</Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {REPOS.map((repo) => {
                  const st = STATUS_CONFIG[repo.status];
                  return (
                    <div
                      key={repo.id}
                      className="card"
                      style={{ padding: '20px 24px', cursor: 'pointer' }}
                      onClick={() => router.push(`/dashboard/repo/${repo.id}`)}
                    >
                      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                        <div className="flex items-center gap-3">
                          <div style={{
                            width: 40, height: 40, borderRadius: 10,
                            background: 'rgba(139,92,246,0.1)', border: '1px solid var(--border-card)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                          }}>◧</div>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                              {repo.org} / <span style={{ color: 'var(--purple-400)' }}>{repo.name}</span>
                            </div>
                            <div className="flex items-center gap-2" style={{ marginTop: 3 }}>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>⎇ {repo.branch}</span>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{repo.language}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`status-dot ${st.dot}`} />
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {repo.status === 'indexing' ? 'Indexing...' : repo.lastIndexed}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{repo.functions.toLocaleString()}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Functions</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{repo.files}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Files</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: repo.coverage > 90 ? 'var(--emerald-400)' : 'var(--orange-400)' }}>{repo.coverage}%</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Graph coverage</div>
                        </div>
                      </div>

                      {repo.status === 'indexing' && (
                        <div style={{ marginTop: 16 }}>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: '45%' }} />
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Building call graph... 45%</div>
                        </div>
                      )}

                      <div className="flex items-center gap-3" style={{ marginTop: 16 }}>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}
                          onClick={(e) => { e.stopPropagation(); router.push('/impact'); }}>
                          ⚡ Impact report
                        </button>
                        <button className="btn btn-ghost btn-sm"
                          style={{ fontSize: 12, background: 'rgba(34,211,238,0.08)', color: 'var(--cyan-400)', borderColor: 'rgba(34,211,238,0.2)' }}
                          onClick={(e) => { e.stopPropagation(); router.push('/chat'); }}>
                          ◈ Ask about code
                        </button>
                        <button className="btn btn-ghost btn-sm"
                          style={{ fontSize: 12, background: 'rgba(52,211,153,0.08)', color: 'var(--emerald-400)', borderColor: 'rgba(52,211,153,0.2)' }}
                          onClick={(e) => { e.stopPropagation(); router.push('/graph'); }}>
                          ⬡ View graph
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity Feed */}
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Recent Activity</h2>
                <Link href="/dashboard/activity" style={{ fontSize: 13, color: 'var(--purple-400)', textDecoration: 'none' }}>All activity</Link>
              </div>

              <div className="glass-card" style={{ padding: '8px 0' }}>
                {RECENT_ACTIVITY.map((item, i) => {
                  const ec = EVENT_CONFIG[item.type];
                  const repo = REPOS.find(r => r.id === item.repoId);
                  return (
                    <div key={i} style={{
                      padding: '14px 20px',
                      borderBottom: i < RECENT_ACTIVITY.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    }}>
                      <div className="flex items-center gap-3">
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: ec.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, flexShrink: 0, color: ec.color,
                        }}>{ec.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.msg}
                          </div>
                          <div className="flex items-center gap-2" style={{ marginTop: 3 }}>
                            <span style={{ fontSize: 11, color: 'var(--purple-400)', fontFamily: 'JetBrains Mono, monospace' }}>
                              {repo?.name ?? `repo#${item.repoId}`}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {item.time}</span>
                          </div>
                        </div>
                        {item.severity !== 'none' && (
                          <div className={`badge badge-${item.severity === 'high' ? 'red' : item.severity === 'medium' ? 'orange' : 'green'}`} style={{ fontSize: 9, flexShrink: 0 }}>
                            {item.severity}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick actions */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Quick Actions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                    onClick={() => router.push('/impact')}>
                    <span style={{ fontSize: 18, color: 'var(--orange-400)' }}>⚡</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Run impact report</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Paste a diff or PR link</div>
                    </div>
                    <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 16 }}>›</span>
                  </div>
                  <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                    onClick={() => router.push('/chat')}>
                    <span style={{ fontSize: 18, color: 'var(--cyan-400)' }}>◈</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Ask about code</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Natural language Q&A</div>
                    </div>
                    <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 16 }}>›</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
