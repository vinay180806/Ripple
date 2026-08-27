'use client';
import { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import { ACTIVITY_EVENTS, REPOS, EVENT_CONFIG } from '../../lib/data';

type FilterType = 'All' | 'Push' | 'Impact' | 'Indexing' | 'Q&A';

const FILTER_MAP: Record<FilterType, string | null> = {
  All: null,
  Push: 'push',
  Impact: 'impact',
  Indexing: 'index',
  'Q&A': 'qa',
};

const SEVERITY_BADGE: Record<string, string | null> = {
  high: 'badge-red',
  medium: 'badge-orange',
  low: 'badge-yellow',
  none: null,
};

export default function ActivityPage() {
  const [filter, setFilter] = useState<FilterType>('All');

  const filtered = FILTER_MAP[filter]
    ? ACTIVITY_EVENTS.filter((e) => e.type === FILTER_MAP[filter])
    : ACTIVITY_EVENTS;

  const pushCount = ACTIVITY_EVENTS.filter(e => e.type === 'push').length;
  const impactCount = ACTIVITY_EVENTS.filter(e => e.type === 'impact').length;
  const indexCount = ACTIVITY_EVENTS.filter(e => e.type === 'index').length;
  const qaCount = ACTIVITY_EVENTS.filter(e => e.type === 'qa').length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <div className="flex" style={{ paddingTop: 'var(--nav-height)' }}>
        <Sidebar />
        <main style={{ flex: 1, marginLeft: 240, padding: '32px' }}>

          <div className="flex items-center justify-between" style={{ marginBottom: 32 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Activity</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>All events across your connected repositories</p>
            </div>
            <div className="flex items-center gap-2">
              {(Object.keys(FILTER_MAP) as FilterType[]).map((f) => (
                <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: 12 }} onClick={() => setFilter(f)}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Summary strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
            {[
              { label: 'Pushes', value: pushCount, icon: '⬆', color: 'var(--purple-400)' },
              { label: 'Impact reports', value: impactCount, icon: '⚡', color: 'var(--orange-400)' },
              { label: 'Index jobs', value: indexCount, icon: '◷', color: 'var(--cyan-400)' },
              { label: 'Q&A queries', value: qaCount, icon: '◈', color: 'var(--emerald-400)' },
            ].map((s) => (
              <div key={s.label} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `${s.color}18`, border: `1px solid ${s.color}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, color: s.color, flexShrink: 0,
                }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Event Feed */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Event log</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} events</span>
            </div>

            {filtered.map((event, i) => {
              const ec = EVENT_CONFIG[event.type];
              const repo = REPOS.find(r => r.id === event.repoId);
              const badgeClass = SEVERITY_BADGE[event.severity];
              return (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '40px 1fr auto',
                  gap: 16, padding: '16px 24px',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  alignItems: 'center', transition: 'background 0.15s',
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(139,92,246,0.03)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 9,
                    background: ec.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, color: ec.color, flexShrink: 0,
                  }}>{ec.icon}</div>

                  <div>
                    <div className="flex items-center gap-2" style={{ marginBottom: 4, flexWrap: 'wrap' }}>
                      <span className="badge badge-purple" style={{ fontSize: 10 }}>{ec.label}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--cyan-400)' }}>
                        {repo?.name ?? `repo#${event.repoId}`}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>⎇ {event.branch}</span>
                      {event.commit && (
                        <code style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '1px 6px', fontFamily: 'JetBrains Mono, monospace' }}>
                          {event.commit}
                        </code>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{event.msg}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      {event.user === 'system' ? '🤖 system' : `👤 ${event.user}`} · {event.time}
                    </div>
                  </div>

                  <div>
                    {badgeClass && (
                      <span className={`badge ${badgeClass}`} style={{ fontSize: 10 }}>
                        {event.severity.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                No {filter.toLowerCase()} events found.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
