'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import {
  AFFECTED_SYMBOLS,
  DIFF_CONTENT,
  IMPACT_REPORT_META,
  REPOS,
  RISK_COLORS,
  RISK_BG,
  RISK_BORDER,
  type RiskLevel,
} from '../lib/data';

type RiskFilter = 'all' | RiskLevel;

const RISK_LABEL: Record<string, string> = {
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
};

export default function ImpactReportPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'report' | 'submit'>('report');
  const [diff, setDiff] = useState('');
  const [selectedRepo, setSelectedRepo] = useState(String(IMPACT_REPORT_META.repoId));
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<RiskFilter>('all');

  const repo = REPOS.find(r => r.id === Number(selectedRepo));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); setTab('report'); }, 2000);
  };

  const filtered = filter === 'all'
    ? AFFECTED_SYMBOLS
    : AFFECTED_SYMBOLS.filter((s) => s.risk === filter);

  const highCount = AFFECTED_SYMBOLS.filter((s) => s.risk === 'high').length;
  const medCount = AFFECTED_SYMBOLS.filter((s) => s.risk === 'medium').length;
  const lowCount = AFFECTED_SYMBOLS.filter((s) => s.risk === 'low').length;

  const reportRepo = REPOS.find(r => r.id === IMPACT_REPORT_META.repoId);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <div className="flex" style={{ paddingTop: 'var(--nav-height)' }}>
        <Sidebar />
        <main style={{ flex: 1, marginLeft: 240, padding: '32px' }}>

          {/* Header */}
          <div className="flex items-center justify-between" style={{ marginBottom: 32 }}>
            <div>
              <div className="flex items-center gap-3" style={{ marginBottom: 6 }}>
                <div className="badge badge-red">⚡ Impact Report</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {reportRepo?.org}/{reportRepo?.name} · {IMPACT_REPORT_META.branch} · {IMPACT_REPORT_META.commit}
                </div>
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800 }}>
                {IMPACT_REPORT_META.changedSymbol} — Signature Change
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
                Generated {IMPACT_REPORT_META.generatedAt} · Traversal depth: {IMPACT_REPORT_META.traversalDepth} · Deterministic graph facts
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className={`tab ${tab === 'submit' ? 'active' : ''}`}
                onClick={() => setTab('submit')} style={{ flex: 'unset', padding: '8px 16px' }} id="new-report-btn">
                + New Report
              </button>
              <button className="btn btn-secondary btn-sm">↓ Export PDF</button>
            </div>
          </div>

          {tab === 'submit' ? (
            <div style={{ maxWidth: 720 }}>
              <div className="glass-card" style={{ padding: 32 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Submit a diff or PR</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                  Ripple will extract changed symbols, traverse the call graph, and generate a grounded impact report.
                </p>
                <form onSubmit={handleSubmit}>
                  <div className="tabs" style={{ marginBottom: 24, width: 'fit-content' }}>
                    <button type="button" className="tab active" style={{ flex: 'unset', padding: '7px 20px' }}>Paste Diff</button>
                    <button type="button" className="tab" style={{ flex: 'unset', padding: '7px 20px' }}>PR URL</button>
                    <button type="button" className="tab" style={{ flex: 'unset', padding: '7px 20px' }}>Commit SHA</button>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Diff / Patch</label>
                    <textarea className="input font-mono" style={{ minHeight: 200, fontSize: 12 }}
                      placeholder="Paste your git diff here..."
                      value={diff} onChange={(e) => setDiff(e.target.value)} id="diff-input" />
                  </div>
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Repository</label>
                    <select className="input" id="impact-repo-select"
                      value={selectedRepo} onChange={(e) => setSelectedRepo(e.target.value)}>
                      {REPOS.map(r => (
                        <option key={r.id} value={String(r.id)}>{r.org} / {r.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ padding: '13px 32px', fontSize: 15 }}
                    disabled={submitting} id="run-impact-btn">
                    {submitting ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                        Traversing graph...
                      </span>
                    ) : '⚡ Run Impact Report'}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
                {[
                  { label: 'Total affected', value: AFFECTED_SYMBOLS.length, color: 'var(--purple-400)', icon: '⬡' },
                  { label: 'High risk', value: highCount, color: 'var(--red-400)', icon: '⚠' },
                  { label: 'Medium risk', value: medCount, color: 'var(--orange-400)', icon: '◎' },
                  { label: 'Low risk', value: lowCount, color: 'var(--yellow-400)', icon: '○' },
                ].map((item) => (
                  <div key={item.label} className="card" style={{ padding: '18px 20px' }}>
                    <div style={{ fontSize: 16, marginBottom: 8, color: item.color }}>{item.icon}</div>
                    <div style={{ fontSize: 36, fontWeight: 900, color: item.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{item.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>{item.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
                {/* Symbol List */}
                <div>
                  <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700 }}>Affected Symbols</h2>
                    <div className="flex gap-2">
                      {(['all', 'high', 'medium', 'low'] as RiskFilter[]).map((f) => (
                        <button key={f} onClick={() => setFilter(f)}
                          className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: 11, padding: '5px 12px', textTransform: 'capitalize' }}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filtered.map((sym, i) => {
                      const color = RISK_COLORS[sym.risk];
                      const bg = RISK_BG[sym.risk];
                      const border = RISK_BORDER[sym.risk];
                      return (
                        <div key={i} className="card" style={{ padding: '18px 22px', borderLeft: `3px solid ${color}` }}>
                          <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                            <div className="flex items-center gap-3">
                              <div style={{ padding: '3px 10px', background: bg, border: `1px solid ${border}`, borderRadius: 'var(--radius-full)', fontSize: 10, fontWeight: 700, color, letterSpacing: '0.06em' }}>
                                {RISK_LABEL[sym.risk] ?? sym.risk.toUpperCase()}
                              </div>
                              <div className="badge badge-purple" style={{ fontSize: 9 }}>depth {sym.depth}</div>
                            </div>
                            {sym.callers > 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sym.callers} caller{sym.callers !== 1 ? 's' : ''}</span>}
                          </div>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{sym.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--cyan-400)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 10 }}>{sym.file} · {sym.lines}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{sym.reason}</div>
                        </div>
                      );
                    })}
                    {filtered.length === 0 && (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32, fontSize: 14 }}>
                        No {filter} risk symbols.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* LLM Explanation */}
                  <div className="glass-card" style={{ padding: 24 }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>〜</div>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>AI Explanation</span>
                      <div className="badge badge-green" style={{ fontSize: 9, marginLeft: 'auto' }}>✓ Verified</div>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                      The signature change to{' '}
                      <code style={{ fontFamily: 'JetBrains Mono, monospace', background: 'rgba(139,92,246,0.1)', padding: '1px 5px', borderRadius: 4, color: 'var(--purple-300)' }}>
                        {IMPACT_REPORT_META.changedSymbol}
                      </code>{' '}
                      adds a required <code style={{ fontFamily: 'JetBrains Mono, monospace', background: 'rgba(139,92,246,0.1)', padding: '1px 5px', borderRadius: 4, color: 'var(--purple-300)' }}>jurisdiction</code> parameter and changes the return type to an object. This is a <strong style={{ color: 'var(--red-400)' }}>breaking change</strong> — all {AFFECTED_SYMBOLS.length} affected call sites must be updated.
                    </p>
                    <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                      🔴 <strong style={{ color: 'var(--red-400)' }}>Critical path</strong>: processCheckout → compute → monthlyTaxSummary spans your financial pipeline. Test thoroughly before deploying.
                    </div>
                    <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                      ◈ All {AFFECTED_SYMBOLS.length} symbols in this explanation exist in graph facts — 0 hallucinations detected
                    </div>
                  </div>

                  {/* Diff */}
                  <div className="glass-card" style={{ padding: 24 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
                      Changed: <code style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--cyan-400)', fontSize: 12 }}>{IMPACT_REPORT_META.file}</code>
                    </h3>
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fbbf24' }} />
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22d3ee' }} />
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                          {IMPACT_REPORT_META.file}
                        </span>
                      </div>
                      <pre style={{ padding: '16px', fontSize: 11, lineHeight: 1.8, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)', overflow: 'auto', margin: 0 }}>
                        {DIFF_CONTENT.split('\n').map((line, i) => (
                          <div key={i} style={{
                            color: line.startsWith('-') ? 'var(--red-400)' : line.startsWith('+') ? 'var(--emerald-400)' : 'var(--text-secondary)',
                            background: line.startsWith('-') ? 'rgba(248,113,113,0.06)' : line.startsWith('+') ? 'rgba(52,211,153,0.06)' : 'transparent',
                            padding: '0 4px', margin: '0 -4px',
                          }}>{line || ' '}</div>
                        ))}
                      </pre>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button className="btn btn-primary" style={{ padding: '12px', justifyContent: 'center' }}
                      onClick={() => router.push('/graph')}>⬡ View in dependency graph</button>
                    <button className="btn btn-secondary" style={{ padding: '12px', justifyContent: 'center' }}
                      onClick={() => router.push('/chat')}>◈ Ask about these callers</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
