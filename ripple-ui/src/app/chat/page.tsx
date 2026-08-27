'use client';
import { useState, useRef, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

// ─── Single source of truth for repo data ────────────────────────────────────
const REPOS: Record<string, { name: string; org: string; functions: number; files: number; branch: string }> = {
  'api-gateway': {
    name: 'api-gateway',
    org: 'acme-corp',
    functions: 847,
    files: 132,
    branch: 'main',
  },
  'payment-service': {
    name: 'payment-service',
    org: 'acme-corp',
    functions: 312,
    files: 58,
    branch: 'main',
  },
  'user-auth': {
    name: 'user-auth',
    org: 'acme-corp',
    functions: 195,
    files: 41,
    branch: 'develop',
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  timestamp: Date;
  repo?: string; // which repo was active when this message was sent
}

interface Source {
  file: string;
  lines: string;
  snippet: string;
  relevance: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeGreeting(repoKey: string): Message {
  const repo = REPOS[repoKey];
  return {
    role: 'assistant',
    content: `Hey! I'm Ripple's code assistant for **${repo.org} / ${repo.name}** (⎇ ${repo.branch}). I have full knowledge of ${repo.functions.toLocaleString()} functions across ${repo.files} files.\n\nEvery answer I give is grounded in your actual code — I'll cite the exact file and line range. What do you want to know?`,
    timestamp: new Date(),
    repo: repoKey,
  };
}

// ─── Mock responses (repo-name interpolated at call time) ────────────────────
function getMockResponse(query: string, repoKey: string): { content: string; sources: Source[] } {
  const repo = REPOS[repoKey];

  if (query.toLowerCase().includes('rate')) {
    return {
      content: `Rate limiting in **${repo.org} / ${repo.name}** is applied at two layers:\n\n**1. Global middleware** — \`middleware/rateLimit.ts\` applies a default of 100 req/min per IP using Redis sliding window.\n\n**2. Route-specific overrides** — \`routes/api/payments.ts\` and \`routes/api/auth.ts\` apply tighter limits (20 req/min and 10 req/min respectively).\n\nThe middleware chain is: \`express.Router\` → \`globalRateLimit\` → \`routeRateLimit\` → handler.\n\n> ⚠️ **Note**: All symbols above are confirmed in the **${repo.name}** call graph — 0 hallucinations detected.`,
      sources: [
        { file: 'middleware/rateLimit.ts', lines: 'L1–L45', snippet: 'export const globalRateLimit = rateLimit({ windowMs: 60_000, max: 100 })', relevance: 99 },
        { file: 'routes/api/payments.ts', lines: 'L8–L12', snippet: 'router.use(rateLimit({ max: 20 }))', relevance: 88 },
        { file: 'routes/api/auth.ts', lines: 'L6–L10', snippet: 'router.use(rateLimit({ max: 10 }))', relevance: 85 },
      ],
    };
  }

  if (query.toLowerCase().includes('auth')) {
    return {
      content: `In **${repo.org} / ${repo.name}**, the auth middleware is called by **${Math.min(repo.functions, 12)} routes** across \`routes/\`.\n\nThe primary chain is: incoming request → \`middleware/authenticate.ts\` (JWT verification) → \`middleware/authorize.ts\` (role check) → route handler.\n\n> ⚠️ **Note**: All symbols above are confirmed in the **${repo.name}** call graph — 0 hallucinations detected.`,
      sources: [
        { file: 'middleware/authenticate.ts', lines: 'L1–L38', snippet: `export const authenticate = async (req, res, next) => { /* JWT verify */ }`, relevance: 97 },
        { file: 'middleware/authorize.ts', lines: 'L1–L29', snippet: 'export const authorize = (roles: Role[]) => (req, res, next) => { ... }', relevance: 91 },
      ],
    };
  }

  // Default response — dynamically references the selected repo
  return {
    content: `Based on my analysis of the **${repo.org} / ${repo.name}** call graph and retrieved context:\n\nThis repo contains **${repo.functions.toLocaleString()} functions** across **${repo.files} files** on branch ⎇ \`${repo.branch}\`.\n\nFor your query, the most relevant entry point is \`services/core.ts\` which is called by **${Math.ceil(repo.functions / 60)} downstream modules** in the dependency tree.\n\n> ⚠️ **Note**: This answer is grounded in graph facts from **${repo.name}**. Any symbol I mention exists in your codebase — I cannot hallucinate file paths or function names.`,
    sources: [
      { file: 'services/core.ts', lines: 'L12–L55', snippet: `export function initCore(config: ${repo.name.replace(/-/g, '')}Config)`, relevance: 95 },
      { file: 'services/index.ts', lines: 'L1–L20', snippet: `export * from './core'`, relevance: 82 },
    ],
  };
}

// ─── Suggested questions (generic — repo-agnostic) ────────────────────────────
const SUGGESTED_QUESTIONS = [
  'Where is rate limiting applied?',
  'What calls the auth middleware?',
  'How does the order processing flow work?',
  'What would break if I change the User schema?',
];

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '4px 0' }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--purple-400)',
          animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

// ─── Format markdown-like content ────────────────────────────────────────────
function formatContent(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>')
    .replace(/`(.*?)`/g, '<code style="font-family:JetBrains Mono,monospace;font-size:12px;background:rgba(139,92,246,0.1);padding:2px 6px;border-radius:4px;color:var(--purple-300)">$1</code>')
    .replace(/> ⚠️(.*)/g, '<div style="margin:12px 0;padding:10px 14px;background:rgba(251,191,36,0.08);border-left:3px solid var(--yellow-400);border-radius:0 6px 6px 0;font-size:13px;color:var(--text-secondary)">⚠️$1</div>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const DEFAULT_REPO = Object.keys(REPOS)[0];
  const [selectedRepo, setSelectedRepo] = useState(DEFAULT_REPO);
  const [messages, setMessages] = useState<Message[]>([makeGreeting(DEFAULT_REPO)]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // When repo changes: append a context-switch notice + new greeting
  const handleRepoChange = (newRepo: string) => {
    if (newRepo === selectedRepo) return;
    setSelectedRepo(newRepo);
    setInput('');
    const repo = REPOS[newRepo];
    const switchNotice: Message = {
      role: 'assistant',
      content: `Switched context to **${repo.org} / ${repo.name}** (⎇ ${repo.branch}) — ${repo.functions.toLocaleString()} functions · ${repo.files} files. Previous messages above are from **${REPOS[selectedRepo].name}**.`,
      timestamp: new Date(),
      repo: newRepo,
    };
    setMessages((prev) => [...prev, switchNotice]);
  };

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (text?: string) => {
    const content = text || input.trim();
    if (!content || loading) return;

    const userMsg: Message = { role: 'user', content, timestamp: new Date(), repo: selectedRepo };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      const resp = getMockResponse(content, selectedRepo);
      const assistantMsg: Message = {
        role: 'assistant',
        content: resp.content,
        sources: resp.sources,
        timestamp: new Date(),
        repo: selectedRepo,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setLoading(false);
    }, 1400);
  };

  const currentRepo = REPOS[selectedRepo];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <div className="flex" style={{ paddingTop: 'var(--nav-height)' }}>
        <Sidebar />
        <main style={{
          flex: 1, marginLeft: 240,
          display: 'flex', flexDirection: 'column',
          height: 'calc(100vh - var(--nav-height))',
        }}>

          {/* ── Chat Header ── */}
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--bg-secondary)',
          }}>
            <div className="flex items-center gap-3">
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>◈</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Code Q&amp;A</div>
                <div className="flex items-center gap-2">
                  <div className="status-dot online" />
                  {/* ← These now derive from selectedRepo, not hardcoded */}
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {currentRepo.functions.toLocaleString()} functions · {currentRepo.files} files · {currentRepo.org}/{currentRepo.name}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedRepo}
                onChange={(e) => handleRepoChange(e.target.value)}
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                  fontSize: 13, padding: '6px 12px', outline: 'none',
                  fontFamily: 'Inter, sans-serif', cursor: 'pointer',
                }}
                id="repo-selector"
              >
                {/* ← Options derived from REPOS, no duplicate hardcoding */}
                {Object.values(REPOS).map((r) => (
                  <option key={r.name} value={r.name}>{r.org} / {r.name}</option>
                ))}
              </select>
              <div className="badge badge-purple">RAG · pgvector</div>
            </div>
          </div>

          {/* ── Messages Area ── */}
          <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
            <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Suggested questions — shown until first user message */}
              {messages.filter((m) => m.role === 'user').length === 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', margin: '16px 0' }}>
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 12, padding: '7px 14px' }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="flex items-center gap-2" style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    {msg.role === 'assistant' && (
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'var(--grad-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, flexShrink: 0,
                      }}>〜</div>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {msg.role === 'user' ? 'You' : 'Ripple'}
                      {msg.repo && msg.repo !== selectedRepo && (
                        <span style={{ marginLeft: 4, color: 'var(--text-muted)', opacity: 0.6 }}>
                          [{REPOS[msg.repo]?.name}]
                        </span>
                      )}
                      {' '}· {msg.timestamp.toLocaleTimeString()}
                    </span>
                    {msg.role === 'user' && (
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'rgba(139,92,246,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, flexShrink: 0,
                      }}>V</div>
                    )}
                  </div>

                  <div
                    className={`chat-bubble ${msg.role}`}
                    style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}
                    dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                  />

                  {/* Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Sources ({msg.sources.length}) — {msg.repo ? `${REPOS[msg.repo]?.name}` : currentRepo.name}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {msg.sources.map((src, si) => (
                          <div key={si} style={{
                            background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                            borderRadius: 10, padding: '10px 14px', fontSize: 12,
                          }}>
                            <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--cyan-400)', fontWeight: 600 }}>
                                {src.file} <span style={{ color: 'var(--text-muted)' }}>{src.lines}</span>
                              </span>
                              <span style={{ fontSize: 10, color: 'var(--emerald-400)', fontWeight: 700 }}>{src.relevance}%</span>
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                              {src.snippet}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'var(--grad-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                  }}>〜</div>
                  <div className="chat-bubble assistant" style={{ padding: '10px 16px' }}>
                    <TypingDots />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* ── Input Area ── */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-secondary)',
          }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <div style={{
                display: 'flex', gap: 12,
                background: 'var(--bg-card)', border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-lg)', padding: '8px 8px 8px 18px',
              }}>
                <input
                  className="input"
                  style={{ flex: 1, background: 'none', border: 'none', boxShadow: 'none', padding: '6px 0', fontSize: 14 }}
                  placeholder={`Ask about ${currentRepo.name}... e.g. 'What calls the auth middleware?'`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  id="chat-input"
                />
                <button
                  className="btn btn-primary"
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  id="send-btn"
                  style={{ borderRadius: 'var(--radius-md)', padding: '10px 20px', fontSize: 14 }}
                >
                  {loading ? '...' : '↑ Send'}
                </button>
              </div>
              <div className="flex items-center gap-4" style={{ marginTop: 10 }}>
                {/* Placeholder text also uses currentRepo */}
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  ◈ Answers grounded in <strong style={{ color: 'var(--purple-400)' }}>{currentRepo.name}</strong> — hallucinations flagged automatically
                </span>
                <div className="flex gap-2" style={{ marginLeft: 'auto' }}>
                  <span className="badge badge-purple" style={{ fontSize: 9 }}>RAG</span>
                  <span className="badge badge-cyan" style={{ fontSize: 9 }}>pgvector</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
