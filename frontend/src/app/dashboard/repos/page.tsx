'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import { ApiClient, type ConnectedRepo } from '../../lib/api';
import { setStoredActiveRepo } from '../../lib/repoContext';

export default function ReposPage() {
  const [repos, setRepos] = useState<ConnectedRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [patToken, setPatToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchRepos = async () => {
    try {
      setLoading(true);
      const data = await ApiClient.listRepos();
      setRepos(data || []);
      if (data && data.length > 0) {
        setStoredActiveRepo(data[0].id || data[0].name);
      }
    } catch {
      setRepos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setModalError(null);
    setIsConnecting(true);

    try {
      const created = await ApiClient.connectRepo({
        github_url: repoUrl.trim(),
        personal_access_token: patToken.trim() || undefined,
      });

      if (created) {
        setRepoUrl('');
        setPatToken('');
        setShowModal(false);
        await fetchRepos();
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to connect repository. Please verify GitHub URL and permissions.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDelete = async (repoId: string, repoName: string) => {
    if (!window.confirm(`Are you sure you want to disconnect repository "${repoName}"?`)) {
      return;
    }

    try {
      setDeletingId(repoId);
      await ApiClient.deleteRepo(repoId);
      await fetchRepos();
    } catch (err: any) {
      alert(err.message || 'Failed to disconnect repository');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const indexedCount = repos.filter((r) => r.indexed_status === 'complete').length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface, #f8fafc)' }}>
      <Navbar />
      <div className="flex" style={{ paddingTop: 'var(--nav-height, 64px)' }}>
        <Sidebar />
        <main
          style={{
            flex: 1,
            marginLeft: 240,
            padding: '36px 40px 60px',
            minHeight: 'calc(100vh - var(--nav-height, 64px))',
            maxWidth: 1400,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: 32,
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted, #64748b)',
                  marginBottom: 6,
                }}
              >
                Repositories
              </div>
              <h1
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: 'var(--text-primary, #0f172a)',
                  letterSpacing: '-0.02em',
                  marginBottom: 6,
                }}
              >
                Codebase Repositories
              </h1>
              <p style={{ color: 'var(--text-secondary, #475569)', fontSize: 14 }}>
                {repos.length} connected {repos.length === 1 ? 'repository' : 'repositories'} · {indexedCount} indexed in knowledge graph
              </p>
            </div>

            <button
              className="btn btn-primary"
              id="connect-repo-btn"
              onClick={() => {
                setModalError(null);
                setShowModal(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '11px 22px',
                fontSize: 13.5,
                fontWeight: 700,
                borderRadius: '8px',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Connect GitHub Repository</span>
            </button>
          </div>

          {/* Search Bar (Only shown if repos exist) */}
          {repos.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <input
                type="text"
                className="input"
                placeholder="Search connected repositories by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  maxWidth: 420,
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-card, #e2e8f0)',
                  background: '#ffffff',
                  fontSize: '13.5px',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div
              style={{
                padding: '80px 20px',
                textAlign: 'center',
                color: '#64748b',
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                Loading repositories...
              </div>
              <p style={{ fontSize: '13.5px' }}>Fetching your connected GitHub codebases</p>
            </div>
          ) : repos.length === 0 ? (
            /* Clean Empty State */
            <div
              style={{
                padding: '64px 32px',
                textAlign: 'center',
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                maxWidth: 640,
                margin: '20px auto',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '12px',
                  background: 'rgba(139,92,246,0.1)',
                  color: '#6d28d9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  fontSize: '24px',
                }}
              >
                📁
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
                No repositories connected yet
              </h2>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, marginBottom: 28, maxWidth: 460, margin: '0 auto 28px' }}>
                Connect your real GitHub repository to generate live impact reports, call hierarchy graphs, and architectural blast radius analysis.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setModalError(null);
                  setShowModal(true);
                }}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>+</span>
                <span>Connect your GitHub repo</span>
              </button>
            </div>
          ) : (
            /* Repository Cards Grid */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                gap: 20,
              }}
            >
              {filtered.map((repo) => {
                const isComplete = repo.indexed_status === 'complete';
                const isIndexing = repo.indexed_status === 'indexing' || repo.indexed_status === 'pending';

                return (
                  <div
                    key={repo.id}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: 24,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                            {repo.full_name.split('/')[0]}
                          </div>
                          <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                            {repo.name}
                          </h3>
                        </div>

                        {/* Status Badge */}
                        <div
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 800,
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            background: isComplete ? 'rgba(22, 163, 74, 0.12)' : isIndexing ? 'rgba(234, 88, 12, 0.12)' : 'rgba(220, 38, 38, 0.12)',
                            color: isComplete ? '#16a34a' : isIndexing ? '#ea580c' : '#dc2626',
                            border: `1px solid ${isComplete ? '#16a34a' : isIndexing ? '#ea580c' : '#dc2626'}`,
                            textTransform: 'uppercase',
                          }}
                        >
                          {repo.indexed_status}
                        </div>
                      </div>

                      <div style={{ fontSize: '12.5px', color: '#475569', marginBottom: 16 }}>
                        Branch: <code style={{ fontFamily: 'var(--font-mono)', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, color: '#0f172a' }}>{repo.default_branch}</code>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: 16, marginTop: 8 }}>
                      <a
                        href={repo.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '12.5px',
                          color: '#6d28d9',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span>GitHub</span>
                        <span>↗</span>
                      </a>

                      <button
                        onClick={() => handleDelete(repo.id, repo.name)}
                        disabled={deletingId === repo.id}
                        style={{
                          fontSize: '12px',
                          color: '#dc2626',
                          fontWeight: 700,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        {deletingId === repo.id ? 'Disconnecting...' : 'Disconnect'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Connect Modal */}
          {showModal && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                padding: '24px',
              }}
              onClick={() => setShowModal(false)}
            >
              <div
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: 32,
                  maxWidth: 480,
                  width: '100%',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                    Connect GitHub Repository
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 }}
                  >
                    ×
                  </button>
                </div>

                {modalError && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#fef2f2',
                      border: '1.5px solid #fecaca',
                      color: '#991b1b',
                      fontSize: '12.5px',
                      marginBottom: 16,
                    }}
                  >
                    {modalError}
                  </div>
                )}

                <form onSubmit={handleConnect}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                      GitHub Repository URL or Name
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="https://github.com/owner/repo or owner/repo"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1.5px solid #e2e8f0',
                        fontSize: '13.5px',
                        outline: 'none',
                      }}
                    />
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: 4 }}>
                      e.g. <code>https://github.com/facebook/react</code> or <code>my-username/my-repo</code>
                    </div>
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                      Personal Access Token (Optional for Private Repos)
                    </label>
                    <input
                      type="password"
                      className="input"
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      value={patToken}
                      onChange={(e) => setPatToken(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1.5px solid #e2e8f0',
                        fontSize: '13.5px',
                        outline: 'none',
                      }}
                    />
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: 4 }}>
                      Required only if your repository is private on GitHub
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowModal(false)}
                      style={{ padding: '10px 18px', fontSize: '13px', fontWeight: 600 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isConnecting}
                      style={{ padding: '10px 20px', fontSize: '13px', fontWeight: 700 }}
                    >
                      {isConnecting ? 'Verifying with GitHub...' : 'Connect Repository'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
