'use client';
import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { CURRENT_USER } from '../lib/data';
import { ApiClient, UserProfileData } from '../lib/api';

interface Section {
  id: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

const SECTIONS: Section[] = [
  {
    id: 'profile',
    label: 'Profile & Account',
    icon: (active) => (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: (active) => (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    id: 'api',
    label: 'API Keys',
    icon: (active) => (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-1.5 1.5L14 9m0 0l-3 3 2 2 3-3m-2-2l1.5-1.5M3 21l7-7" />
        <circle cx="7.5" cy="16.5" r="3.5" />
      </svg>
    ),
  },
  {
    id: 'billing',
    label: 'Billing & Usage',
    icon: (active) => (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    id: 'danger',
    label: 'Danger Zone',
    icon: (active) => (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
];

const API_KEYS = [
  { name: 'Production API Key', key: 'rpl_prod_9a2f7c81d3e4b5a6c7d8e9f0', created: 'Aug 1, 2026', lastUsed: '2 min ago' },
  { name: 'CI/CD Pipeline Key', key: 'rpl_ci_4f1b2c3d4e5f6a7b8c9d0e1f', created: 'Jul 15, 2026', lastUsed: '1 hour ago' },
];

const BILLING_USAGE = [
  { label: 'Indexed Repositories', used: 3, limit: 10 },
  { label: 'Impact Reports / month', used: 47, limit: 200 },
  { label: 'Q&A Code Queries / month', used: 129, limit: 500 },
];

const BILLING_HISTORY = [
  { date: 'Aug 1, 2026', amount: '$29.00', status: 'Paid', invoiceId: 'INV-2026-08' },
  { date: 'Jul 1, 2026', amount: '$29.00', status: 'Paid', invoiceId: 'INV-2026-07' },
  { date: 'Jun 1, 2026', amount: '$29.00', status: 'Paid', invoiceId: 'INV-2026-06' },
];

const NOTIFICATION_ITEMS = [
  { key: 'pushEvents', label: 'Push & Webhook Triggers', desc: 'Notify when repository commits trigger automatic call graph re-indexing' },
  { key: 'impactReports', label: 'Impact Report Completed', desc: 'Notify when a blast radius impact report finishes calculation' },
  { key: 'indexingComplete', label: 'Full Repository Indexing', desc: 'Notify when a new repository completes full AST vectorization' },
  { key: 'qaAnswers', label: 'Q&A Query Resolution', desc: 'Notify when a complex codebase inquiry completes grounded synthesis' },
  { key: 'weeklyDigest', label: 'Weekly Architecture Digest', desc: 'Receive a summary of symbol changes, new callers, and call-graph metrics every Monday' },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile');
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const stored = ApiClient.getStoredUser();
      if (stored) {
        setUser(stored);
        setName(stored.username);
        setEmail(stored.email);
      }
      try {
        const live = await ApiClient.getMe();
        if (live) {
          setUser(live);
          setName(live.username);
          setEmail(live.email);
        }
      } catch {
        // use stored
      }
    };
    loadProfile();
  }, []);

  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    pushEvents: true,
    impactReports: true,
    indexingComplete: false,
    qaAnswers: false,
    weeklyDigest: true,
  });

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await ApiClient.updateProfile({ username: name.trim() });
      setUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const toggleNotif = (key: string) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
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
              System Preferences
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
              Settings &amp; Workspace
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Manage developer account, notification channels, API tokens, and subscription tiers.
            </p>
          </div>

          {/* 2-Column Settings Layout */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '230px 1fr',
              gap: 28,
              alignItems: 'flex-start',
            }}
          >
            {/* Left Nav Menu */}
            <div
              style={{
                background: 'var(--surface-container-lowest)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-lg)',
                padding: '8px',
                boxShadow: 'var(--shadow-card)',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              {SECTIONS.map((s) => {
                const isActive = activeSection === s.id;
                const isDanger = s.id === 'danger';
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: isActive
                        ? isDanger
                          ? 'rgba(186, 26, 26, 0.08)'
                          : 'var(--gold-bg)'
                        : 'transparent',
                      border: isActive
                        ? isDanger
                          ? '1px solid rgba(186, 26, 26, 0.22)'
                          : '1px solid var(--gold-border)'
                        : '1px solid transparent',
                      color: isActive
                        ? isDanger
                          ? 'var(--error)'
                          : 'var(--text-primary)'
                        : isDanger
                        ? 'var(--error)'
                        : 'var(--text-secondary)',
                      fontSize: 13.5,
                      fontWeight: isActive ? 600 : 500,
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      textAlign: 'left',
                    }}
                  >
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        color: isActive
                          ? isDanger
                            ? 'var(--error)'
                            : 'var(--text-primary)'
                          : isDanger
                          ? 'var(--error)'
                          : 'var(--text-muted)',
                      }}
                    >
                      {s.icon(isActive)}
                    </span>
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Content Panel */}
            <div style={{ minWidth: 0 }}>
              {/* PROFILE SECTION */}
              {activeSection === 'profile' && (
                <div
                  className="card"
                  style={{
                    padding: '32px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--surface-container-lowest)',
                    border: '1px solid var(--border-card)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>
                    Profile &amp; Account
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, marginBottom: 28 }}>
                    Personal information and organization workspace association.
                  </p>

                  {/* Avatar Banner */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 20,
                      padding: '18px 22px',
                      background: 'var(--surface-container-low)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-card)',
                      marginBottom: 28,
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {(name[0] || user?.username?.[0] || 'U').toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {name || user?.username || 'User'}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
                        {email || user?.email || 'user@example.com'} · Ripple Member
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
                      Change Avatar
                    </button>
                  </div>

                  {/* Form fields */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          marginBottom: 8,
                        }}
                      >
                        Full Name
                      </label>
                      <input
                        className="input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        id="settings-name"
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          marginBottom: 8,
                        }}
                      >
                        Email Address
                      </label>
                      <input
                        className="input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        id="settings-email"
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 28 }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        marginBottom: 8,
                      }}
                    >
                      Workspace Organization
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="input"
                        value={CURRENT_USER.workspace}
                        readOnly
                        style={{
                          background: 'var(--surface-container-low)',
                          cursor: 'not-allowed',
                          paddingRight: 100,
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                        }}
                      >
                        Enterprise
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleSave}
                      disabled={saving}
                      id="save-profile-btn"
                      style={{ padding: '9px 24px', fontSize: 13, fontWeight: 600 }}
                    >
                      {saving ? 'Saving...' : saved ? '✓ Saved Changes' : 'Save Changes'}
                    </button>
                    {saved && (
                      <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 500 }}>
                        Your profile has been saved.
                      </span>
                    )}
                    {error && (
                      <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
                        {error}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* NOTIFICATIONS SECTION */}
              {activeSection === 'notifications' && (
                <div
                  className="card"
                  style={{
                    padding: '32px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--surface-container-lowest)',
                    border: '1px solid var(--border-card)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>
                    Notification Preferences
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, marginBottom: 24 }}>
                    Choose which indexing events and impact calculations deliver system alerts.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {NOTIFICATION_ITEMS.map((item, idx) => {
                      const isLast = idx === NOTIFICATION_ITEMS.length - 1;
                      const isChecked = Boolean(notifications[item.key]);

                      return (
                        <div
                          key={item.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '18px 0',
                            borderBottom: isLast ? 'none' : '1px solid var(--border-card)',
                            gap: 20,
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
                              {item.label}
                            </div>
                            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                              {item.desc}
                            </div>
                          </div>

                          {/* Toggle Switch */}
                          <div
                            onClick={() => toggleNotif(item.key)}
                            style={{
                              width: 44,
                              height: 24,
                              borderRadius: 12,
                              background: isChecked ? 'var(--primary)' : 'var(--surface-container-high)',
                              position: 'relative',
                              cursor: 'pointer',
                              flexShrink: 0,
                              transition: 'background var(--transition-fast)',
                            }}
                          >
                            <div
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                background: '#ffffff',
                                position: 'absolute',
                                top: 3,
                                left: isChecked ? 23 : 3,
                                transition: 'left var(--transition-fast)',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 24, padding: '9px 24px', fontSize: 13 }}
                    onClick={handleSave}
                  >
                    {saved ? '✓ Preferences Saved' : 'Save Preferences'}
                  </button>
                </div>
              )}

              {/* API KEYS SECTION */}
              {activeSection === 'api' && (
                <div
                  className="card"
                  style={{
                    padding: '32px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--surface-container-lowest)',
                    border: '1px solid var(--border-card)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 16,
                      marginBottom: 24,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>
                        API Access Tokens
                      </h2>
                      <p style={{ color: 'var(--text-secondary)', fontSize: 13.5 }}>
                        Use these programmatic keys to query AST call graphs and trigger impact evaluations via CLI.
                      </p>
                    </div>

                    <button className="btn btn-secondary btn-sm" style={{ fontSize: 12.5, padding: '8px 16px' }}>
                      + Generate New Key
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {API_KEYS.map((k, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '18px 20px',
                          background: 'var(--surface-container-low)',
                          border: '1px solid var(--border-card)',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 16,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                            {k.name}
                          </div>
                          <div
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 12.5,
                              color: 'var(--gold-dim)',
                              marginBottom: 6,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {k.key.substring(0, 12)}••••••••••••••••{k.key.substring(k.key.length - 4)}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                            Created {k.created} · Last active {k.lastUsed}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 12, padding: '6px 14px' }}
                            onClick={() => copyToClipboard(k.key)}
                          >
                            {copiedKey === k.key ? '✓ Copied' : 'Copy'}
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{
                              fontSize: 12,
                              padding: '6px 14px',
                              background: 'rgba(186, 26, 26, 0.08)',
                              color: 'var(--error)',
                              border: '1px solid rgba(186, 26, 26, 0.22)',
                            }}
                          >
                            Revoke
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BILLING SECTION */}
              {activeSection === 'billing' && (
                <div
                  className="card"
                  style={{
                    padding: '32px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--surface-container-lowest)',
                    border: '1px solid var(--border-card)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>
                    Subscription &amp; Usage
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, marginBottom: 24 }}>
                    Manage team plan limits and view past billing statements.
                  </p>

                  {/* Plan Card */}
                  <div
                    style={{
                      padding: '24px',
                      background: 'var(--surface-container-low)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-lg)',
                      marginBottom: 28,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        marginBottom: 20,
                        gap: 16,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            background: 'var(--gold-bg)',
                            color: 'var(--gold-dim)',
                            border: '1px solid var(--gold-border)',
                            marginBottom: 8,
                          }}
                        >
                          Current Tier
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
                          {CURRENT_USER.plan} Developer Workspace
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          $29.00 / month · Next billing cycle on Oct 1, 2026
                        </div>
                      </div>

                      <button className="btn btn-secondary btn-sm" style={{ fontSize: 12.5 }}>
                        Change Tier
                      </button>
                    </div>

                    {/* Usage Meters */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                      {BILLING_USAGE.map((u) => {
                        const pct = Math.round((u.used / u.limit) * 100);
                        return (
                          <div
                            key={u.label}
                            style={{
                              padding: '14px',
                              background: 'var(--surface-container-lowest)',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border-card)',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: 12,
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                marginBottom: 6,
                              }}
                            >
                              <span>{u.label}</span>
                              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                                {u.used}/{u.limit}
                              </span>
                            </div>
                            <div className="progress-bar" style={{ height: 6 }}>
                              <div className="progress-fill" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Billing History */}
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)' }}>
                    Payment History
                  </h3>
                  <div
                    style={{
                      background: 'var(--surface-container-low)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-card)',
                      overflow: 'hidden',
                    }}
                  >
                    {BILLING_HISTORY.map((inv, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '14px 20px',
                          borderBottom: i < BILLING_HISTORY.length - 1 ? '1px solid var(--border-card)' : 'none',
                          fontSize: 13,
                        }}
                      >
                        <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{inv.date}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: 12 }}>
                          {inv.invoiceId}
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{inv.amount}</div>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--emerald-500)',
                            background: 'rgba(45, 158, 95, 0.08)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            border: '1px solid rgba(45, 158, 95, 0.22)',
                          }}
                        >
                          {inv.status}
                        </span>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11.5, padding: '4px 10px' }}>
                          PDF Receipt
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DANGER ZONE SECTION */}
              {activeSection === 'danger' && (
                <div
                  className="card"
                  style={{
                    padding: '32px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--surface-container-lowest)',
                    border: '1px solid rgba(186, 26, 26, 0.25)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <h2 style={{ fontSize: 19, fontWeight: 700, color: 'var(--error)' }}>
                      Danger Zone
                    </h2>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, marginBottom: 24 }}>
                    Actions in this section permanently delete codebase knowledge graphs and cannot be undone.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[
                      {
                        title: 'Purge AST Call Graph Indexes',
                        desc: 'Deletes all parsed symbol trees, caller/callee links, and embeddings. Repositories remain connected but require complete re-indexing.',
                        action: 'Purge Indexes',
                      },
                      {
                        title: 'Delete Impact Report History',
                        desc: 'Permanently deletes all stored blast radius evaluations, affected symbol snapshots, and diff comparisons across all repositories.',
                        action: 'Delete Reports',
                      },
                      {
                        title: 'Delete Entire Workspace',
                        desc: `Permanently destroy the ${CURRENT_USER.workspace} workspace, all repository connections, API tokens, and member accounts.`,
                        action: 'Delete Workspace',
                      },
                    ].map((item, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '20px',
                          background: 'rgba(186, 26, 26, 0.03)',
                          border: '1px solid rgba(186, 26, 26, 0.15)',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 24,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', maxWidth: 520, lineHeight: 1.5 }}>
                            {item.desc}
                          </div>
                        </div>

                        <button
                          className="btn btn-sm"
                          style={{
                            flexShrink: 0,
                            fontSize: 12.5,
                            padding: '8px 16px',
                            background: 'rgba(186, 26, 26, 0.08)',
                            color: 'var(--error)',
                            border: '1px solid rgba(186, 26, 26, 0.25)',
                            fontWeight: 600,
                          }}
                        >
                          {item.action}
                        </button>
                      </div>
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

