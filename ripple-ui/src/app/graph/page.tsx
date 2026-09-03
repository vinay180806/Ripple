'use client';
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import {
  REPOS,
  type GraphNode,
  type GraphEdge,
} from '../lib/data';
import { useActiveRepo } from '../lib/repoContext';

const RISK_LIGHT_COLORS = {
  changed: {
    stroke: '#d4af37',
    fill: 'rgba(212, 175, 55, 0.18)',
    solid: '#d4af37',
    label: 'Changed symbol',
  },
  high: {
    stroke: '#dc2626',
    fill: 'rgba(220, 38, 38, 0.14)',
    solid: '#dc2626',
    label: 'High risk',
  },
  medium: {
    stroke: '#ea580c',
    fill: 'rgba(234, 88, 12, 0.14)',
    solid: '#ea580c',
    label: 'Medium risk',
  },
  low: {
    stroke: '#16a34a',
    fill: 'rgba(22, 163, 74, 0.14)',
    solid: '#16a34a',
    label: 'Low risk',
  },
};

// Repository-specific graph data keeping the exact node coordinate system
const REPO_GRAPHS: Record<string, {
  name: string;
  org: string;
  branch: string;
  defaultTarget: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}> = {
  'api-gateway': {
    name: 'api-gateway',
    org: 'acme-corp',
    branch: 'main',
    defaultTarget: 'calculateTax',
    nodes: [
      { id: 'calculateTax', label: 'calculateTax()', file: 'services/tax.ts', risk: 'changed', x: 50, y: 50, callers: 6, depth: 0 },
      { id: 'processCheckout', label: 'processCheckout()', file: 'services/order.ts', risk: 'high', x: 20, y: 25, callers: 3, depth: 1 },
      { id: 'compute', label: 'compute()', file: 'services/invoice.ts', risk: 'high', x: 80, y: 25, callers: 2, depth: 1 },
      { id: 'monthlyTaxSummary', label: 'monthlyTaxSummary()', file: 'services/reports.ts', risk: 'medium', x: 15, y: 10, callers: 1, depth: 2 },
      { id: 'displayTotal', label: 'displayTotal()', file: 'AdminDashboard.tsx', risk: 'medium', x: 50, y: 10, callers: 0, depth: 3 },
      { id: 'formatReceipt', label: 'formatReceipt()', file: 'templates/receipt.ts', risk: 'low', x: 85, y: 10, callers: 1, depth: 2 },
      { id: 'taxTests', label: 'calculateTaxTests', file: '__tests__/tax.test.ts', risk: 'high', x: 50, y: 78, callers: 0, depth: 1 },
      { id: 'TaxResult', label: 'TaxResult', file: 'types/index.ts', risk: 'low', x: 80, y: 65, callers: 4, depth: 0 },
    ],
    edges: [
      { from: 'processCheckout', to: 'calculateTax' },
      { from: 'compute', to: 'calculateTax' },
      { from: 'monthlyTaxSummary', to: 'processCheckout' },
      { from: 'displayTotal', to: 'monthlyTaxSummary' },
      { from: 'formatReceipt', to: 'compute' },
      { from: 'taxTests', to: 'calculateTax' },
      { from: 'calculateTax', to: 'TaxResult' },
    ],
  },
  'payment-service': {
    name: 'payment-service',
    org: 'acme-corp',
    branch: 'main',
    defaultTarget: 'processPayment',
    nodes: [
      { id: 'processPayment', label: 'processPayment()', file: 'services/payment.service.ts', risk: 'changed', x: 50, y: 50, callers: 5, depth: 0 },
      { id: 'initiateCheckout', label: 'initiateCheckout()', file: 'services/checkout.service.ts', risk: 'high', x: 20, y: 25, callers: 3, depth: 1 },
      { id: 'finalizeOrder', label: 'finalizeOrder()', file: 'services/order.service.ts', risk: 'high', x: 80, y: 25, callers: 2, depth: 1 },
      { id: 'verifySession', label: 'verifySession()', file: 'services/auth.service.ts', risk: 'medium', x: 15, y: 10, callers: 1, depth: 2 },
      { id: 'generateInvoice', label: 'generateInvoice()', file: 'services/invoice.service.ts', risk: 'high', x: 85, y: 10, callers: 1, depth: 2 },
      { id: 'sendConfirmation', label: 'sendConfirmation()', file: 'services/notification.service.ts', risk: 'medium', x: 15, y: 78, callers: 0, depth: 2 },
      { id: 'paymentTests', label: 'paymentServiceTests', file: '__tests__/payment.test.ts', risk: 'high', x: 50, y: 78, callers: 0, depth: 1 },
      { id: 'PaymentResult', label: 'PaymentResult', file: 'types/payment.ts', risk: 'low', x: 80, y: 65, callers: 4, depth: 0 },
    ],
    edges: [
      { from: 'initiateCheckout', to: 'processPayment' },
      { from: 'finalizeOrder', to: 'processPayment' },
      { from: 'verifySession', to: 'initiateCheckout' },
      { from: 'generateInvoice', to: 'finalizeOrder' },
      { from: 'processPayment', to: 'sendConfirmation' },
      { from: 'paymentTests', to: 'processPayment' },
      { from: 'processPayment', to: 'PaymentResult' },
    ],
  },
  'user-auth': {
    name: 'user-auth',
    org: 'acme-corp',
    branch: 'develop',
    defaultTarget: 'verifyToken',
    nodes: [
      { id: 'verifyToken', label: 'verifyToken()', file: 'middleware/authenticate.ts', risk: 'changed', x: 50, y: 50, callers: 7, depth: 0 },
      { id: 'validateSession', label: 'validateSession()', file: 'routes/sessions.ts', risk: 'high', x: 20, y: 25, callers: 4, depth: 1 },
      { id: 'requireRole', label: 'requireRole()', file: 'middleware/rbac.ts', risk: 'high', x: 80, y: 25, callers: 3, depth: 1 },
      { id: 'authHeader', label: 'authHeader()', file: 'middleware/auth.ts', risk: 'medium', x: 15, y: 10, callers: 2, depth: 2 },
      { id: 'handleCallback', label: 'handleCallback()', file: 'services/oauth.ts', risk: 'high', x: 85, y: 10, callers: 1, depth: 2 },
      { id: 'decryptToken', label: 'decryptToken()', file: 'utils/crypto.ts', risk: 'medium', x: 15, y: 78, callers: 0, depth: 2 },
      { id: 'authTests', label: 'authMiddlewareTests', file: '__tests__/auth.test.ts', risk: 'high', x: 50, y: 78, callers: 0, depth: 1 },
      { id: 'JwtPayload', label: 'JwtPayload', file: 'types/auth.ts', risk: 'low', x: 80, y: 65, callers: 5, depth: 0 },
    ],
    edges: [
      { from: 'validateSession', to: 'verifyToken' },
      { from: 'requireRole', to: 'verifyToken' },
      { from: 'authHeader', to: 'validateSession' },
      { from: 'handleCallback', to: 'requireRole' },
      { from: 'verifyToken', to: 'decryptToken' },
      { from: 'authTests', to: 'verifyToken' },
      { from: 'verifyToken', to: 'JwtPayload' },
    ],
  },
};

export default function GraphPage() {
  const [activeRepoKey, setActiveRepoKey] = useActiveRepo();
  const currentGraphData = REPO_GRAPHS[activeRepoKey] || REPO_GRAPHS['api-gateway'];

  const [selected, setSelected] = useState<string | null>(currentGraphData.defaultTarget);
  const [zoom, setZoom] = useState(1);
  const [filterRisk, setFilterRisk] = useState<string>('all');

  // When repo changes, switch selected node to current target
  useEffect(() => {
    setSelected(currentGraphData.defaultTarget);
  }, [activeRepoKey, currentGraphData.defaultTarget]);

  const selectedNode = currentGraphData.nodes.find((n) => n.id === selected);

  const visibleNodes = filterRisk === 'all'
    ? currentGraphData.nodes
    : currentGraphData.nodes.filter((n) => n.risk === filterRisk || n.risk === 'changed');

  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = currentGraphData.edges.filter((e) => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to));

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff' }}>
      <Navbar />
      <div className="flex" style={{ paddingTop: 'var(--nav-height)' }}>
        <Sidebar />
        <main style={{ flex: 1, marginLeft: 240, display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--nav-height))' }}>

          {/* Top Bar */}
          <div style={{
            padding: '14px 28px',
            borderBottom: '1.5px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 18, color: '#121212', fontWeight: 800 }}>⬡</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#121212', fontFamily: 'var(--font-headline)' }}>
                Dependency Graph
              </span>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  background: 'rgba(139,92,246,0.1)',
                  color: '#6d28d9',
                  border: '1.5px solid rgba(139,92,246,0.25)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {currentGraphData.name} · {currentGraphData.branch}
              </div>
            </div>

            <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Filter:</span>
              {['all', 'high', 'medium', 'low'].map((r) => (
                <button
                  key={r}
                  onClick={() => setFilterRisk(r)}
                  style={{
                    fontSize: 11.5,
                    padding: '5px 14px',
                    textTransform: 'capitalize',
                    borderRadius: '9999px',
                    background: filterRisk === r ? '#d4af37' : '#121212',
                    color: filterRisk === r ? '#121212' : '#ffffff',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {r === 'all' ? 'All' : r}
                </button>
              ))}
              <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 4px' }} />
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.2, 2))}
                style={{ background: '#121212', color: '#ffffff', border: 'none', borderRadius: '9999px', padding: '4px 10px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                +
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.2, 0.4))}
                style={{ background: '#121212', color: '#ffffff', border: 'none', borderRadius: '9999px', padding: '4px 10px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                −
              </button>
              <button
                onClick={() => setZoom(1)}
                style={{ background: '#121212', color: '#ffffff', border: 'none', borderRadius: '9999px', padding: '5px 14px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
              >
                Reset
              </button>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Graph Canvas - Matching Exact Style Format in Reference Image */}
            <div style={{
              flex: 1,
              position: 'relative',
              overflow: 'hidden',
              background: '#ffffff',
            }}>
              {/* Subtle Grid Pattern */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5 }}>
                <defs>
                  <pattern id="light-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="0.8" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#light-grid)" />
              </svg>

              {/* Main SVG Graph */}
              <svg
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.2s ease' }}
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  {/* Directional Arrowhead Marker */}
                  <marker id="purple-arrowhead" markerWidth="4.5" markerHeight="4" refX="4.2" refY="2" orient="auto">
                    <polygon points="0 0, 4.5 2, 0 4" fill="#7c3aed" />
                  </marker>
                </defs>

                {/* Edges Matching Exact Style in Reference Image */}
                {visibleEdges.map((edge, i) => {
                  const from = visibleNodes.find((n) => n.id === edge.from);
                  const to = visibleNodes.find((n) => n.id === edge.to);
                  if (!from || !to) return null;
                  const isHighlighted = selected && (edge.from === selected || edge.to === selected);
                  const isDirectCall = edge.to === currentGraphData.defaultTarget || edge.from === currentGraphData.defaultTarget;

                  return (
                    <line key={i}
                      x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                      stroke={isHighlighted || isDirectCall ? '#7c3aed' : '#cbd5e1'}
                      strokeWidth={isHighlighted || isDirectCall ? '0.85' : '0.4'}
                      strokeDasharray={isHighlighted || isDirectCall ? '' : '2 2'}
                      markerEnd={isHighlighted || isDirectCall ? 'url(#purple-arrowhead)' : undefined}
                    />
                  );
                })}

                {/* Nodes Matching Exact Visual Style in Reference Image */}
                {visibleNodes.map((node) => {
                  const isSelected = selected === node.id;
                  const isTarget = node.risk === 'changed';
                  const cfg = RISK_LIGHT_COLORS[node.risk as keyof typeof RISK_LIGHT_COLORS] || RISK_LIGHT_COLORS.low;
                  const isConnected = selected && currentGraphData.edges.some(
                    (e) => (e.from === node.id && e.to === selected) || (e.from === selected && e.to === node.id)
                  );
                  const dimmed = selected && !isSelected && !isConnected;

                  return (
                    <g key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      onClick={() => setSelected(node.id === selected ? null : node.id)}
                      style={{ cursor: 'pointer', opacity: dimmed ? 0.35 : 1, transition: 'opacity 0.2s' }}
                    >
                      {/* Outer Ring Circle */}
                      <circle
                        r={isSelected ? '4.5' : isTarget ? '3.8' : '3.4'}
                        fill={cfg.fill}
                        stroke={cfg.stroke}
                        strokeWidth={isSelected ? '0.85' : '0.6'}
                      />

                      {/* Concentric Inner Ring for Target / Selected Node */}
                      {isTarget && (
                        <circle
                          r="2.2"
                          fill="none"
                          stroke="#d4af37"
                          strokeWidth="0.35"
                          strokeDasharray="1.2 1.2"
                        />
                      )}

                      {/* Inner Solid Center Core */}
                      <circle
                        r={isTarget ? '1.4' : '1.2'}
                        fill={cfg.solid}
                        stroke="#ffffff"
                        strokeWidth="0.4"
                      />

                      {/* Primary Symbol Name Label */}
                      <text
                        y="5.6"
                        textAnchor="middle"
                        fill="#0f172a"
                        fontSize="2.4"
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight={isSelected || isTarget ? 800 : 700}
                      >
                        {node.label.length > 20 ? node.label.slice(0, 18) + '…' : node.label}
                      </text>

                      {/* Secondary File Path Label */}
                      <text
                        y="7.7"
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="1.65"
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight={500}
                      >
                        {node.file}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Floating Legend Box with Crisp Borders */}
              <div style={{
                position: 'absolute', bottom: 20, left: 20,
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 18px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Legend
                </div>
                {[
                  { color: RISK_LIGHT_COLORS.changed.solid, label: 'Changed symbol' },
                  { color: RISK_LIGHT_COLORS.high.solid, label: 'High risk' },
                  { color: RISK_LIGHT_COLORS.medium.solid, label: 'Medium risk' },
                  { color: RISK_LIGHT_COLORS.low.solid, label: 'Low risk' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: item.color }} />
                    <span style={{ fontSize: 12.5, color: '#0f172a', fontWeight: 600 }}>{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Floating Stats Box with Crisp Borders */}
              <div style={{
                position: 'absolute', top: 16, left: 16,
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 18px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              }}>
                <div className="flex items-center gap-4">
                  {[
                    { label: 'Nodes', value: visibleNodes.length },
                    { label: 'Edges', value: visibleEdges.length },
                    { label: 'Depth', value: Math.max(...currentGraphData.nodes.map(n => n.depth)) },
                  ].map((s) => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#7c3aed', fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
                      <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Symbol Details Panel */}
            {selectedNode && (
              <div style={{
                width: 320,
                borderLeft: '1.5px solid #e2e8f0',
                background: '#ffffff',
                overflow: 'auto',
                flexShrink: 0,
                boxShadow: '-4px 0 20px rgba(0,0,0,0.03)',
              }}>
                <div style={{ padding: '20px' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: '#121212', fontFamily: 'var(--font-headline)' }}>
                      Symbol Details
                    </h3>
                    <button
                      onClick={() => setSelected(null)}
                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 }}
                    >
                      ×
                    </button>
                  </div>

                  {/* Selected Symbol Card with Crisp Dark Text & Solid Border */}
                  <div style={{
                    padding: '16px',
                    borderRadius: '10px',
                    marginBottom: 20,
                    background: 'rgba(139,92,246,0.06)',
                    border: '1.5px solid rgba(139,92,246,0.3)',
                    boxShadow: '0 2px 8px rgba(139,92,246,0.08)',
                  }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                      {selectedNode.label}
                    </div>
                    <div style={{ fontSize: 12, color: '#475569', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', marginBottom: 12 }}>
                      {selectedNode.file}
                    </div>
                    <div className="flex items-center gap-2">
                      <div style={{
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        background: `${RISK_LIGHT_COLORS[selectedNode.risk as keyof typeof RISK_LIGHT_COLORS]?.fill || 'rgba(0,0,0,0.05)'}`,
                        border: `1.5px solid ${RISK_LIGHT_COLORS[selectedNode.risk as keyof typeof RISK_LIGHT_COLORS]?.stroke || '#cbd5e1'}`,
                        fontSize: 10,
                        fontWeight: 800,
                        color: RISK_LIGHT_COLORS[selectedNode.risk as keyof typeof RISK_LIGHT_COLORS]?.solid || '#0f172a',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}>
                        {selectedNode.risk}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          background: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        depth {selectedNode.depth}
                      </div>
                    </div>
                  </div>

                  {/* Connections List with Crisp Dark Text and Borders */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                      CONNECTIONS
                    </div>
                    {currentGraphData.edges.filter((e) => e.from === selectedNode.id || e.to === selectedNode.id).map((edge, i) => {
                      const isFrom = edge.from === selectedNode.id;
                      const otherId = isFrom ? edge.to : edge.from;
                      const other = currentGraphData.nodes.find((n) => n.id === otherId);
                      if (!other) return null;
                      const otherCfg = RISK_LIGHT_COLORS[other.risk as keyof typeof RISK_LIGHT_COLORS] || RISK_LIGHT_COLORS.low;
                      return (
                        <div
                          key={i}
                          style={{
                            padding: '12px 14px',
                            background: '#ffffff',
                            border: '1.5px solid #e2e8f0',
                            borderRadius: '8px',
                            marginBottom: 8,
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            transition: 'all var(--transition-fast)',
                          }}
                          onClick={() => setSelected(otherId)}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#94a3b8')}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                        >
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: 11.5, color: isFrom ? '#0284c7' : '#ea580c', fontWeight: 700 }}>
                              {isFrom ? '→ calls' : '← called by'}
                            </span>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: otherCfg.solid, flexShrink: 0 }} />
                          </div>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                            {other.label}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                            {other.file}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button className="btn btn-primary" style={{ justifyContent: 'center', padding: '10px', fontSize: 12.5, fontWeight: 700 }}>
                      ⚡ Run impact from this node
                    </button>
                    <button className="btn btn-secondary" style={{ justifyContent: 'center', padding: '10px', fontSize: 12.5, fontWeight: 600 }}>
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
