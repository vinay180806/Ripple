'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import { ACTIVITY_EVENTS, REPOS, type EventType } from '../../lib/data';
import { ApiClient } from '../../lib/api';

type FilterType = 'All' | 'Push' | 'Impact' | 'Indexing' | 'Q&A';

const FILTER_MAP: Record<FilterType, EventType | null> = {
  All: null,
  Push: 'push',
  Impact: 'impact',
  Indexing: 'index',
  'Q&A': 'qa',
};

export default function ActivityPage() {
  const router = useRouter();
  const [filterType, setFilterType] = useState<FilterType>('All');
  const [selectedRepoId, setSelectedRepoId] = useState<number | 'all'>('all');
  const [liveActivities, setLiveActivities] = useState<any[]>([]);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const logs = await ApiClient.getActivityLog();
        if (logs && logs.length > 0) {
          const mapped = logs.map((l, idx) => ({
            id: idx + 1,
            type: (l.type === 'repo_connected' ? 'push' : l.type === 'qa_query' ? 'qa' : l.type === 'impact_analyzed' ? 'impact' : 'index') as EventType,
            title: l.title,
            description: l.description,
            timestamp: new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            repoId: 1,
            repoName: (l.metadata?.repo_name as string) || (l.metadata?.full_name as string) || 'Active Repository',
            author: 'Current User',
            hash: 'head',
            meta: {},
          }));
          setLiveActivities(mapped);
        }
      } catch {
        // ignore
      }
    };
    fetchActivities();
  }, []);

  const eventList = liveActivities.length > 0 ? liveActivities : ACTIVITY_EVENTS;
  const pushCount = eventList.filter((e) => e.type === 'push').length;
  const impactCount = eventList.filter((e) => e.type === 'impact').length;
  const indexCount = eventList.filter((e) => e.type === 'index').length;
  const qaCount = eventList.filter((e) => e.type === 'qa').length;

  const filtered = eventList.filter((event) => {
    const matchesType = FILTER_MAP[filterType] ? event.type === FILTER_MAP[filterType] : true;
    const matchesRepo = selectedRepoId === 'all' ? true : event.repoId === selectedRepoId;
    return matchesType && matchesRepo;
  });

  const getEventIcon = (type: EventType) => {
    switch (type) {
      case 'push':
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="3" x2="6" y2="15" />
            <circle cx="18" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <path d="M18 9a9 9 0 0 1-9 9" />
          </svg>
        );
      case 'impact':
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        );
      case 'index':
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        );
      case 'qa':
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
    }
  };

  const getEventBadgeLabel = (type: EventType) => {
    switch (type) {
      case 'push':
        return 'Push Update';
      case 'impact':
        return 'Impact Report';
      case 'index':
        return 'Indexing';
      case 'qa':
        return 'Code Q&A';
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
              Activity Log
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
              Codebase Event Timeline
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Chronological log of AST indexing, push triggers, impact blast radius evaluations, and developer queries.
            </p>
          </div>

          {/* Metric Stats Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
              marginBottom: 32,
            }}
          >
            {[
              {
                label: 'Code Pushes',
                count: pushCount,
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="6" y1="3" x2="6" y2="15" />
                    <circle cx="18" cy="6" r="3" />
                    <circle cx="6" cy="18" r="3" />
                    <path d="M18 9a9 9 0 0 1-9 9" />
                  </svg>
                ),
                typeFilter: 'Push' as FilterType,
              },
              {
                label: 'Impact Reports',
                count: impactCount,
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                ),
                typeFilter: 'Impact' as FilterType,
              },
              {
                label: 'Index Jobs',
                count: indexCount,
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                ),
                typeFilter: 'Indexing' as FilterType,
              },
              {
                label: 'Q&A Inquiries',
                count: qaCount,
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                ),
                typeFilter: 'Q&A' as FilterType,
              },
            ].map((stat) => {
              const isSelected = filterType === stat.typeFilter;
              return (
                <div
                  key={stat.label}
                  className="card"
                  onClick={() => setFilterType(isSelected ? 'All' : stat.typeFilter)}
                  style={{
                    padding: '16px 20px',
                    borderRadius: 'var(--radius-lg)',
                    background: isSelected ? 'rgba(212, 175, 55, 0.08)' : 'var(--surface-container-lowest)',
                    border: isSelected ? '1px solid var(--gold-border)' : '1px solid var(--border-card)',
                    boxShadow: 'var(--shadow-card)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '10px',
                      background: 'var(--surface-container-low)',
                      border: '1px solid var(--border-card)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isSelected ? 'var(--gold-dim)' : 'var(--text-primary)',
                      flexShrink: 0,
                    }}
                  >
                    {stat.icon}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-mono)',
                        lineHeight: 1.1,
                      }}
                    >
                      {stat.count}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, fontWeight: 500 }}>
                      {stat.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filtering Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              marginBottom: 24,
              flexWrap: 'wrap',
              padding: '14px 20px',
              background: 'var(--surface-container-lowest)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-card)',
            }}
          >
            {/* Event Type Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-muted)',
                  marginRight: 6,
                }}
              >
                Filter:
              </span>
              {(['All', 'Push', 'Impact', 'Indexing', 'Q&A'] as FilterType[]).map((f) => {
                const isActive = filterType === f;
                return (
                  <button
                    key={f}
                    onClick={() => setFilterType(f)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-xl)',
                      fontSize: 12.5,
                      fontWeight: isActive ? 600 : 500,
                      cursor: 'pointer',
                      border: isActive ? '1px solid var(--gold-border)' : '1px solid var(--border-card)',
                      background: isActive ? 'var(--gold-bg)' : 'var(--surface-container-low)',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    {f === 'All' ? 'All Events' : f}
                  </button>
                );
              })}
            </div>

            {/* Repository Filter Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                Repository:
              </span>
              <select
                value={selectedRepoId}
                onChange={(e) =>
                  setSelectedRepoId(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  background: 'var(--surface-container-low)',
                  border: '1px solid var(--border-card)',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Repositories ({REPOS.length})</option>
                {REPOS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Timeline Feed Container */}
          <div
            style={{
              background: 'var(--surface-container-lowest)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-card)',
              boxShadow: 'var(--shadow-card)',
              overflow: 'hidden',
            }}
          >
            {/* Table/List Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 24px',
                borderBottom: '1px solid var(--border-card)',
                background: 'var(--surface-container-low)',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Timeline Stream
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Showing {filtered.length} {filtered.length === 1 ? 'event' : 'events'}
              </span>
            </div>

            {/* Timeline Items */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filtered.map((event, idx) => {
                const repo = REPOS.find((r) => r.id === event.repoId);
                const isLast = idx === filtered.length - 1;

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '44px 1fr auto',
                      gap: 16,
                      padding: '18px 24px',
                      borderBottom: isLast ? 'none' : '1px solid var(--border-card)',
                      alignItems: 'flex-start',
                      transition: 'background var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-container-low)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Event Icon */}
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '10px',
                        background: 'var(--surface-container-low)',
                        border: '1px solid var(--border-card)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-primary)',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {getEventIcon(event.type)}
                    </div>

                    {/* Event Content */}
                    <div>
                      {/* Top Badges & Meta */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 6,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--surface-container-low)',
                            border: '1px solid var(--border-card)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {getEventBadgeLabel(event.type)}
                        </span>

                        <span
                          onClick={() => repo && router.push(`/dashboard/repo/${repo.id}`)}
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            textDecoration: 'none',
                          }}
                        >
                          {repo?.name ?? `repo#${event.repoId}`}
                        </span>

                        <span
                          style={{
                            fontSize: 11.5,
                            color: 'var(--text-muted)',
                            fontFamily: 'var(--font-mono)',
                            background: 'var(--surface-container-low)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-card)',
                          }}
                        >
                          ⎇ {event.branch}
                        </span>

                        {event.commit && (
                          <span
                            style={{
                              fontSize: 11,
                              fontFamily: 'var(--font-mono)',
                              color: 'var(--text-secondary)',
                              background: 'var(--surface-container-low)',
                              border: '1px solid var(--border-card)',
                              borderRadius: '4px',
                              padding: '1px 6px',
                            }}
                          >
                            {event.commit}
                          </span>
                        )}

                        {event.severity !== 'none' && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              padding: '2px 7px',
                              borderRadius: 'var(--radius-full)',
                              background:
                                event.severity === 'high'
                                  ? 'rgba(186, 26, 26, 0.08)'
                                  : event.severity === 'medium'
                                  ? 'rgba(194, 106, 10, 0.08)'
                                  : 'rgba(194, 154, 0, 0.08)',
                              border: `1px solid ${
                                event.severity === 'high'
                                  ? 'rgba(186, 26, 26, 0.22)'
                                  : event.severity === 'medium'
                                  ? 'rgba(194, 106, 10, 0.22)'
                                  : 'rgba(194, 154, 0, 0.22)'
                              }`,
                              color:
                                event.severity === 'high'
                                  ? 'var(--error)'
                                  : event.severity === 'medium'
                                  ? 'var(--orange-400)'
                                  : 'var(--yellow-400)',
                            }}
                          >
                            {event.severity} Impact
                          </span>
                        )}
                      </div>

                      {/* Main Message */}
                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                          lineHeight: 1.5,
                          marginBottom: 4,
                        }}
                      >
                        {event.msg}
                      </div>

                      {/* Actor & Timestamp */}
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        Triggered by{' '}
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {event.user === 'system' ? 'system automation' : `@${event.user}`}
                        </span>{' '}
                        · {event.time}
                      </div>
                    </div>

                    {/* Quick Link Actions */}
                    <div style={{ alignSelf: 'center' }}>
                      {event.type === 'impact' && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => router.push('/impact')}
                          style={{
                            padding: '6px 12px',
                            fontSize: 11.5,
                            borderRadius: 'var(--radius-xl)',
                          }}
                        >
                          View Impact
                        </button>
                      )}
                      {event.type === 'qa' && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => router.push('/chat')}
                          style={{
                            padding: '6px 12px',
                            fontSize: 11.5,
                            borderRadius: 'var(--radius-xl)',
                          }}
                        >
                          Inspect Query
                        </button>
                      )}
                      {(event.type === 'push' || event.type === 'index') && repo && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => router.push(`/dashboard/repo/${repo.id}`)}
                          style={{
                            padding: '6px 12px',
                            fontSize: 11.5,
                            borderRadius: 'var(--radius-xl)',
                          }}
                        >
                          Repo Details
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Empty State */}
              {filtered.length === 0 && (
                <div
                  style={{
                    padding: '60px 24px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: 'var(--surface-container-low)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 14px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    No activity events match this filter
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Try changing your event type or repository filter selection.
                  </p>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setFilterType('All');
                      setSelectedRepoId('all');
                    }}
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
