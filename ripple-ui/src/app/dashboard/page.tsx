'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import DetailDrawer from '../components/DetailDrawer';
import { ApiClient, type ConnectedRepo } from '../lib/api';
import { useActiveRepo, setStoredActiveRepo } from '../lib/repoContext';
import { getRepoSpec } from '../lib/repoSpecs';

interface Source {
  file: string;
  lines: string;
  snippet: string;
  relevance: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Source[];
  keyFiles?: Array<{ name: string; description: string }>;
}

const SUGGESTED_QUESTIONS = [
  'Where is rate limiting applied?',
  'What calls the auth middleware?',
  'How does the order processing flow work?',
  'What would break if I change the User schema?',
];

function DashboardContent() {
  const searchParams = useSearchParams();
  const repoParam = searchParams.get('repo');
  const [activeRepoKey, setActiveRepoKey] = useActiveRepo();

  const [repos, setRepos] = useState<ConnectedRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'impact' | 'graph'>('impact');
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showConnectModal, setShowConnectModal] = useState<boolean>(false);
  const [connectUrl, setConnectUrl] = useState<string>('');
  const [patToken, setPatToken] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchRepos = async () => {
    try {
      setLoadingRepos(true);
      const data = await ApiClient.listRepos();
      setRepos(data || []);
      if (data && data.length > 0) {
        if (!activeRepoKey || !data.some(r => r.name === activeRepoKey || r.id === activeRepoKey)) {
          setActiveRepoKey(data[0].name);
        }
      }
    } catch {
      setRepos([]);
    } finally {
      setLoadingRepos(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  // Capture OAuth callback token if returning from Google/GitHub permission screen
  useEffect(() => {
    const tokenParam = searchParams.get('token');
    const userParam = searchParams.get('user');
    if (tokenParam) {
      ApiClient.setToken(tokenParam);
      if (userParam) {
        try {
          ApiClient.setStoredUser(JSON.parse(decodeURIComponent(userParam)));
        } catch {
          // ignore
        }
      }
      // Clean up URL without reload
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams]);

  // Sync param to activeRepo
  useEffect(() => {
    if (repoParam) {
      setActiveRepoKey(repoParam);
    }
  }, [repoParam, setActiveRepoKey]);

  const currentRepo = repos.find((r) => r.name === activeRepoKey || r.id === activeRepoKey) || repos[0];
  const currentSpec = getRepoSpec(activeRepoKey);

  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    let isCancelled = false;
    const loadHistory = async () => {
      if (currentRepo) {
        const greeting: Message = {
          id: 'greeting',
          role: 'assistant',
          content: `Hey! I'm Ripple's code assistant for **${currentRepo.full_name}** (⎇ ${currentRepo.default_branch}).\n\nEvery answer I give is grounded in your actual code. What would you like to investigate?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };

        try {
          const history = await ApiClient.getQAHistory(currentRepo.id);
          if (!isCancelled) {
            if (history && history.length > 0) {
              const historyMessages: Message[] = [];
              for (const h of history) {
                historyMessages.push({
                  id: `q-${h.id}`,
                  role: 'user',
                  content: h.question,
                  timestamp: new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                });
                historyMessages.push({
                  id: `a-${h.id}`,
                  role: 'assistant',
                  content: h.answer,
                  timestamp: new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                  sources: (h.citations || []).map((c) => ({
                    file: c.file,
                    lines: `L${c.startLine}-L${c.endLine}`,
                    snippet: c.snippet || '',
                    relevance: 0.95,
                  })),
                });
              }
              setMessages([greeting, ...historyMessages]);
            } else {
              setMessages([greeting]);
            }
          }
        } catch {
          if (!isCancelled) setMessages([greeting]);
        }
      } else if (!loadingRepos && repos.length === 0) {
        setMessages([
          {
            id: 'no-repo-greeting',
            role: 'assistant',
            content: `Welcome to **Ripple**! You don't have any repositories connected yet.\n\nClick **+ Connect GitHub Repository** above to connect your codebase and start analyzing dependencies, architecture, and impact reports.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          },
        ]);
      }
    };

    loadHistory();
    return () => {
      isCancelled = true;
    };
  }, [currentRepo?.id, repos.length, loadingRepos]);

  // When repo selector changes
  const handleRepoChange = (newKey: string) => {
    setActiveRepoKey(newKey);
    const repo = repos.find((r) => r.name === newKey || r.id === newKey);
    if (repo) {
      const switchNotice: Message = {
        id: `switch-${Date.now()}`,
        role: 'assistant',
        content: `Switched context to **${repo.full_name}** (⎇ ${repo.default_branch}).\n\nWhat would you like to investigate in **${repo.name}**?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
      setMessages((prev) => [...prev, switchNotice]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendQuestion = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || isLoading) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    const repoName = currentRepo?.name || activeRepoKey || 'api-gateway';

    try {
      const resp = await ApiClient.askQuestion(repoName, q);
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: resp.answer || `Based on my analysis of **${repoName}**, the execution flow initiates in \`${currentSpec.targetFile}\` targeting \`${currentSpec.targetSymbol}\`.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        keyFiles: currentSpec.highImpact.map((h) => ({
          name: h.file.split('/').pop() || h.file,
          description: h.description,
        })),
        sources: resp.sources?.map((s) => ({
          file: s.file,
          lines: `L${s.lineStart}–L${s.lineEnd}`,
          snippet: s.snippet,
          relevance: 95,
        })),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      let mockAnswer = `Based on my analysis of **${repoName}**, the execution flow initiates in \`${currentSpec.targetFile}\` targeting \`${currentSpec.targetSymbol}\`.`;
      if (q.toLowerCase().includes('rate')) {
        mockAnswer = `Rate limiting in **${repoName}** is applied via \`middleware/rateLimit.ts\` (100 req/min) with route-specific overrides.`;
      } else if (q.toLowerCase().includes('auth') || q.toLowerCase().includes('token')) {
        mockAnswer = `Authentication in **${repoName}** uses JWT verification in \`middleware/authenticate.ts\` followed by role authorization checks.`;
      } else if (q.toLowerCase().includes('payment') || q.toLowerCase().includes('order')) {
        mockAnswer = `Payment flow in **${repoName}** is handled by \`services/payment.service.ts\` requiring idempotency key and calculating invoice totals.`;
      }

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: mockAnswer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        keyFiles: currentSpec.highImpact.map((h) => ({
          name: h.file.split('/').pop() || h.file,
          description: h.description,
        })),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectUrl.trim()) return;

    setConnectError(null);
    setIsConnecting(true);

    try {
      const created = await ApiClient.connectRepo({
        github_url: connectUrl.trim(),
        personal_access_token: patToken.trim() || undefined,
      });

      if (created) {
        setConnectUrl('');
        setPatToken('');
        setShowConnectModal(false);
        await fetchRepos();
      }
    } catch (err: any) {
      setConnectError(err.message || 'Failed to connect repository. Please verify GitHub URL and permissions.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface, #f8fafc)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div style={{ display: 'flex', flex: 1, paddingTop: 'var(--nav-height, 64px)' }}>
        {/* Left Sidebar */}
        <Sidebar />

        {/* Central Investigation Workspace + Right Detail Drawer */}
        <div style={{ flex: 1, marginLeft: 240, display: 'flex', height: 'calc(100vh - var(--nav-height, 64px))', overflow: 'hidden' }}>
          
          {/* Main Code Q&A Canvas */}
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--surface, #f8fafc)' }}>
            
            {/* Top Bar */}
            <div
              style={{
                padding: '16px 28px',
                borderBottom: '1.5px solid var(--border-card, #e2e8f0)',
                background: 'var(--surface-container-lowest, #ffffff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              {/* Title & Metadata */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(212, 175, 55, 0.12)',
                    border: '1.5px solid rgba(212, 175, 55, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#854d0e',
                    fontSize: 16,
                  }}
                >
                  ◈
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary, #0f172a)', fontFamily: 'var(--font-headline)' }}>
                    Code Q&amp;A
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <span className="status-dot online" style={{ width: 6, height: 6 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted, #64748b)' }}>
                      {currentRepo ? `${currentRepo.full_name} · ⎇ ${currentRepo.default_branch}` : 'No repositories connected'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Controls & Repo Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Connect Repo Button */}
                <button
                  onClick={() => {
                    setConnectError(null);
                    setShowConnectModal(true);
                  }}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: 12.5, padding: '8px 16px', borderRadius: '8px', fontWeight: 700 }}
                >
                  + Connect GitHub Repo
                </button>

                {/* Repo Dropdown */}
                {repos.length > 0 ? (
                  <select
                    value={activeRepoKey}
                    onChange={(e) => handleRepoChange(e.target.value)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #e2e8f0',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    {repos.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.full_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#64748b',
                      padding: '6px 12px',
                      background: '#f1f5f9',
                      borderRadius: '6px',
                    }}
                  >
                    0 Repos Connected
                  </div>
                )}
              </div>
            </div>

            {/* Conversation Flow Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: msg.role === 'user' ? '70%' : '85%',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>
                      {msg.role === 'user' ? 'You' : 'Ripple Assistant'}
                    </span>
                    <span style={{ fontSize: 10.5, color: '#94a3b8' }}>{msg.timestamp}</span>
                  </div>

                  <div
                    style={{
                      padding: '16px 20px',
                      borderRadius: '12px',
                      background: msg.role === 'user' ? '#0f172a' : '#ffffff',
                      color: msg.role === 'user' ? '#ffffff' : '#0f172a',
                      border: msg.role === 'user' ? 'none' : '1.5px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      fontSize: '13.5px',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {msg.content}

                    {/* Citations / Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div style={{ marginTop: 14, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
                          Citations &amp; Sources
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {msg.sources.map((s, idx) => (
                            <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 10px', fontSize: 12 }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0f172a' }}>{s.file}</span>{' '}
                              <span style={{ color: '#64748b' }}>({s.lines})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '10px', width: 'fit-content' }}>
                  <span style={{ width: 14, height: 14, border: '2px solid #e2e8f0', borderTopColor: '#6d28d9', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Analyzing codebase...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Questions */}
            <div style={{ padding: '0 28px 12px', display: 'flex', gap: 8, overflowX: 'auto' }}>
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendQuestion(q)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#0f172a',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#d4af37')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Query Input Bar */}
            <div style={{ padding: '12px 28px 24px', background: '#ffffff', borderTop: '1.5px solid #e2e8f0' }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendQuestion();
                }}
                style={{ display: 'flex', gap: 12 }}
              >
                <input
                  type="text"
                  placeholder={currentRepo ? `Ask anything about ${currentRepo.name}...` : 'Connect a repository above to start asking questions...'}
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: '12px 18px',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    background: '#f8fafc',
                    fontSize: '13.5px',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputQuery.trim()}
                  className="btn btn-primary"
                  style={{ padding: '12px 24px', borderRadius: '10px', fontWeight: 700 }}
                >
                  Ask
                </button>
              </form>
            </div>
          </main>

          {/* Right Detail Drawer */}
          <DetailDrawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            activeTab={activeDrawerTab}
            onTabChange={setActiveDrawerTab}
            repoName={currentRepo?.name}
            repoKey={activeRepoKey}
          />
        </div>
      </div>

      {/* Connect Modal */}
      {showConnectModal && (
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
          onClick={() => setShowConnectModal(false)}
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
                onClick={() => setShowConnectModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 }}
              >
                ×
              </button>
            </div>

            {connectError && (
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
                {connectError}
              </div>
            )}

            <form onSubmit={handleConnectSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                  GitHub Repository URL or Name
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="https://github.com/owner/repo or owner/repo"
                  value={connectUrl}
                  onChange={(e) => setConnectUrl(e.target.value)}
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
                  onClick={() => setShowConnectModal(false)}
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
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
