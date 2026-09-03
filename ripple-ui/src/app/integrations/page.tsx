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
  const [replayingId, setReplayingId] = useState<number | null>(null);

  const handleReplay = (index: number) => {
    setReplayingId(index);
    setTimeout(() => {
      setReplayingId(null);
    }, 1500);
  };

  const getIntegrationSvg = (id: string) => {
    switch (id) {
      case 'github':
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
          </svg>
        );
      case 'anthropic':
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
            <path d="M12 12L2.5 7.5" />
            <path d="M12 12v10" />
          </svg>
        );
      case 'slack':
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="13" y="2" width="3" height="8" rx="1.5" />
            <path d="M19 8.5a1.5 1.5 0 0 0-1.5-1.5H16v3h1.5A1.5 1.5 0 0 0 19 8.5z" />
            <rect x="8" y="14" width="3" height="8" rx="1.5" />
            <path d="M5 15.5A1.5 1.5 0 0 0 6.5 17H8v-3H6.5A1.5 1.5 0 0 0 5 15.5z" />
            <rect x="14" y="13" width="8" height="3" rx="1.5" />
            <path d="M15.5 19a1.5 1.5 0 0 0 1.5-1.5V16h-3v1.5a1.5 1.5 0 0 0 1.5 1.5z" />
            <rect x="2" y="8" width="8" height="3" rx="1.5" />
            <path d="M8.5 5A1.5 1.5 0 0 0 7 6.5V8h3V6.5A1.5 1.5 0 0 0 8.5 5z" />
          </svg>
        );
      case 'linear':
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        );
      case 'jira':
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        );
      case 'vscode':
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="16.5 2 7 9.5 2 6 2 18 7 14.5 16.5 22 22 18 22 6 16.5 2" />
          </svg>
        );
      default:
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
          </svg>
        );
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      <Navbar />
      <div className="flex" style={{ paddingTop: 'var(--nav-height)' }}>
        <Sidebar />
        <main
          style={{
            flex: 1,
            marginLeft: 240,
            padding: '36px 40px 60px',
            minHeight: 'calc(100vh - var(--nav-height))',
            maxWidth: 1300,
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: 6,
              }}
            >
              Extensions &amp; Pipelines
            </div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                marginBottom: 6,
              }}
            >
              Integrations &amp; Webhooks
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Connect version control systems, LLM providers, and communication channels to the Ripple AST intelligence platform.
            </p>
          </div>

          {/* Tab Navigation */}
          <div
            style={{
              display: 'inline-flex',
              padding: '4px',
              background: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-card)',
              marginBottom: 32,
              gap: 4,
            }}
          >
            <button
              onClick={() => setActiveTab('integrations')}
              style={{
                padding: '8px 22px',
                borderRadius: 'var(--radius-xl)',
                fontSize: 13,
                fontWeight: activeTab === 'integrations' ? 600 : 500,
                cursor: 'pointer',
                border: activeTab === 'integrations' ? '1px solid var(--border-card)' : '1px solid transparent',
                background: activeTab === 'integrations' ? 'var(--surface-container-lowest)' : 'transparent',
                color: activeTab === 'integrations' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: activeTab === 'integrations' ? 'var(--shadow-card)' : 'none',
                transition: 'all var(--transition-fast)',
              }}
            >
              Connected Services
            </button>
            <button
              onClick={() => setActiveTab('webhooks')}
              style={{
                padding: '8px 22px',
                borderRadius: 'var(--radius-xl)',
                fontSize: 13,
                fontWeight: activeTab === 'webhooks' ? 600 : 500,
                cursor: 'pointer',
                border: activeTab === 'webhooks' ? '1px solid var(--border-card)' : '1px solid transparent',
                background: activeTab === 'webhooks' ? 'var(--surface-container-lowest)' : 'transparent',
                color: activeTab === 'webhooks' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: activeTab === 'webhooks' ? 'var(--shadow-card)' : 'none',
                transition: 'all var(--transition-fast)',
              }}
            >
              Webhook Ingestion Logs
            </button>
          </div>

          {/* TAB 1: INTEGRATION CARDS */}
          {activeTab === 'integrations' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                gap: 24,
              }}
            >
              {INTEGRATIONS.map((integ) => {
                const isConnected = Boolean(connected[integ.id]);
                const isComingSoon = integ.status === 'coming_soon';

                return (
                  <div
                    key={integ.id}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      padding: '24px',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--surface-container-lowest)',
                      border: isConnected ? '1px solid var(--gold-border)' : '1px solid var(--border-card)',
                      boxShadow: 'var(--shadow-card)',
                      transition: 'all var(--transition-base)',
                    }}
                  >
                    <div>
                      {/* Top Row: Icon & Status */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          marginBottom: 16,
                          gap: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: '12px',
                              background: 'var(--surface-container-low)',
                              border: '1px solid var(--border-card)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-primary)',
                              flexShrink: 0,
                            }}
                          >
                            {getIntegrationSvg(integ.id)}
                          </div>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                              {integ.name}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              {integ.id === 'github'
                                ? 'Version Control & VCS'
                                : integ.id === 'anthropic'
                                ? 'LLM Intelligence'
                                : integ.id === 'slack'
                                ? 'Team Communication'
                                : integ.id === 'linear'
                                ? 'Issue Tracker'
                                : integ.id === 'jira'
                                ? 'Enterprise PM'
                                : 'Developer Tooling'}
                            </div>
                          </div>
                        </div>

                        {/* Status Pill */}
                        {isConnected && !isComingSoon && (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: 'rgba(45, 158, 95, 0.08)',
                              border: '1px solid rgba(45, 158, 95, 0.22)',
                              color: 'var(--emerald-500)',
                              flexShrink: 0,
                            }}
                          >
                            <span className="status-dot online" style={{ width: 6, height: 6 }} />
                            <span>Connected</span>
                          </div>
                        )}

                        {!isConnected && !isComingSoon && (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: 'var(--surface-container-low)',
                              border: '1px solid var(--border-card)',
                              color: 'var(--text-muted)',
                              flexShrink: 0,
                            }}
                          >
                            <span>Not Connected</span>
                          </div>
                        )}

                        {isComingSoon && (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '11px',
                              fontWeight: 700,
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase',
                              background: 'var(--gold-bg)',
                              border: '1px solid var(--gold-border)',
                              color: 'var(--gold-dim)',
                              flexShrink: 0,
                            }}
                          >
                            Coming Soon
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <p
                        style={{
                          fontSize: 13,
                          color: 'var(--text-secondary)',
                          lineHeight: 1.6,
                          marginBottom: integ.detail && isConnected ? 14 : 20,
                        }}
                      >
                        {integ.desc}
                      </p>

                      {/* Connection Details Pill */}
                      {integ.detail && isConnected && (
                        <div
                          style={{
                            padding: '8px 12px',
                            background: 'var(--surface-container-low)',
                            border: '1px solid var(--border-card)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                            fontFamily: 'var(--font-mono)',
                            marginBottom: 20,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <span style={{ color: 'var(--gold-dim)' }}>◈</span>
                          <span>{integ.detail}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div
                      style={{
                        paddingTop: 16,
                        borderTop: '1px solid var(--border-card)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      {!isComingSoon ? (
                        <button
                          className={`btn btn-sm ${isConnected ? 'btn-ghost' : 'btn-primary'}`}
                          style={{
                            fontSize: 12.5,
                            padding: '7px 16px',
                            fontWeight: 600,
                          }}
                          onClick={() =>
                            setConnected((prev) => ({ ...prev, [integ.id]: !prev[integ.id] }))
                          }
                        >
                          {isConnected ? 'Disconnect' : 'Connect Service'}
                        </button>
                      ) : (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 12, opacity: 0.6, cursor: 'not-allowed' }}
                          disabled
                        >
                          In Development
                        </button>
                      )}

                      {isConnected && !isComingSoon && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 12, color: 'var(--text-secondary)' }}
                        >
                          Configure
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: WEBHOOK INGESTION LOGS */}
          {activeTab === 'webhooks' && (
            <div
              className="card"
              style={{
                padding: 0,
                borderRadius: 'var(--radius-lg)',
                background: 'var(--surface-container-lowest)',
                border: '1px solid var(--border-card)',
                boxShadow: 'var(--shadow-card)',
                overflow: 'hidden',
              }}
            >
              {/* Header Strip */}
              <div
                style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid var(--border-card)',
                  background: 'var(--surface-container-low)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    GitHub Webhook Deliveries
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Incoming event payloads routed to AST incremental indexing daemon
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="status-dot online" style={{ width: 7, height: 7 }} />
                  <span style={{ fontSize: 12, color: 'var(--emerald-500)', fontWeight: 600 }}>
                    Endpoint Active
                  </span>
                  <code
                    style={{
                      fontSize: 11.5,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-secondary)',
                      background: 'var(--surface-container-lowest)',
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-card)',
                    }}
                  >
                    /api/webhooks/github
                  </code>
                </div>
              </div>

              {/* Table Column Headers */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '130px 1.5fr 1fr 110px 100px',
                  gap: 16,
                  padding: '12px 24px',
                  borderBottom: '1px solid var(--border-card)',
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-muted)',
                  background: 'var(--surface-container-lowest)',
                }}
              >
                <div>Event</div>
                <div>Repository &amp; Branch</div>
                <div>Delivered</div>
                <div>HTTP Status</div>
                <div style={{ textAlign: 'right' }}>Action</div>
              </div>

              {/* Event Rows */}
              <div>
                {WEBHOOK_EVENTS.map((ev, i) => {
                  const repo = REPOS.find((r) => r.id === ev.repoId);
                  const isOk = ev.status === 'ok';
                  const isReplaying = replayingId === i;
                  const isLast = i === WEBHOOK_EVENTS.length - 1;

                  return (
                    <div
                      key={i}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '130px 1.5fr 1fr 110px 100px',
                        gap: 16,
                        padding: '16px 24px',
                        borderBottom: isLast ? 'none' : '1px solid var(--border-card)',
                        alignItems: 'center',
                        fontSize: 13,
                        transition: 'background var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-container-low)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: 11,
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            letterSpacing: '0.02em',
                            textTransform: 'uppercase',
                            background: 'var(--surface-container-low)',
                            border: '1px solid var(--border-card)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {ev.event}
                        </span>
                      </div>

                      <div>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                          }}
                        >
                          {repo?.name ?? `repo#${ev.repoId}`}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11.5,
                            color: 'var(--text-muted)',
                            marginLeft: 8,
                          }}
                        >
                          ⎇ {ev.branch}
                        </span>
                      </div>

                      <div style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
                        {ev.time}
                      </div>

                      <div>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: 11,
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            background: isOk ? 'rgba(45, 158, 95, 0.08)' : 'rgba(186, 26, 26, 0.08)',
                            border: `1px solid ${isOk ? 'rgba(45, 158, 95, 0.22)' : 'rgba(186, 26, 26, 0.22)'}`,
                            color: isOk ? 'var(--emerald-500)' : 'var(--error)',
                          }}
                        >
                          {isOk ? '200 OK' : '500 ERR'}
                        </span>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11.5, padding: '4px 10px' }}
                          onClick={() => handleReplay(i)}
                          disabled={isReplaying}
                        >
                          {isReplaying ? '✓ Replayed' : 'Replay'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

