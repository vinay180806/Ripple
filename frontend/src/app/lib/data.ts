// ─────────────────────────────────────────────────────────────────────────────
// lib/data.ts  —  Single source of truth for all app data
// Every page imports from here. Nothing is hardcoded in page files.
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────────────────────

export type RepoStatus = 'online' | 'indexing' | 'error';
export type RiskLevel = 'high' | 'medium' | 'low';
export type EventType = 'push' | 'impact' | 'index' | 'qa';
export type SeverityLevel = 'high' | 'medium' | 'low' | 'none';
export type IntegrationStatus = 'connected' | 'disconnected' | 'coming_soon';

export interface Repo {
  id: number;
  name: string;
  org: string;
  language: string;
  status: RepoStatus;
  lastIndexed: string;
  functions: number;
  files: number;
  coverage: number;
  impactReports: number;
  branch: string;
  stars: number;
  openPRs: number;
  description: string;
  commits: Commit[];
}

export interface Commit {
  sha: string;
  message: string;
  author: string;
  time: string;
  filesChanged: number;
}

export interface ActivityEvent {
  type: EventType;
  repoId: number;
  branch: string;
  user: string;
  msg: string;
  time: string;
  severity: SeverityLevel;
  commit: string | null;
}

export interface GraphNode {
  id: string;
  label: string;
  file: string;
  risk: 'changed' | RiskLevel;
  x: number;
  y: number;
  callers: number;
  depth: number;
}

export interface GraphEdge {
  from: string;
  to: string;
}

export interface AffectedSymbol {
  name: string;
  file: string;
  lines: string;
  risk: RiskLevel;
  reason: string;
  callers: number;
  depth: number;
}

export interface Integration {
  id: string;
  name: string;
  icon: string;
  desc: string;
  status: IntegrationStatus;
  detail: string | null;
  color: string;
  bg: string;
  border: string;
}

export interface WebhookEvent {
  event: string;
  repoId: number;
  branch: string;
  time: string;
  status: 'ok' | 'error';
}

export interface User {
  name: string;
  email: string;
  initials: string;
  workspace: string;
  plan: string;
  avatarGradient: string;
}

// ── User ─────────────────────────────────────────────────────────────────────

export const CURRENT_USER: User = {
  name: 'Venkata Vinay',
  initials: 'V',
  email: 'venkata@acme-corp.com',
  workspace: 'acme-corp',
  plan: 'Pro',
  avatarGradient: 'var(--grad-primary)',
};

// ── Repositories ─────────────────────────────────────────────────────────────

export const REPOS: Repo[] = [
  {
    id: 1,
    name: 'api-gateway',
    org: 'acme-corp',
    language: 'TypeScript',
    status: 'online',
    lastIndexed: '2 min ago',
    functions: 847,
    files: 132,
    coverage: 94,
    impactReports: 23,
    branch: 'main',
    stars: 142,
    openPRs: 4,
    description: 'Central API gateway handling routing, auth, and rate limiting for all microservices.',
    commits: [
      { sha: 'a3f2c9d', message: 'Update calculateTax signature', author: 'venkata', time: '2 min ago', filesChanged: 4 },
      { sha: 'f45d901', message: 'Add TaxJurisdiction type', author: 'venkata', time: '5 hours ago', filesChanged: 2 },
      { sha: 'd82bc11', message: 'Fix JWT expiry edge case', author: 'venkata', time: '1 day ago', filesChanged: 1 },
      { sha: 'e91fa23', message: 'Refactor router middleware chain', author: 'venkata', time: '2 days ago', filesChanged: 7 },
    ],
  },
  {
    id: 2,
    name: 'payment-service',
    org: 'acme-corp',
    language: 'TypeScript',
    status: 'indexing',
    lastIndexed: 'Indexing...',
    functions: 312,
    files: 58,
    coverage: 78,
    impactReports: 9,
    branch: 'main',
    stars: 67,
    openPRs: 1,
    description: 'Handles payment processing, refunds, and subscription billing via Stripe integration.',
    commits: [
      { sha: 'b12c3d4', message: 'Add refund webhook handler', author: 'venkata', time: '8 hours ago', filesChanged: 3 },
      { sha: 'c56e7f8', message: 'Retry logic for failed payments', author: 'venkata', time: '2 days ago', filesChanged: 5 },
    ],
  },
  {
    id: 3,
    name: 'user-auth',
    org: 'acme-corp',
    language: 'TypeScript',
    status: 'online',
    lastIndexed: '1 hour ago',
    functions: 195,
    files: 41,
    coverage: 91,
    impactReports: 15,
    branch: 'develop',
    stars: 88,
    openPRs: 2,
    description: 'User authentication, session management, RBAC, and OAuth2 provider integrations.',
    commits: [
      { sha: 'c91a3be', message: 'Auth middleware refactor', author: 'venkata', time: '3 hours ago', filesChanged: 11 },
      { sha: 'b82ef34', message: 'JWT expiry handling', author: 'venkata', time: '1 day ago', filesChanged: 6 },
      { sha: 'a10d22f', message: 'Add Google OAuth provider', author: 'venkata', time: '3 days ago', filesChanged: 4 },
    ],
  },
];

// Helper: get repo by id or name
export function getRepoById(id: number): Repo | undefined {
  return REPOS.find((r) => r.id === id);
}

export function getRepoByName(name: string): Repo | undefined {
  return REPOS.find((r) => r.name === name);
}

// Flat map for chat page (keyed by name)
export const REPOS_BY_NAME: Record<string, Repo> = Object.fromEntries(
  REPOS.map((r) => [r.name, r])
);

// ── Activity Events ───────────────────────────────────────────────────────────

export const ACTIVITY_EVENTS: ActivityEvent[] = [
  { type: 'push', repoId: 1, branch: 'main', user: 'venkata', msg: '4 files changed · calculateTax signature updated', time: '3 min ago', severity: 'medium', commit: 'a3f2c9d' },
  { type: 'impact', repoId: 2, branch: 'main', user: 'venkata', msg: 'Impact report run · processPayment() — 8 callers affected', time: '18 min ago', severity: 'high', commit: null },
  { type: 'index', repoId: 3, branch: 'develop', user: 'system', msg: 'Full re-index complete · 195 functions mapped · 41 files', time: '1 hour ago', severity: 'none', commit: null },
  { type: 'qa', repoId: 1, branch: 'main', user: 'venkata', msg: 'Q&A query · "Where is rate limiting applied?"', time: '2 hours ago', severity: 'none', commit: null },
  { type: 'push', repoId: 3, branch: 'develop', user: 'venkata', msg: '11 files changed · Auth middleware refactor', time: '3 hours ago', severity: 'high', commit: 'c91a3be' },
  { type: 'push', repoId: 1, branch: 'feature/tax-v2', user: 'venkata', msg: '2 files changed · Add TaxJurisdiction type', time: '5 hours ago', severity: 'low', commit: 'f45d901' },
  { type: 'impact', repoId: 1, branch: 'main', user: 'venkata', msg: 'Impact report run · validateUser() — 3 callers affected', time: '7 hours ago', severity: 'medium', commit: null },
  { type: 'index', repoId: 2, branch: 'main', user: 'system', msg: 'Incremental re-index triggered by push · 7 functions updated', time: '8 hours ago', severity: 'none', commit: null },
  { type: 'qa', repoId: 2, branch: 'main', user: 'venkata', msg: 'Q&A query · "What does the refund flow look like?"', time: '1 day ago', severity: 'none', commit: null },
  { type: 'push', repoId: 3, branch: 'main', user: 'venkata', msg: '6 files changed · JWT expiry handling', time: '1 day ago', severity: 'medium', commit: 'b82ef34' },
];

// Helper: get events for a specific repo
export function getEventsForRepo(repoId: number): ActivityEvent[] {
  return ACTIVITY_EVENTS.filter((e) => e.repoId === repoId);
}

// ── Graph Data (impact for api-gateway / calculateTax) ───────────────────────

export const GRAPH_NODES: GraphNode[] = [
  { id: 'calculateTax', label: 'calculateTax()', file: 'services/tax.ts', risk: 'changed', x: 50, y: 50, callers: 6, depth: 0 },
  { id: 'processCheckout', label: 'processCheckout()', file: 'services/order.ts', risk: 'high', x: 20, y: 25, callers: 3, depth: 1 },
  { id: 'compute', label: 'compute()', file: 'services/invoice.ts', risk: 'high', x: 80, y: 25, callers: 2, depth: 1 },
  { id: 'monthlyTaxSummary', label: 'monthlyTaxSummary()', file: 'services/reports.ts', risk: 'medium', x: 15, y: 10, callers: 1, depth: 2 },
  { id: 'displayTotal', label: 'displayTotal()', file: 'AdminDashboard.tsx', risk: 'medium', x: 50, y: 10, callers: 0, depth: 3 },
  { id: 'formatReceipt', label: 'formatReceipt()', file: 'templates/receipt.ts', risk: 'low', x: 85, y: 10, callers: 1, depth: 2 },
  { id: 'taxTests', label: 'calculateTaxTests', file: '__tests__/tax.test.ts', risk: 'high', x: 50, y: 78, callers: 0, depth: 1 },
  { id: 'TaxResult', label: 'TaxResult', file: 'types/index.ts', risk: 'low', x: 80, y: 65, callers: 4, depth: 0 },
];

export const GRAPH_EDGES: GraphEdge[] = [
  { from: 'processCheckout', to: 'calculateTax' },
  { from: 'compute', to: 'calculateTax' },
  { from: 'monthlyTaxSummary', to: 'processCheckout' },
  { from: 'displayTotal', to: 'monthlyTaxSummary' },
  { from: 'formatReceipt', to: 'compute' },
  { from: 'taxTests', to: 'calculateTax' },
  { from: 'calculateTax', to: 'TaxResult' },
];

// ── Impact Report Data ────────────────────────────────────────────────────────

export const AFFECTED_SYMBOLS: AffectedSymbol[] = [
  { name: 'OrderService.processCheckout', file: 'services/order.ts', lines: 'L112–L145', risk: 'high', reason: 'Directly calls calculateTax() with the modified signature', callers: 3, depth: 1 },
  { name: 'InvoiceGenerator.compute', file: 'services/invoice.ts', lines: 'L78–L96', risk: 'high', reason: 'Calls calculateTax() with a third positional argument that no longer exists', callers: 2, depth: 1 },
  { name: 'ReportService.monthlyTaxSummary', file: 'services/reports.ts', lines: 'L201–L220', risk: 'medium', reason: 'Receives results from InvoiceGenerator.compute — indirectly affected', callers: 1, depth: 2 },
  { name: 'AdminDashboard.displayTotal', file: 'components/AdminDashboard.tsx', lines: 'L88–L102', risk: 'medium', reason: 'Renders values from ReportService — display layer affected', callers: 0, depth: 3 },
  { name: 'EmailTemplate.formatReceipt', file: 'templates/email/receipt.ts', lines: 'L14–L28', risk: 'low', reason: 'Formats tax amount for display — value change, no signature break', callers: 1, depth: 2 },
  { name: 'TestSuite.calculateTaxTests', file: '__tests__/tax.test.ts', lines: 'L1–L67', risk: 'high', reason: 'Unit tests directly test calculateTax() — all will fail with signature change', callers: 0, depth: 1 },
  { name: 'types/TaxResult', file: 'types/index.ts', lines: 'L34–L40', risk: 'low', reason: 'Return type may need update to match new calculation output', callers: 4, depth: 0 },
];

export const DIFF_CONTENT = `- function calculateTax(amount: number, rate: number): number {
-   return amount * rate;
- }

+ function calculateTax(
+   amount: number,
+   rate: number,
+   jurisdiction: TaxJurisdiction  // NEW required param
+ ): TaxResult {
+   return { base: amount * rate.baseRate, surcharge: ... };
+ }`;

export const IMPACT_REPORT_META = {
  changedSymbol: 'calculateTax()',
  file: 'services/tax.ts',
  repoId: 1,
  branch: 'main',
  commit: 'a3f2c9d',
  generatedAt: '2 minutes ago',
  traversalDepth: 4,
};

// ── Integrations ──────────────────────────────────────────────────────────────

export const INTEGRATIONS: Integration[] = [
  {
    id: 'github',
    name: 'GitHub',
    icon: '⊙',
    desc: 'Connect repositories, receive push webhooks, and trigger incremental re-indexing on every commit.',
    status: 'connected',
    detail: 'Connected as @venkata-vinay · 3 repos',
    color: 'var(--purple-400)',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.2)',
  },
  {
    id: 'anthropic',
    name: 'Claude (Anthropic)',
    icon: '〜',
    desc: 'LLM for grounded synthesis and explanation. Never used for structural assertions — retrieval handles facts.',
    status: 'connected',
    detail: 'claude-3-5-sonnet · API key configured',
    color: 'var(--cyan-400)',
    bg: 'rgba(34,211,238,0.08)',
    border: 'rgba(34,211,238,0.2)',
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: '◈',
    desc: 'Post impact report summaries to a Slack channel when a PR is opened or a high-risk report is generated.',
    status: 'disconnected',
    detail: null,
    color: 'var(--emerald-400)',
    bg: 'rgba(52,211,153,0.06)',
    border: 'rgba(52,211,153,0.15)',
  },
  {
    id: 'linear',
    name: 'Linear',
    icon: '⟟',
    desc: 'Auto-link impact reports to Linear issues. See affected symbols directly on the issue detail page.',
    status: 'disconnected',
    detail: null,
    color: 'var(--purple-300)',
    bg: 'rgba(196,181,253,0.06)',
    border: 'rgba(196,181,253,0.15)',
  },
  {
    id: 'jira',
    name: 'Jira',
    icon: '◧',
    desc: 'Attach Ripple impact reports as Jira issue comments. Requires Atlassian Cloud.',
    status: 'coming_soon',
    detail: null,
    color: 'var(--orange-400)',
    bg: 'rgba(251,146,60,0.06)',
    border: 'rgba(251,146,60,0.15)',
  },
  {
    id: 'vscode',
    name: 'VS Code Extension',
    icon: '⬡',
    desc: 'Run impact reports and ask Q&A directly from your editor. Highlight changed functions to see their blast radius inline.',
    status: 'coming_soon',
    detail: null,
    color: 'var(--cyan-300)',
    bg: 'rgba(103,232,249,0.06)',
    border: 'rgba(103,232,249,0.15)',
  },
];

export const WEBHOOK_EVENTS: WebhookEvent[] = [
  { event: 'push', repoId: 1, branch: 'main', time: '2 min ago', status: 'ok' },
  { event: 'push', repoId: 3, branch: 'develop', time: '3 hours ago', status: 'ok' },
  { event: 'push', repoId: 2, branch: 'main', time: '8 hours ago', status: 'ok' },
  { event: 'push', repoId: 1, branch: 'feature/tax-v2', time: '1 day ago', status: 'ok' },
  { event: 'push', repoId: 3, branch: 'main', time: '1 day ago', status: 'error' },
];

// ── UI Config Maps (used across multiple pages) ────────────────────────────────

export const RISK_COLORS: Record<string, string> = {
  changed: '#8b5cf6',
  high: '#f87171',
  medium: '#fb923c',
  low: '#fbbf24',
};

export const RISK_BG: Record<string, string> = {
  changed: 'rgba(139,92,246,0.1)',
  high: 'rgba(248,113,113,0.1)',
  medium: 'rgba(251,146,60,0.1)',
  low: 'rgba(251,191,36,0.1)',
};

export const RISK_BORDER: Record<string, string> = {
  changed: 'rgba(139,92,246,0.3)',
  high: 'rgba(248,113,113,0.3)',
  medium: 'rgba(251,146,60,0.25)',
  low: 'rgba(251,191,36,0.25)',
};

export const RISK_BADGE_CLASS: Record<string, string> = {
  high: 'badge-red',
  medium: 'badge-orange',
  low: 'badge-yellow',
};

export const EVENT_CONFIG: Record<EventType, { icon: string; label: string; bg: string; color: string }> = {
  push: { icon: '⬆', label: 'Push', bg: 'rgba(139,92,246,0.12)', color: 'var(--purple-400)' },
  impact: { icon: '⚡', label: 'Impact Report', bg: 'rgba(251,146,60,0.12)', color: 'var(--orange-400)' },
  index: { icon: '◷', label: 'Indexing', bg: 'rgba(34,211,238,0.1)', color: 'var(--cyan-400)' },
  qa: { icon: '◈', label: 'Q&A', bg: 'rgba(52,211,153,0.1)', color: 'var(--emerald-400)' },
};

export const STATUS_CONFIG: Record<RepoStatus, { dot: string; label: string; color: string }> = {
  online: { dot: 'online', label: 'Indexed', color: 'var(--emerald-400)' },
  indexing: { dot: 'indexing', label: 'Indexing', color: 'var(--yellow-400)' },
  error: { dot: 'error', label: 'Error', color: 'var(--red-400)' },
};
