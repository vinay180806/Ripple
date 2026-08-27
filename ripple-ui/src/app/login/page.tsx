'use client';
import Link from 'next/link';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      window.location.href = '/dashboard';
    }, 1200);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background */}
      <div className="glow-orb glow-purple" style={{ width: 500, height: 500, top: -100, left: -150, opacity: 0.3 }} />
      <div className="glow-orb glow-cyan" style={{ width: 400, height: 400, bottom: -100, right: -100, opacity: 0.2 }} />
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />

      <div style={{ width: '100%', maxWidth: 420, padding: '0 24px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            textDecoration: 'none', color: 'var(--text-primary)',
            fontSize: 22, fontWeight: 800,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'var(--grad-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, boxShadow: '0 0 30px rgba(139,92,246,0.6)',
            }}>〜</div>
            Ripple
          </Link>
          <h1 style={{ marginTop: 32, fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Welcome back</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Sign in to your workspace</p>
        </div>

        <div className="glass-card" style={{ padding: 32 }}>
          {/* GitHub OAuth */}
          <button
            style={{
              width: '100%',
              padding: '12px 20px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              transition: 'all var(--transition-fast)',
              fontFamily: 'Inter, sans-serif',
              marginBottom: 24,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.09)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Continue with GitHub
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>or with email</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Email
              </label>
              <input
                type="email"
                className="input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                id="email"
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Password</label>
                <a href="#" style={{ fontSize: 12, color: 'var(--purple-400)', textDecoration: 'none' }}>Forgot password?</a>
              </div>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                id="password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '13px', fontSize: 15, borderRadius: 'var(--radius-md)' }}
              id="login-submit"
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 16, height: 16,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    display: 'inline-block',
                  }} />
                  Signing in...
                </span>
              ) : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-muted)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: 'var(--purple-400)', textDecoration: 'none', fontWeight: 600 }}>
            Sign up free
          </Link>
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
