'use client';
import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { CURRENT_USER } from '../lib/data';

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: '◈' },
  { id: 'notifications', label: 'Notifications', icon: '◎' },
  { id: 'api', label: 'API Keys', icon: '⟟' },
  { id: 'billing', label: 'Billing', icon: '◧' },
  { id: 'danger', label: 'Danger Zone', icon: '⚠' },
];

const API_KEYS = [
  { name: 'Production key', key: 'rpl_prod_••••••••••••••••a3f2', created: 'Aug 1, 2026', lastUsed: '2 min ago' },
  { name: 'CI/CD key', key: 'rpl_ci_••••••••••••••••9b1c', created: 'Jul 15, 2026', lastUsed: '1 hour ago' },
];

const BILLING_USAGE = [
  { label: 'Repos', used: 3, limit: 10 },
  { label: 'Impact reports / mo', used: 47, limit: 200 },
  { label: 'Q&A queries / mo', used: 129, limit: 500 },
];

const BILLING_HISTORY = [
  { date: 'Aug 1, 2026', amount: '$29.00', status: 'Paid' },
  { date: 'Jul 1, 2026', amount: '$29.00', status: 'Paid' },
  { date: 'Jun 1, 2026', amount: '$29.00', status: 'Paid' },
];

const DANGER_ACTIONS = [
  { title: 'Delete all indexes', desc: 'Remove all call graphs and embeddings. Your repos stay connected but will need to be re-indexed.', btn: 'Delete indexes' },
  { title: 'Delete all impact reports', desc: 'Permanently delete all stored impact report history across all repositories.', btn: 'Delete reports' },
  { title: 'Delete workspace', desc: `Permanently delete the ${CURRENT_USER.workspace} workspace, all repositories, indexes, and reports. This cannot be undone.`, btn: 'Delete workspace' },
];

const NOTIFICATIONS = [
  { key: 'pushEvents', label: 'Push events', desc: 'Notify when a push triggers re-indexing' },
  { key: 'impactReports', label: 'Impact report ready', desc: 'Notify when an impact report finishes' },
  { key: 'indexingComplete', label: 'Indexing complete', desc: 'Notify when a repo finishes full indexing' },
  { key: 'qaAnswers', label: 'Q&A answers', desc: 'Notify when a long Q&A query resolves' },
  { key: 'weeklyDigest', label: 'Weekly digest', desc: 'Summary of all activity each Monday morning' },
];

const DEFAULT_NOTIFICATIONS: Record<string, boolean> = {
  pushEvents: true, impactReports: true, indexingComplete: false, qaAnswers: false, weeklyDigest: true,
};

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile');
  const [name, setName] = useState(CURRENT_USER.name);
  const [email, setEmail] = useState(CURRENT_USER.email);
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const toggleNotif = (key: string) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <div className="flex" style={{ paddingTop: 'var(--nav-height)' }}>
        <Sidebar />
        <main style={{ flex: 1, marginLeft: 240, padding: '32px' }}>

          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Settings</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Manage your account and workspace preferences</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, alignItems: 'start' }}>
            {/* Section Nav */}
            <div className="glass-card" style={{ padding: '8px 0' }}>
              {SECTIONS.map((s) => (
                <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '10px 16px',
                  background: activeSection === s.id ? 'rgba(139,92,246,0.12)' : 'none',
                  border: 'none',
                  borderRight: activeSection === s.id ? '2px solid var(--purple-500)' : '2px solid transparent',
                  color: activeSection === s.id ? 'var(--purple-400)' : 'var(--text-secondary)',
                  fontSize: 13, fontWeight: activeSection === s.id ? 600 : 400,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s', textAlign: 'left',
                }}>
                  <span>{s.icon}</span>{s.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div>
              {/* PROFILE */}
              {activeSection === 'profile' && (
                <div className="glass-card" style={{ padding: 32 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Profile</h2>
                  <div className="flex items-center gap-6" style={{ marginBottom: 32 }}>
                    <div style={{
                      width: 72, height: 72, borderRadius: '50%',
                      background: CURRENT_USER.avatarGradient,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 28, fontWeight: 800, boxShadow: '0 0 30px rgba(139,92,246,0.4)',
                    }}>{CURRENT_USER.initials}</div>
                    <div>
                      <button className="btn btn-secondary btn-sm" style={{ marginBottom: 8, display: 'block' }}>Upload photo</button>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>PNG, JPG up to 2MB</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Full name</label>
                      <input className="input" value={name} onChange={(e) => setName(e.target.value)} id="settings-name" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Email</label>
                      <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} id="settings-email" />
                    </div>
                  </div>
                  <div style={{ marginBottom: 28 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Workspace</label>
                    <input className="input" value={CURRENT_USER.workspace} readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="btn btn-primary" onClick={handleSave} id="save-profile-btn">
                      {saved ? '✓ Saved!' : 'Save changes'}
                    </button>
                    {saved && <span style={{ fontSize: 13, color: 'var(--emerald-400)' }}>Changes saved successfully</span>}
                  </div>
                </div>
              )}

              {/* NOTIFICATIONS */}
              {activeSection === 'notifications' && (
                <div className="glass-card" style={{ padding: 32 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Notification Preferences</h2>
                  {NOTIFICATIONS.map((item) => (
                    <div key={item.key} className="flex items-center justify-between"
                      style={{ padding: '16px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{item.label}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.desc}</div>
                      </div>
                      <div onClick={() => toggleNotif(item.key)} style={{
                        width: 44, height: 24, borderRadius: 12,
                        background: notifications[item.key] ? 'var(--purple-500)' : 'var(--border-card)',
                        position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s',
                        border: `1px solid ${notifications[item.key] ? 'var(--purple-400)' : 'var(--text-muted)'}`,
                      }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: '50%', background: 'white',
                          position: 'absolute', top: 2,
                          left: notifications[item.key] ? 22 : 2,
                          transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                        }} />
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={handleSave}>
                    {saved ? '✓ Saved!' : 'Save preferences'}
                  </button>
                </div>
              )}

              {/* API KEYS */}
              {activeSection === 'api' && (
                <div className="glass-card" style={{ padding: 32 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>API Keys</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 28 }}>Use these keys to access the Ripple API programmatically.</p>
                  {API_KEYS.map((k, i) => (
                    <div key={i} style={{
                      padding: '18px 20px', background: 'var(--bg-card)',
                      border: '1px solid var(--border-card)', borderRadius: 'var(--radius-md)',
                      marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{k.name}</div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--purple-400)', marginBottom: 6 }}>{k.key}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Created {k.created} · Last used {k.lastUsed}</div>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>Copy</button>
                        <button className="btn btn-sm" style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--red-400)', border: '1px solid rgba(248,113,113,0.2)', fontSize: 12 }}>Revoke</button>
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-secondary" style={{ marginTop: 8 }}>+ Generate new key</button>
                </div>
              )}

              {/* BILLING */}
              {activeSection === 'billing' && (
                <div className="glass-card" style={{ padding: 32 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Billing</h2>
                  <div style={{ padding: 24, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 'var(--radius-lg)', marginBottom: 24 }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="badge badge-purple" style={{ marginBottom: 10 }}>Current Plan</div>
                        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{CURRENT_USER.plan}</div>
                        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>$29 / month · renews Sep 1, 2026</div>
                      </div>
                      <button className="btn btn-secondary">Change plan</button>
                    </div>
                    <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                      {BILLING_USAGE.map((u) => (
                        <div key={u.label}>
                          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.label}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.used}/{u.limit}</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${(u.used / u.limit) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Billing history</h3>
                  {BILLING_HISTORY.map((inv, i) => (
                    <div key={i} className="flex items-center justify-between" style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{inv.date}</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{inv.amount}</div>
                      <div className="badge badge-green" style={{ fontSize: 10 }}>{inv.status}</div>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>Download</button>
                    </div>
                  ))}
                </div>
              )}

              {/* DANGER ZONE */}
              {activeSection === 'danger' && (
                <div className="glass-card" style={{ padding: 32, borderColor: 'rgba(248,113,113,0.2)' }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, color: 'var(--red-400)' }}>Danger Zone</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 28 }}>These actions are irreversible. Please be certain before proceeding.</p>
                  {DANGER_ACTIONS.map((item, i) => (
                    <div key={i} style={{
                      padding: 20, background: 'rgba(248,113,113,0.04)',
                      border: '1px solid rgba(248,113,113,0.15)', borderRadius: 'var(--radius-md)',
                      marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24,
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 480 }}>{item.desc}</div>
                      </div>
                      <button className="btn btn-danger btn-sm" style={{ flexShrink: 0, fontSize: 13, padding: '8px 16px' }}>
                        {item.btn}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
