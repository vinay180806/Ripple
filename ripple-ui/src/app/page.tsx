'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';

const FEATURES = [
  {
    icon: '⚡',
    title: 'Blast Radius Engine',
    description: 'Deterministic graph traversal shows every function, module, and API endpoint affected by your change — before the PR merges.',
    color: 'var(--purple-400)',
    glow: 'rgba(139,92,246,0.15)',
  },
  {
    icon: '◈',
    title: 'AST-Powered Accuracy',
    description: 'Tree-sitter parsing builds an exact call graph. Structural facts never come from the LLM — only explanation does.',
    color: 'var(--cyan-400)',
    glow: 'rgba(34,211,238,0.12)',
  },
  {
    icon: '⟟',
    title: 'Semantic Q&A',
    description: 'Ask natural language questions about your codebase. RAG retrieval grounds every answer in real code context.',
    color: 'var(--emerald-400)',
    glow: 'rgba(52,211,153,0.12)',
  },
  {
    icon: '⬡',
    title: 'Live Dependency Graph',
    description: 'Visual, interactive call graph updated on every push via GitHub webhooks. Never look at stale docs again.',
    color: 'var(--orange-400)',
    glow: 'rgba(251,146,60,0.12)',
  },
  {
    icon: '◷',
    title: 'Incremental Indexing',
    description: 'BullMQ job queue re-embeds only changed functions on push. Cache-invalidated precisely — never re-processes unchanged code.',
    color: 'var(--purple-300)',
    glow: 'rgba(196,181,253,0.1)',
  },
  {
    icon: '◧',
    title: 'Grounded Answers Only',
    description: 'Post-generation fact-check: any symbol the LLM mentions that isn\'t in graph facts or retrieved context is flagged.',
    color: 'var(--cyan-300)',
    glow: 'rgba(103,232,249,0.1)',
  },
];

const FLOW_STEPS = [
  { step: '01', title: 'Connect Repo', desc: 'Link your GitHub repo. Ripple clones, parses ASTs, and builds your call graph.' },
  { step: '02', title: 'Submit PR / Diff', desc: 'Paste a diff or open a PR. Ripple extracts every changed symbol automatically.' },
  { step: '03', title: 'Graph Traversal', desc: 'Deterministic blast-radius traversal finds every downstream dependency.' },
  { step: '04', title: 'Grounded Insight', desc: 'LLM explains — never asserts structure. You get cited prose + deterministic dep panel.' },
];

const STATS = [
  { value: '< 2s', label: 'Avg blast-radius query' },
  { value: '100%', label: 'Deterministic graph facts' },
  { value: '0', label: 'LLM structural assertions' },
  { value: '∞', label: 'Repos supported' },
];

const CODE_DEMO = `// You changed:
function calculateTax(amount: number, rate: number) {
  return amount * rate;  // ← modified signature
}

// Ripple found 7 downstream callers:
✦ OrderService.processCheckout()     [HIGH RISK]
✦ InvoiceGenerator.compute()         [HIGH RISK]
✦ ReportService.monthlyTaxSummary()  [MEDIUM]
✦ AdminDashboard.displayTotal()      [MEDIUM]
✦ EmailTemplate.formatReceipt()      [LOW]
  + 2 more...`;

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);

  return <>{count}{suffix}</>;
}

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <Navbar />

      {/* ===== HERO ===== */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        paddingTop: 'var(--nav-height)',
      }}>
        {/* Background Orbs */}
        <div className="glow-orb glow-purple" style={{ width: 600, height: 600, top: -100, left: -200, opacity: 0.35 }} />
        <div className="glow-orb glow-cyan" style={{ width: 500, height: 500, bottom: -100, right: -150, opacity: 0.25 }} />
        <div className="glow-orb glow-purple" style={{ width: 300, height: 300, top: '40%', right: '20%', opacity: 0.2 }} />

        {/* Grid Pattern */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />

        <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div className="animate-fade-up" style={{ animationDelay: '0ms' }}>
            <div className="badge badge-purple" style={{ marginBottom: 24, fontSize: 12, padding: '6px 16px' }}>
              <span>◈</span> Static analysis is the source of truth
            </div>
          </div>

          <h1
            className="animate-fade-up"
            style={{
              fontSize: 'clamp(48px, 8vw, 96px)',
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: '-0.04em',
              marginBottom: 28,
              animationDelay: '80ms',
            }}
          >
            Know the <span className="gradient-text">blast radius</span>
            <br />before it ships.
          </h1>

          <p
            className="animate-fade-up"
            style={{
              fontSize: 'clamp(16px, 2vw, 22px)',
              color: 'var(--text-secondary)',
              maxWidth: 640,
              margin: '0 auto 48px',
              lineHeight: 1.7,
              animationDelay: '160ms',
            }}
          >
            Ripple combines deterministic AST call-graph traversal with grounded LLM explanation —
            so you know exactly what your change breaks, with proof.
          </p>

          <div className="animate-fade-up flex items-center justify-center gap-4 flex-wrap" style={{ animationDelay: '240ms' }}>
            <Link href="/signup" className="btn btn-primary btn-lg" style={{ fontSize: 16, padding: '16px 36px' }}>
              Connect your repo →
            </Link>
            <Link href="/dashboard" className="btn btn-secondary btn-lg" style={{ fontSize: 16 }}>
              View demo
            </Link>
          </div>

          {/* Code preview */}
          <div
            className="animate-fade-up glass-card"
            style={{
              maxWidth: 680,
              margin: '64px auto 0',
              padding: 0,
              overflow: 'hidden',
              animationDelay: '360ms',
              border: '1px solid var(--border-card)',
              boxShadow: '0 0 60px rgba(139,92,246,0.15)',
            }}
          >
            <div style={{
              padding: '12px 16px',
              background: 'rgba(13,20,40,0.9)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#fbbf24' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22d3ee' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8, fontFamily: 'JetBrains Mono, monospace' }}>impact-report.ts</span>
            </div>
            <pre style={{
              padding: '24px',
              textAlign: 'left',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '13px',
              lineHeight: 1.8,
              color: 'var(--text-secondary)',
              overflow: 'auto',
              margin: 0,
            }}>
              <code>{CODE_DEMO}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* ===== STATS BAR ===== */}
      <section style={{ padding: '64px 0', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 40 }}>
            {STATS.map((stat) => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div className="gradient-text" style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8, fontWeight: 500 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section style={{ padding: '120px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <div className="badge badge-cyan" style={{ marginBottom: 20 }}>Features</div>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, marginBottom: 16 }}>
              Built on first principles.
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 18, maxWidth: 540, margin: '0 auto' }}>
              Not a "chat with your code" wrapper. Every architectural decision enforces the split between structural truth and LLM synthesis.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className="card"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: feature.glow,
                  border: `1px solid ${feature.color}33`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  marginBottom: 16,
                  color: feature.color,
                }}>
                  {feature.icon}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section style={{ padding: '120px 0', background: 'var(--bg-secondary)', position: 'relative', overflow: 'hidden' }}>
        <div className="glow-orb glow-purple" style={{ width: 600, height: 600, left: '50%', top: '50%', transform: 'translate(-50%,-50%)', opacity: 0.15 }} />
        <div className="container" style={{ position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <div className="badge badge-purple" style={{ marginBottom: 20 }}>How it works</div>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800 }}>
              From push to insight in seconds.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 0, position: 'relative' }}>
            {/* Connecting line */}
            <div style={{
              position: 'absolute',
              top: 32,
              left: '12.5%',
              right: '12.5%',
              height: 2,
              background: 'linear-gradient(90deg, var(--purple-600), var(--cyan-400))',
              opacity: 0.3,
            }} />

            {FLOW_STEPS.map((step, i) => (
              <div key={step.step} style={{ padding: '0 20px', textAlign: 'center' }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: i === 3 ? 'var(--grad-primary)' : 'var(--bg-card)',
                  border: `2px solid ${i === 3 ? 'transparent' : 'var(--border-card)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: i === 3 ? 'white' : 'var(--purple-400)',
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '0.05em',
                  boxShadow: i === 3 ? '0 0 30px rgba(139,92,246,0.4)' : 'none',
                  position: 'relative',
                  zIndex: 1,
                }}>
                  {step.step}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ARCHITECTURE CALLOUT ===== */}
      <section style={{ padding: '120px 0' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
            <div>
              <div className="badge badge-cyan" style={{ marginBottom: 24 }}>Architecture</div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, marginBottom: 20, lineHeight: 1.2 }}>
                Static analysis as the <span className="gradient-text">source of truth.</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.8, marginBottom: 32 }}>
                The LLM never asserts structure. It only explains what the graph already knows.
                This is what separates Ripple from a generic "chat with your code" wrapper.
              </p>

              {[
                { label: 'Python + tree-sitter AST parsing', icon: '▸' },
                { label: 'pgvector — one DB for app data, graph, and embeddings', icon: '▸' },
                { label: 'BullMQ for async indexing — never blocks the request thread', icon: '▸' },
                { label: 'Post-generation hallucination flag on every response', icon: '▸' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3" style={{ marginBottom: 12 }}>
                  <span style={{ color: 'var(--purple-400)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{item.icon}</span>
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{item.label}</span>
                </div>
              ))}
            </div>

            <div style={{ position: 'relative' }}>
              <div className="glow-orb glow-purple" style={{ width: 400, height: 400, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: 0.2 }} />
              <div className="glass-card" style={{ padding: 32, position: 'relative' }}>
                {/* Architecture mini diagram */}
                {[
                  { label: 'Next.js Frontend', color: 'var(--purple-400)', width: '70%' },
                  { label: 'Node.js API + RAG Orchestrator', color: 'var(--cyan-400)', width: '90%' },
                  { label: 'Python Analysis Service', color: 'var(--emerald-400)', width: '55%' },
                  { label: 'PostgreSQL + pgvector', color: 'var(--orange-400)', width: '80%' },
                  { label: 'Redis Cache + BullMQ', color: 'var(--purple-300)', width: '60%' },
                ].map((layer, i) => (
                  <div key={layer.label} style={{ marginBottom: 12 }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>{layer.label}</span>
                      <span style={{ fontSize: 10, color: layer.color }}>●</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: layer.width,
                          background: `linear-gradient(90deg, ${layer.color}aa, ${layer.color})`,
                          transitionDelay: `${i * 150}ms`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section style={{
        padding: '120px 0',
        background: 'var(--bg-secondary)',
        position: 'relative',
        overflow: 'hidden',
        borderTop: '1px solid var(--border-subtle)',
      }}>
        <div className="glow-orb glow-purple" style={{ width: 700, height: 700, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: 0.2 }} />
        <div className="container" style={{ position: 'relative', textAlign: 'center' }}>
          <div className="badge badge-green" style={{ marginBottom: 24 }}>Get started today</div>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 64px)', fontWeight: 900, marginBottom: 20, letterSpacing: '-0.04em' }}>
            Ship with <span className="gradient-text">confidence.</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 18, maxWidth: 480, margin: '0 auto 48px', lineHeight: 1.7 }}>
            Connect your first repo in under 60 seconds. No credit card required.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/signup" className="btn btn-primary" style={{ fontSize: 16, padding: '16px 40px', borderRadius: '14px' }}>
              Start for free →
            </Link>
            <Link href="/impact" className="btn btn-secondary" style={{ fontSize: 16 }}>
              See a live impact report
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{ padding: '48px 0', borderTop: '1px solid var(--border-subtle)' }}>
        <div className="container flex items-center justify-between flex-wrap gap-4">
          <div className="nav-logo">
            <div className="nav-logo-icon" style={{ fontSize: 14 }}>〜</div>
            <span style={{ fontSize: 16 }}>Ripple</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            © 2026 Ripple. Code intelligence for teams that care about correctness.
          </div>
          <div className="flex gap-6">
            {['Docs', 'GitHub', 'Status', 'Privacy'].map((link) => (
              <a key={link} href="#" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
