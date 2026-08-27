'use client';
import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { INTEGRATIONS, WEBHOOK_EVENTS, REPOS } from '../lib/data';

export default function IntegrationsPage() {
  const [connected, setConnected] = useState<Record<string, boolean>>(
    Object.fromEntries(INTEGRATIONS.map((i) => [i.id, i.status === 'connected']))
  );
  const [activeTab, setActiveTab] = useState<'integrations' | 'webhooks'>('integrations');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <div className="flex" style={{ paddingTop: 'var(--nav-height)' }}>
        <Sidebar />
        <main style={{ flex: 1, marginLeft: 240, padding: '32px' }}>

          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Integrations</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Connect Ripple to the tools in your workflow</p>
          </div>

          <div className="tabs" style={{ width: 'fit-content', marginBottom: 28 }}>
            <button className={`tab ${activeTab === 'integrations' ? 'active' : ''}`}
              style={{ flex: 'unset', padding: '8px 24px' }}
              onClick={() => setActiveTab('integrations')}>
              Integrations
            </button>
            <button className={`tab ${activeTab === 'webhooks' ? 'active' : ''}`}
              style={{ flex: 'unset', padding: '8px 24px' }}
              onClick={() => setActiveTab('webhooks')}>
              Webhook Logs
            </button>
          </div>

          {activeTab === 'integrations' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
              {INTEGRATIONS.map((integ) => (
                <div key={integ.id} className="card"
                  style={{ padding: 24, borderColor: connected[integ.id] ? integ.border : 'var(--border-card)' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                    <div className="flex items-center gap-3">
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: integ.bg, border: `1px solid ${integ.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, color: integ.color,
                      }}>{integ.icon}</div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{integ.name}</div>
                        {connected[integ.id] && integ.status !== 'coming_soon' && (
                          <div className="flex items-center gap-1" style={{ marginTop: 2 }}>
                            <div className="status-dot online" style={{ width: 6, height: 6 }} />
                            <span style={{ fontSize: 11, color: 'var(--emerald-400)' }}>Connected</span>
                          </div>
                        )}
                        {integ.status === 'coming_soon' && (
                          <div className="badge badge-yellow" style={{ fontSize: 9, padding: '2px 8px', marginTop: 2 }}>Coming Soon</div>
                        )}
                      </div>
                    </div>
                    {integ.status !== 'coming_soon' && (
                      <button
                        className={`btn btn-sm ${connected[integ.id] ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ fontSize: 12, padding: '6px 14px' }}
                        onClick={() => setConnected((prev) => ({ ...prev, [integ.id]: !prev[integ.id] }))}
                      >
                        {connected[integ.id] ? 'Disconnect' : 'Connect'}
                      </button>
                    )}
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: integ.detail ? 12 : 0 }}>
                    {integ.desc}
                  </p>

                  {integ.detail && connected[integ.id] && (
                    <div style={{
                      padding: '8px 12px', background: integ.bg,
                      border: `1px solid ${integ.border}`, borderRadius: 'var(--radius-md)',
                      fontSize: 12, color: integ.color, fontFamily: 'JetBrains Mono, monospace',
                    }}>
                      {integ.detail}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'webhooks' && (
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>GitHub webhook events</span>
                <div className="flex items-center gap-2">
                  <div className="status-dot online" />
                  <span style={{ fontSize: 12, color: 'var(--emerald-400)' }}>Endpoint healthy</span>
                  <code style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                    /api/webhooks/github
                  </code>
                </div>
              </div>

              {WEBHOOK_EVENTS.map((ev, i) => {
                const repo = REPOS.find(r => r.id === ev.repoId);
                return (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '120px 1fr 100px 80px 80px',
                    gap: 16, padding: '14px 24px',
                    borderBottom: i < WEBHOOK_EVENTS.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    alignItems: 'center', fontSize: 13,
                  }}>
                    <div className="badge badge-purple" style={{ fontSize: 10, width: 'fit-content' }}>{ev.event}</div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--cyan-400)' }}>
                      {repo?.name ?? `repo#${ev.repoId}`} <span style={{ color: 'var(--text-muted)' }}>⎇ {ev.branch}</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{ev.time}</div>
                    <div>
                      {ev.status === 'ok'
                        ? <span className="badge badge-green" style={{ fontSize: 10 }}>200 OK</span>
                        : <span className="badge badge-red" style={{ fontSize: 10 }}>500 ERR</span>}
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>Replay</button>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
