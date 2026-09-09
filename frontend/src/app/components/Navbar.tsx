'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ApiClient, type UserProfileData } from '../lib/api';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [user, setUser] = useState<UserProfileData | null>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);

    const checkAuth = async () => {
      const token = ApiClient.getToken();
      const stored = ApiClient.getStoredUser();

      if (stored) {
        setUser(stored);
      }

      if (token) {
        setIsLoggedIn(true);
        try {
          const profile = await ApiClient.getMe();
          if (profile) {
            setUser(profile);
          }
        } catch {
          // Keep stored if available
        }
      } else {
        const isAuthRoute =
          pathname.startsWith('/dashboard') ||
          pathname.startsWith('/settings');

        setIsLoggedIn(isAuthRoute);
      }
    };

    checkAuth();
    window.addEventListener('ripple_auth_changed', checkAuth);
    window.addEventListener('ripple_profile_updated', checkAuth);

    return () => {
      window.removeEventListener('scroll', handler);
      window.removeEventListener('ripple_auth_changed', checkAuth);
      window.removeEventListener('ripple_profile_updated', checkAuth);
    };
  }, [pathname]);

  const handleLogout = () => {
    ApiClient.clearToken();
    setIsLoggedIn(false);
    setShowProfileMenu(false);
    setUser(null);
    router.push('/login');
  };

  const displayName = user?.username || 'User';
  const displayEmail = user?.email || 'user@example.com';
  const initials = (displayName[0] || 'U').toUpperCase();

  return (
    <nav
      className="navbar"
      style={{
        boxShadow: scrolled ? '0 4px 20px rgba(0,0,0,0.06)' : 'none',
        background: 'var(--surface-container-lowest, #ffffff)',
        borderBottom: '1px solid var(--border-card, #e2e8f0)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 'var(--nav-height, 64px)',
        zIndex: 50,
      }}
    >
      {/* Full width container spanning laptop edges cleanly */}
      <div
        style={{
          height: '100%',
          width: '100%',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo - Aligned left above sidebar */}
        <Link href="/" className="nav-logo" style={{ textDecoration: 'none' }}>
          <div className="nav-logo-icon">〜</div>
          <span>Ripple</span>
        </Link>

        {/* Right Action Area */}
        {isLoggedIn ? (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              aria-label="User profile menu"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '4px 12px 4px 6px',
                borderRadius: 'var(--radius-full, 9999px)',
                background: 'var(--surface, #f8fafc)',
                border: '1.5px solid var(--border-card, #e2e8f0)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#d4af37')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-card, #e2e8f0)')}
            >
              {/* Profile Avatar Circle */}
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
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                {displayName}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '120%',
                  right: 0,
                  width: 240,
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '10px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                  padding: '8px 0',
                  zIndex: 100,
                }}
              >
                <div style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>{displayName}</div>
                  <div style={{ fontSize: 11.5, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{displayEmail}</div>
                </div>

                <Link
                  href="/dashboard"
                  onClick={() => setShowProfileMenu(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 16px',
                    fontSize: 13,
                    color: '#0f172a',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span>◈</span>
                  <span>Dashboard Overview</span>
                </Link>

                <Link
                  href="/dashboard/repos"
                  onClick={() => setShowProfileMenu(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 16px',
                    fontSize: 13,
                    color: '#0f172a',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span>📁</span>
                  <span>Repositories</span>
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setShowProfileMenu(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 16px',
                    fontSize: 13,
                    color: '#0f172a',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span>⚙</span>
                  <span>Settings</span>
                </Link>

                <div style={{ margin: '6px 0', height: 1, background: '#f1f5f9' }} />

                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 16px',
                    fontSize: 13,
                    color: '#dc2626',
                    fontWeight: 700,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link href="/login" className="btn btn-secondary btn-sm">Log in</Link>
            <Link href="/signup" className="btn btn-primary btn-sm">Get Started</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
