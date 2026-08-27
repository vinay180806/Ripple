'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { icon: '◈', label: 'Overview', href: '/dashboard' },
  { icon: '◧', label: 'Repositories', href: '/dashboard/repos' },
  { icon: '⟟', label: 'Impact Reports', href: '/impact' },
  { icon: '⊙', label: 'Q&A Chat', href: '/chat' },
  { icon: '⬡', label: 'Dep Graph', href: '/graph' },
  { icon: '◷', label: 'Activity', href: '/dashboard/activity' },
];

const settingsItems = [
  { icon: '⚙', label: 'Settings', href: '/settings' },
  { icon: '⬡', label: 'Integrations', href: '/integrations' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <span className="sidebar-label">Main</span>
      <div className="sidebar-section">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-item ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>

      <div style={{ margin: '16px 0', height: '1px', background: 'var(--border-subtle)', marginLeft: '12px', marginRight: '12px' }} />

      <span className="sidebar-label">System</span>
      <div className="sidebar-section">
        {settingsItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-item ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>

      {/* User Profile at Bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 12px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)',
      }}>
        <div className="flex items-center gap-3">
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--grad-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 700,
            flexShrink: 0,
          }}>V</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Venkata Vinay</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pro Plan</div>
          </div>
          <div className="status-dot online" />
        </div>
      </div>
    </aside>
  );
}
