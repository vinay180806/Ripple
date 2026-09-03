'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { getRepoSpec, type RepoSpecification } from '../lib/repoSpecs';
import { useActiveRepo } from '../lib/repoContext';
import { type GraphNode, type GraphEdge } from '../lib/data';

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

const DRAWER_GRAPHS: Record<string, {
  name: string;
  defaultTarget: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}> = {
  'api-gateway': {
    name: 'api-gateway',
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

export interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'impact' | 'graph';
  onTabChange: (tab: 'impact' | 'graph') => void;
  repoName?: string;
  repoKey?: string;
  data?: any;
}

export default function DetailDrawer({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  repoName,
  repoKey,
}: DetailDrawerProps) {
  const [globalRepo] = useActiveRepo();
  const currentKey = repoKey || repoName || globalRepo || 'api-gateway';
  const currentSpec: RepoSpecification = getRepoSpec(currentKey);
  const currentGraphData = DRAWER_GRAPHS[currentKey] || DRAWER_GRAPHS['api-gateway'];

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(currentGraphData.defaultTarget);

  if (!isOpen) return null;

  const selectedNode = currentGraphData.nodes.find((n) => n.id === selectedNodeId) || currentGraphData.nodes[0];

  return (
    <aside
      aria-label="Detail Drawer"
      style={{
        width: 390,
        maxWidth: '100%',
        background: '#ffffff',
        borderLeft: '1.5px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.05)',
        flexShrink: 0,
        zIndex: 40,
        overflowY: 'auto',
      }}
    >
      {/* ── Top Header with Tab Switcher & Close ── */}
      <div
        style={{
          padding: '16px 20px 0 20px',
          borderBottom: '1.5px solid #e2e8f0',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Impact Report Tab */}
          <button
            onClick={() => onTabChange('impact')}
            style={{
              paddingBottom: 12,
              fontSize: 13.5,
              fontWeight: activeTab === 'impact' ? 800 : 500,
              color: activeTab === 'impact' ? '#121212' : '#64748b',
              borderBottom: activeTab === 'impact' ? '2.5px solid #d4af37' : '2.5px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all var(--transition-fast)',
            }}
          >
            <span>⚡</span>
            <span>Impact Report</span>
          </button>

          {/* Dependency Graph Tab */}
          <button
            onClick={() => onTabChange('graph')}
            style={{
              paddingBottom: 12,
              fontSize: 13.5,
              fontWeight: activeTab === 'graph' ? 800 : 500,
              color: activeTab === 'graph' ? '#121212' : '#64748b',
              borderBottom: activeTab === 'graph' ? '2.5px solid #d4af37' : '2.5px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all var(--transition-fast)',
            }}
          >
            <span>⬡</span>
            <span>Dependency Graph</span>
          </button>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close panel"
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background var(--transition-fast)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* ── Tab Content: IMPACT REPORT ── */}
      {activeTab === 'impact' && (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Summary for Selected Repository */}
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#64748b',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              Summary · <span style={{ color: '#0f172a' }}>{currentSpec.org}/{currentSpec.name}</span>
            </div>
            <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
              Changing <code style={{ fontFamily: 'var(--font-mono)', background: '#f1f5f9', padding: '2px 5px', borderRadius: 4, color: '#0f172a', fontSize: 12 }}>{currentSpec.targetSymbol}</code>: {currentSpec.summary}
            </p>
          </div>

          {/* Grouped Impact List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* HIGH IMPACT */}
            <div style={{ background: '#ffffff', border: '1.5px solid #fee2e2', borderRadius: '8px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span className="status-dot error" style={{ width: 7, height: 7 }} />
                <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#dc2626', textTransform: 'uppercase' }}>
                  HIGH IMPACT ({currentSpec.highImpact.length})
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {currentSpec.highImpact.map((item, idx) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      <span>📄</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{item.file}</span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: 2, paddingLeft: 20 }}>
                      {item.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MEDIUM IMPACT */}
            <div style={{ background: '#ffffff', border: '1.5px solid #ffedd5', borderRadius: '8px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span className="status-dot" style={{ width: 7, height: 7, background: '#ea580c' }} />
                <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#ea580c', textTransform: 'uppercase' }}>
                  MEDIUM IMPACT ({currentSpec.mediumImpact.length})
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {currentSpec.mediumImpact.map((item, idx) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      <span>📄</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{item.file}</span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: 2, paddingLeft: 20 }}>
                      {item.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* LOW IMPACT */}
            <div style={{ background: '#ffffff', border: '1.5px solid #dcfce7', borderRadius: '8px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span className="status-dot online" style={{ width: 7, height: 7 }} />
                <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#16a34a', textTransform: 'uppercase' }}>
                  LOW IMPACT ({currentSpec.lowImpactCount})
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', paddingLeft: 15 }}>
                {currentSpec.lowImpactDescription}
              </div>
            </div>
          </div>

          {/* Recommendation Card */}
          <div
            style={{
              padding: '16px',
              borderRadius: '8px',
              background: '#fefce8',
              border: '1.5px solid #fef08a',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '12px', fontWeight: 800, color: '#854d0e', marginBottom: 6 }}>
              <span>💡</span>
              <span>Recommendation</span>
            </div>
            <p style={{ fontSize: '12.5px', color: '#0f172a', lineHeight: 1.5 }}>
              {currentSpec.recommendation}
            </p>
          </div>
        </div>
      )}

      {/* ── Tab Content: DEPENDENCY GRAPH ── */}
      {activeTab === 'graph' && (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Call hierarchy &amp; node dependencies for <strong style={{ color: '#0f172a' }}>{currentSpec.name}</strong>
          </div>

          {/* Mini Interactive Visual Graph matching exact style in reference image */}
          <div
            style={{
              height: 250,
              borderRadius: '10px',
              border: '1.5px solid #e2e8f0',
              background: '#ffffff',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            {/* Subtle Grid */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5 }}>
              <defs>
                <pattern id="drawer-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#drawer-grid)" />
            </svg>

            {/* SVG Visual Graph */}
            <svg
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <marker id="drawer-arrow" markerWidth="4.5" markerHeight="4" refX="4.2" refY="2" orient="auto">
                  <polygon points="0 0, 4.5 2, 0 4" fill="#7c3aed" />
                </marker>
              </defs>

              {/* Edges */}
              {currentGraphData.edges.map((edge, i) => {
                const from = currentGraphData.nodes.find((n) => n.id === edge.from);
                const to = currentGraphData.nodes.find((n) => n.id === edge.to);
                if (!from || !to) return null;
                const isHighlighted = selectedNodeId && (edge.from === selectedNodeId || edge.to === selectedNodeId);
                const isDirectCall = edge.to === currentGraphData.defaultTarget || edge.from === currentGraphData.defaultTarget;

                return (
                  <line
                    key={i}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={isHighlighted || isDirectCall ? '#7c3aed' : '#cbd5e1'}
                    strokeWidth={isHighlighted || isDirectCall ? '0.85' : '0.4'}
                    strokeDasharray={isHighlighted || isDirectCall ? '' : '2 2'}
                    markerEnd={isHighlighted || isDirectCall ? 'url(#drawer-arrow)' : undefined}
                  />
                );
              })}

              {/* Nodes */}
              {currentGraphData.nodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const isTarget = node.risk === 'changed';
                const cfg = RISK_LIGHT_COLORS[node.risk as keyof typeof RISK_LIGHT_COLORS] || RISK_LIGHT_COLORS.low;
                const isConnected = selectedNodeId && currentGraphData.edges.some(
                  (e) => (e.from === node.id && e.to === selectedNodeId) || (e.from === selectedNodeId && e.to === node.id)
                );
                const dimmed = selectedNodeId && !isSelected && !isConnected;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => setSelectedNodeId(node.id)}
                    style={{ cursor: 'pointer', opacity: dimmed ? 0.35 : 1, transition: 'opacity 0.2s' }}
                  >
                    <circle
                      r={isSelected ? '4.5' : isTarget ? '3.8' : '3.4'}
                      fill={cfg.fill}
                      stroke={cfg.stroke}
                      strokeWidth={isSelected ? '0.85' : '0.6'}
                    />
                    {isTarget && (
                      <circle
                        r="2.2"
                        fill="none"
                        stroke="#d4af37"
                        strokeWidth="0.35"
                        strokeDasharray="1.2 1.2"
                      />
                    )}
                    <circle
                      r={isTarget ? '1.4' : '1.2'}
                      fill={cfg.solid}
                      stroke="#ffffff"
                      strokeWidth="0.4"
                    />
                    <text
                      y="5.8"
                      textAnchor="middle"
                      fill="#0f172a"
                      fontSize="2.5"
                      fontFamily="var(--font-mono)"
                      fontWeight={isSelected || isTarget ? 800 : 700}
                    >
                      {node.label.length > 16 ? node.label.slice(0, 14) + '…' : node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Selected Symbol Highlight Card */}
          {selectedNode && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '8px',
                background: 'rgba(139,92,246,0.06)',
                border: '1.5px solid rgba(139,92,246,0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.05em', color: '#6d28d9', textTransform: 'uppercase' }}>
                  {selectedNode.risk === 'changed' ? 'TARGET / MODIFIED SYMBOL' : 'SELECTED NODE'}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: `${RISK_LIGHT_COLORS[selectedNode.risk as keyof typeof RISK_LIGHT_COLORS]?.fill || 'rgba(0,0,0,0.05)'}`,
                    color: RISK_LIGHT_COLORS[selectedNode.risk as keyof typeof RISK_LIGHT_COLORS]?.solid || '#0f172a',
                    border: `1px solid ${RISK_LIGHT_COLORS[selectedNode.risk as keyof typeof RISK_LIGHT_COLORS]?.stroke || '#cbd5e1'}`,
                    textTransform: 'uppercase',
                  }}
                >
                  {selectedNode.risk}
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>
                {selectedNode.label}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: '#475569', marginTop: 2 }}>
                {selectedNode.file}
              </div>
            </div>
          )}

          {/* Upstream & Downstream Hierarchy */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Connected Nodes ({currentGraphData.nodes.length})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {currentGraphData.nodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const cfg = RISK_LIGHT_COLORS[node.risk as keyof typeof RISK_LIGHT_COLORS] || RISK_LIGHT_COLORS.low;
                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: isSelected ? '#f8fafc' : '#ffffff',
                      border: isSelected ? '1.5px solid #d4af37' : '1.5px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: cfg.solid,
                          }}
                        />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
                          {node.label}
                        </span>
                      </div>
                      <span style={{ fontSize: '10.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                        {node.risk}
                      </span>
                    </div>

                    <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'var(--font-mono)', marginTop: 4, paddingLeft: 16 }}>
                      {node.file}
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 4, paddingLeft: 16, fontSize: '11px', color: '#64748b' }}>
                      <span>Callers: <strong style={{ color: '#0f172a' }}>{node.callers}</strong></span>
                      <span>Depth: <strong style={{ color: '#0f172a' }}>{node.depth}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Link to Full Graph */}
          <Link
            href="/graph"
            className="btn btn-primary btn-sm"
            style={{
              marginTop: 4,
              justifyContent: 'center',
              padding: '10px 16px',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            ⬡ Open Full Interactive Graph Canvas
          </Link>
        </div>
      )}
    </aside>
  );
}
