'use client';
import Link from 'next/link';
import { useState } from 'react';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'verify'>('form');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('verify');
    }, 1200);
  };

  if (step === 'verify') {
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
        <div className="glow-orb glow-cyan" style={{ width: 500, height: 500, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: 0.2 }} />
        <div style={{ maxWidth: 420, width: '100%', padding: '0 24px', textAlign: 'center', position: 'relative' }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(34,211,238,0.1)',
            border: '2px solid rgba(34,211,238,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: 30,
          }}>✉</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Check your email</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 32, lineHeight: 1.7 }}>
            We sent a verification link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
            Click it to activate your account.
          </p>
          <Link href="/dashboard" className="btn btn-primary" style={{ padding: '14px 40px', fontSize: 15 }}>
            Continue to dashboard →
          </Link>
          <p style={{ marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
            Didn&apos;t receive it? <a href="#" style={{ color: 'var(--purple-400)', textDecoration: 'none' }}>Resend</a>
          </p>
        </div>
      </div>
    );
  }

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
      <div className="glow-orb glow-purple" style={{ width: 500, height: 500, top: -100, right: -150, opacity: 0.25 }} />
      <div className="glow-orb glow-cyan" style={{ width: 400, height: 400, bottom: -100, left: -100, opacity: 0.2 }} />
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />

      <div style={{ width: '100%', maxWidth: 440, padding: '0 24px', position: 'relative', zIndex: 1 }}>
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
          <h1 style={{ marginTop: 32, fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Create your account</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Start understanding your codebase in minutes</p>
        </div>

        {/* Trust signals */}
        <div className="flex items-center justify-center gap-6" style={{ marginBottom: 24 }}>
          {[
            { icon: '✓', label: 'Free forever plan' },
            { icon: '✓', label: 'No credit card' },
            { icon: '✓', label: '60s setup' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--emerald-400)' }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>

        <div className="glass-card" style={{ padding: 32 }}>
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
            Sign up with GitHub
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>or with email</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Full name
              </label>
              <input
                type="text"
                className="input"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                id="signup-name"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Work email
              </label>
              <input
                type="email"
                className="input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                id="signup-email"
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Password
              </label>
              <input
                type="password"
                className="input"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                id="signup-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              id="signup-submit"
              style={{ width: '100%', padding: '13px', fontSize: 15, borderRadius: 'var(--radius-md)', marginBottom: 12 }}
            >
              {loading ? 'Creating account...' : 'Create account →'}
            </button>

            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
              By signing up you agree to our{' '}
              <a href="#" style={{ color: 'var(--purple-400)', textDecoration: 'none' }}>Terms of Service</a>{' '}
              and{' '}
              <a href="#" style={{ color: 'var(--purple-400)', textDecoration: 'none' }}>Privacy Policy</a>.
            </p>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--purple-400)', textDecoration: 'none', fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
