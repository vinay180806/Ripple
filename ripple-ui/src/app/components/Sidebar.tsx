'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ApiClient, type UserProfileData } from '../lib/api';

interface NavItem {
  icon: (active: boolean) => React.ReactNode;
  label: string;
  href: string;
}

const mainNavItems: NavItem[] = [
  {
    label: 'Overview',
    href: '/dashboard',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: 'Repositories',
    href: '/dashboard/repos',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="9" y1="3" x2="9" y2="21" />
      </svg>
    ),
  },
];

const systemNavItems: NavItem[] = [
  {
    label: 'Settings',
    href: '/settings',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfileData | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const stored = ApiClient.getStoredUser();
      if (stored) setUser(stored);

      const token = ApiClient.getToken();
      if (token) {
        try {
          const profile = await ApiClient.getMe();
          if (profile) setUser(profile);
        } catch {
          // ignore
        }
      }
    };

    loadUser();
    window.addEventListener('ripple_auth_changed', loadUser);
    window.addEventListener('ripple_profile_updated', loadUser);
    return () => {
      window.removeEventListener('ripple_auth_changed', loadUser);
      window.removeEventListener('ripple_profile_updated', loadUser);
    };
  }, []);

  const displayName = user?.username || 'User';
  const displayEmail = user?.email || 'user@example.com';
  const initials = (displayName[0] || 'U').toUpperCase();

  return (
    <aside
      className="sidebar"
      style={{
        width: 240,
        height: 'calc(100vh - var(--nav-height, 64px))',
        position: 'fixed',
        top: 'var(--nav-height, 64px)',
        left: 0,
        bottom: 0,
        background: 'var(--surface-container-lowest, #ffffff)',
        borderRight: '1.5px solid var(--border-card, #e2e8f0)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '16px 0 12px 0',
        zIndex: 40,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* MAIN SECTION */}
        <span
          className="sidebar-label"
          style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.08em',
            color: 'var(--text-muted, #64748b)',
            padding: '4px 20px 8px',
            textTransform: 'uppercase',
          }}
        >
          Main
        </span>
        <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '9px 14px',
                  borderRadius: '10px',
                  fontSize: '13.5px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--text-primary, #0f172a)' : 'var(--text-secondary, #475569)',
                  background: isActive ? 'rgba(212, 175, 55, 0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid transparent',
                  textDecoration: 'none',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <span style={{ color: isActive ? 'var(--text-primary, #0f172a)' : 'var(--text-muted, #64748b)', display: 'flex', alignItems: 'center' }}>
                  {item.icon(isActive)}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* DIVIDER */}
        <div
          style={{
            margin: '16px 20px',
            height: '1px',
            background: 'var(--border-card, #e2e8f0)',
          }}
        />

        {/* SYSTEM SECTION */}
        <span
          className="sidebar-label"
          style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.08em',
            color: 'var(--text-muted, #64748b)',
            padding: '4px 20px 8px',
            textTransform: 'uppercase',
          }}
        >
          System
        </span>
        <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {systemNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '9px 14px',
                  borderRadius: '10px',
                  fontSize: '13.5px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--text-primary, #0f172a)' : 'var(--text-secondary, #475569)',
                  background: isActive ? 'rgba(212, 175, 55, 0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid transparent',
                  textDecoration: 'none',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <span style={{ color: isActive ? 'var(--text-primary, #0f172a)' : 'var(--text-muted, #64748b)', display: 'flex', alignItems: 'center' }}>
                  {item.icon(isActive)}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* USER PROFILE FOOTER */}
      <div
        style={{
          padding: '12px 14px 4px 14px',
          borderTop: '1.5px solid var(--border-card, #e2e8f0)',
          background: 'var(--surface-container-lowest, #ffffff)',
          marginTop: 'auto',
          flexShrink: 0,
        }}
      >
        <Link
          href="/settings"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 8px',
            borderRadius: '10px',
            textDecoration: 'none',
            transition: 'background var(--transition-fast)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-container-low, #f8fafc)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--primary, #0f172a)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--text-primary, #0f172a)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayName}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-muted, #64748b)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayEmail}
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
