'use client';
import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import {
  GRAPH_NODES,
  GRAPH_EDGES,
  RISK_COLORS,
  RISK_BG,
} from '../lib/data';

export default function GraphPage() {
  const [selected, setSelected] = useState<string | null>('calculateTax');
  const [zoom, setZoom] = useState(1);
  const [filterRisk, setFilterRisk] = useState<string>('all');

  const selectedNode = GRAPH_NODES.find((n) => n.id === selected);

  const visibleNodes = filterRisk === 'all'
    ? GRAPH_NODES
    : GRAPH_NODES.filter((n) => n.risk === filterRisk || n.risk === 'changed');

  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = GRAPH_EDGES.filter((e) => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <div className="flex" style={{ paddingTop: 'var(--nav-height)' }}>
        <Sidebar />
        <main style={{ flex: 1, marginLeft: 240, display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--nav-height))' }}>

          {/* Toolbar */}
          <div style={{
            padding: '12px 24px', borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          }}>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 18, color: 'var(--purple-400)' }}>⬡</span>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Dependency Graph</span>
              <div className="badge badge-purple" style={{ fontSize: 10 }}>api-gateway · main</div>
            </div>

            <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Filter:</span>
              {['all', 'high', 'medium', 'low'].map((r) => (
                <button key={r} onClick={() => setFilterRisk(r)}
                  className={`btn btn-sm ${filterRisk === r ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: 11, padding: '4px 12px', textTransform: 'capitalize' }}>
                  {r}
                </button>
              ))}
              <div style={{ width: 1, height: 24, background: 'var(--border-subtle)', margin: '0 4px' }} />
              <button className="btn btn-secondary btn-sm" onClick={() => setZoom((z) => Math.min(z + 0.2, 2))}>+</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setZoom((z) => Math.max(z - 0.2, 0.4))}>−</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setZoom(1)}>Reset</button>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Graph Canvas */}
            <div style={{
              flex: 1, position: 'relative', overflow: 'hidden',
              background: `radial-gradient(ellipse at 30% 30%, rgba(139,92,246,0.06) 0%, transparent 60%),
                radial-gradient(ellipse at 70% 70%, rgba(34,211,238,0.04) 0%, transparent 60%),
                var(--bg-primary)`,
            }}>
              {/* Grid */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.3 }}>
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(139,92,246,0.2)" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>

              {/* Main SVG */}
              <svg
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.2s ease' }}
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  {Object.entries(RISK_COLORS).map(([key, color]) => (
                    <filter key={key} id={`glow-${key}`} x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="0.8" result="blur" />
                      <feFlood floodColor={color} floodOpacity="0.6" result="color" />
                      <feComposite in="color" in2="blur" operator="in" result="glow" />
                      <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  ))}
                  <marker id="arrowhead" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
                    <polygon points="0 0, 4 2, 0 4" fill="rgba(139,92,246,0.5)" />
                  </marker>
                </defs>

                {/* Edges */}
                {visibleEdges.map((edge, i) => {
                  const from = visibleNodes.find((n) => n.id === edge.from);
                  const to = visibleNodes.find((n) => n.id === edge.to);
                  if (!from || !to) return null;
                  const isHighlighted = selected && (edge.from === selected || edge.to === selected);
                  return (
                    <line key={i}
                      x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                      stroke={isHighlighted ? 'rgba(139,92,246,0.8)' : 'rgba(139,92,246,0.2)'}
                      strokeWidth={isHighlighted ? '0.6' : '0.3'}
                      strokeDasharray={isHighlighted ? '' : '1 1'}
                      markerEnd="url(#arrowhead)"
                    />
                  );
                })}

                {/* Nodes */}
                {visibleNodes.map((node) => {
                  const isSelected = selected === node.id;
                  const color = RISK_COLORS[node.risk];
                  const isConnected = selected && GRAPH_EDGES.some(
                    (e) => (e.from === node.id && e.to === selected) || (e.from === selected && e.to === node.id)
                  );
                  const dimmed = selected && !isSelected && !isConnected;
                  return (
                    <g key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      onClick={() => setSelected(node.id === selected ? null : node.id)}
                      style={{ cursor: 'pointer', opacity: dimmed ? 0.3 : 1, transition: 'opacity 0.2s' }}
                      filter={isSelected ? `url(#glow-${node.risk})` : undefined}
                    >
                      <circle r={isSelected ? '3.5' : node.risk === 'changed' ? '3' : '2.5'}
                        fill={`${color}22`} stroke={color} strokeWidth={isSelected ? '0.6' : '0.4'} />
                      {node.risk === 'changed' && <circle r="1.2" fill={color} opacity="0.8" />}
                      <text y="5.5" textAnchor="middle" fill="rgba(240,244,255,0.8)" fontSize="2.2"
                        fontFamily="JetBrains Mono, monospace" fontWeight={isSelected ? 700 : 400}>
                        {node.label.length > 18 ? node.label.slice(0, 16) + '…' : node.label}
                      </text>
                      <text y="7.8" textAnchor="middle" fill="rgba(136,146,176,0.7)" fontSize="1.7"
                        fontFamily="JetBrains Mono, monospace">
                        {node.file}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Legend */}
              <div style={{
                position: 'absolute', bottom: 20, left: 20,
                background: 'rgba(13,20,40,0.85)', border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)', padding: '12px 16px', backdropFilter: 'blur(10px)',
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Legend</div>
                {[
                  { color: RISK_COLORS.changed, label: 'Changed symbol' },
                  { color: RISK_COLORS.high, label: 'High risk' },
                  { color: RISK_COLORS.medium, label: 'Medium risk' },
                  { color: RISK_COLORS.low, label: 'Low risk' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: `${item.color}22`, border: `2px solid ${item.color}` }} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div style={{
                position: 'absolute', top: 16, left: 16,
                background: 'rgba(13,20,40,0.85)', border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)', padding: '10px 16px', backdropFilter: 'blur(10px)',
              }}>
                <div className="flex items-center gap-3">
                  {[
                    { label: 'Nodes', value: visibleNodes.length },
                    { label: 'Edges', value: visibleEdges.length },
                    { label: 'Depth', value: Math.max(...GRAPH_NODES.map(n => n.depth)) },
                  ].map((s) => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--purple-400)' }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Detail Panel */}
            {selectedNode && (
              <div style={{
                width: 320, borderLeft: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)', overflow: 'auto', flexShrink: 0,
                animation: 'slideIn 0.2s ease',
              }}>
                <div style={{ padding: '20px' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>Symbol Details</h3>
                    <button onClick={() => setSelected(null)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
                  </div>

                  <div style={{
                    padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: 20,
                    background: RISK_BG[selectedNode.risk],
                    border: `1px solid ${RISK_COLORS[selectedNode.risk]}33`,
                  }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{selectedNode.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--cyan-400)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12 }}>{selectedNode.file}</div>
                    <div className="flex items-center gap-2">
                      <div style={{
                        padding: '3px 10px', borderRadius: 'var(--radius-full)',
                        background: `${RISK_COLORS[selectedNode.risk]}20`,
                        border: `1px solid ${RISK_COLORS[selectedNode.risk]}40`,
                        fontSize: 10, fontWeight: 700, color: RISK_COLORS[selectedNode.risk],
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        {selectedNode.risk}
                      </div>
                      <div className="badge badge-purple" style={{ fontSize: 10 }}>depth {selectedNode.depth}</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Connections</div>
                    {GRAPH_EDGES.filter((e) => e.from === selectedNode.id || e.to === selectedNode.id).map((edge, i) => {
                      const isFrom = edge.from === selectedNode.id;
                      const otherId = isFrom ? edge.to : edge.from;
                      const other = GRAPH_NODES.find((n) => n.id === otherId);
                      if (!other) return null;
                      return (
                        <div key={i} style={{
                          padding: '10px 14px', background: 'var(--bg-card)',
                          border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                          marginBottom: 8, cursor: 'pointer',
                        }} onClick={() => setSelected(otherId)}>
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: 11, color: isFrom ? 'var(--cyan-400)' : 'var(--orange-400)' }}>
                              {isFrom ? '→ calls' : '← called by'}
                            </span>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: RISK_COLORS[other.risk], flexShrink: 0 }} />
                          </div>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>{other.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{other.file}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button className="btn btn-primary" style={{ justifyContent: 'center', padding: '10px' }}>
                      ⚡ Run impact from this node
                    </button>
                    <button className="btn btn-ghost" style={{ justifyContent: 'center', padding: '10px' }}>
                      ◈ Ask about this function
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
