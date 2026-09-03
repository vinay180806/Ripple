'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { REPOS, type RiskLevel } from '../lib/data';
import { useActiveRepo } from '../lib/repoContext';
import { getRepoSpec, type RepoSpecification } from '../lib/repoSpecs';

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
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<RiskFilter>('all');
  const [activeRepoKey, setActiveRepoKey] = useActiveRepo();

  const currentSpec: RepoSpecification = getRepoSpec(activeRepoKey);
  const repo = REPOS.find((r) => r.name === activeRepoKey) || REPOS[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setTab('report');
    }, 1500);
  };

  const filtered = filter === 'all'
    ? currentSpec.affectedSymbols
    : currentSpec.affectedSymbols.filter((s) => s.risk === filter);

  const highCount = currentSpec.affectedSymbols.filter((s) => s.risk === 'high').length;
  const medCount = currentSpec.affectedSymbols.filter((s) => s.risk === 'medium').length;
  const lowCount = currentSpec.affectedSymbols.filter((s) => s.risk === 'low').length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      <Navbar />
      <div className="flex" style={{ paddingTop: 'var(--nav-height)' }}>
        <Sidebar />
        <main style={{ flex: 1, marginLeft: 240, padding: '32px' }}>

          {/* Header */}
          <div className="flex items-center justify-between" style={{ marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div className="flex items-center gap-3" style={{ marginBottom: 6 }}>
                <div className="badge badge-red">⚡ Impact Report</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {currentSpec.org}/{currentSpec.name} · {currentSpec.branch} · {currentSpec.commit}
                </div>
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-headline)' }}>
                {currentSpec.targetSymbol} — {currentSpec.changeType}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
                Generated {currentSpec.generatedAt} · Traversal depth: {currentSpec.traversalDepth} · Grounded codebase facts
              </p>
            </div>

            {/* Controls & Repository Switcher */}
            <div className="flex items-center gap-3">
              {/* Repo Selector */}
              <select
                value={activeRepoKey}
                onChange={(e) => setActiveRepoKey(e.target.value)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-card)',
                  background: 'var(--surface-container-lowest)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {REPOS.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.org} / {r.name}
                  </option>
                ))}
              </select>

              <button
                className={`btn btn-sm ${tab === 'submit' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTab(tab === 'submit' ? 'report' : 'submit')}
                id="new-report-btn"
              >
                {tab === 'submit' ? 'View Current Report' : '+ New Report'}
              </button>
            </div>
          </div>

          {tab === 'submit' ? (
            <div style={{ maxWidth: 720 }}>
              <div className="card" style={{ padding: 32, background: 'var(--surface-container-lowest)' }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Submit a diff or PR</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                  Ripple will extract changed symbols from <strong>{currentSpec.name}</strong>, traverse the call graph, and generate a grounded impact report.
                </p>
                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                      Diff / Patch for {currentSpec.name}
                    </label>
                    <textarea
                      className="input font-mono"
                      style={{ minHeight: 200, fontSize: 12, width: '100%', background: 'var(--surface)', border: '1px solid var(--border-card)', padding: 12, borderRadius: 8 }}
                      placeholder="Paste your git diff here..."
                      value={diff}
                      onChange={(e) => setDiff(e.target.value)}
                      id="diff-input"
                    />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTab('report')}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                      {submitting ? 'Analyzing AST Graph...' : 'Generate Impact Report'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div>
              {/* Summary Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                <div className="card" style={{ padding: '18px 20px', background: 'var(--surface-container-lowest)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Target Symbol</div>
                  <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--gold)', marginTop: 4 }}>
                    {currentSpec.targetSymbol}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{currentSpec.targetFile}</div>
                </div>

                <div className="card" style={{ padding: '18px 20px', background: 'var(--surface-container-lowest)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>High Impact</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--error)', marginTop: 2 }}>{highCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Direct callers / breaking</div>
                </div>

                <div className="card" style={{ padding: '18px 20px', background: 'var(--surface-container-lowest)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Medium Impact</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--orange-400)', marginTop: 2 }}>{medCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Indirect / dependent</div>
                </div>

                <div className="card" style={{ padding: '18px 20px', background: 'var(--surface-container-lowest)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Low Impact</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--emerald-400)', marginTop: 2 }}>{lowCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Downstream / schemas</div>
                </div>
              </div>

              {/* Code Diff Section */}
              <div className="card" style={{ padding: '20px', marginBottom: 24, background: 'var(--surface-container-lowest)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Target Diff ({currentSpec.targetFile})
                </div>
                <pre style={{
                  padding: 14,
                  background: 'var(--surface)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12.5,
                  lineHeight: 1.6,
                  color: 'var(--text-primary)',
                  overflowX: 'auto',
                }}>
                  {currentSpec.diffContent}
                </pre>
              </div>

              {/* Recommendation Box */}
              <div style={{
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--gold-bg)',
                border: '1px solid var(--gold-border)',
                marginBottom: 24,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--secondary)', marginBottom: 4 }}>
                  <span>💡</span>
                  <span>Recommendation for {currentSpec.name}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {currentSpec.recommendation}
                </div>
              </div>

              {/* Affected Symbols Table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'var(--surface-container-lowest)' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Affected Callers &amp; Downstream Targets ({filtered.length})
                  </div>
                  <div className="flex gap-2">
                    {(['all', 'high', 'medium', 'low'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setFilter(r)}
                        className={`btn btn-sm ${filter === r ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ fontSize: 11, padding: '4px 10px', textTransform: 'capitalize' }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {filtered.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '14px 20px',
                        borderBottom: idx < filtered.length - 1 ? '1px solid var(--border-card)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            className="badge"
                            style={{
                              fontSize: 10,
                              background: item.risk === 'high' ? 'rgba(186,26,26,0.1)' : item.risk === 'medium' ? 'rgba(194,106,10,0.1)' : 'rgba(45,158,95,0.1)',
                              color: item.risk === 'high' ? 'var(--error)' : item.risk === 'medium' ? 'var(--orange-400)' : 'var(--emerald-400)',
                              fontWeight: 700,
                            }}
                          >
                            {RISK_LABEL[item.risk]}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {item.name}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                          {item.reason}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-muted)' }}>
                          {item.file} ({item.lines})
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          Depth: {item.depth} · Callers: {item.callers}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
