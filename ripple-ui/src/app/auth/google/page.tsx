'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '../../lib/api';

interface AccountItem {
  name: string;
  email: string;
  avatar: string;
  color: string;
}

export default function GoogleAuthConsentPage() {
  const router = useRouter();
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'choose' | 'confirm'>('choose');
  const [accounts, setAccounts] = useState<AccountItem[]>([]);

  useEffect(() => {
    // Load previously used accounts from localStorage
    try {
      const stored = localStorage.getItem('ripple_google_accounts');
      if (stored) {
        setAccounts(JSON.parse(stored));
      } else {
        const defaultAccounts: AccountItem[] = [
          { name: 'Kasi Viswas', email: 'kasiviswas2006@gmail.com', avatar: 'K', color: '#0284c7' },
          { name: 'Viswa Kasi', email: 'viswaskasi2006@gmail.com', avatar: 'V', color: '#16a34a' },
          { name: 'Workspace User', email: 'nooooook1216@gmail.com', avatar: 'W', color: '#ea580c' },
        ];
        setAccounts(defaultAccounts);
      }
    } catch {
      // fallback
    }
  }, []);

  const handleSelectAccount = (email: string) => {
    setSelectedAccount(email);
    setStep('confirm');
  };

  const handleManualEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    const cleanEmail = emailInput.trim().toLowerCase();

    // Save to accounts list
    const updated = [
      {
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        avatar: cleanEmail[0].toUpperCase(),
        color: '#2563eb',
      },
      ...accounts.filter((a) => a.email.toLowerCase() !== cleanEmail),
    ];
    setAccounts(updated);
    try {
      localStorage.setItem('ripple_google_accounts', JSON.stringify(updated));
    } catch {}

    handleSelectAccount(cleanEmail);
  };

  const handleConfirmAccess = async () => {
    const emailToUse = selectedAccount || emailInput.trim();
    if (!emailToUse) return;

    setLoading(true);
    try {
      const name = emailToUse.split('@')[0];
      await ApiClient.googleDirectLogin(emailToUse, name);
      router.push('/dashboard');
    } catch {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#131314',
        color: '#e3e3e3',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '32px 48px',
        fontFamily: 'Roboto, Arial, sans-serif',
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="22" height="22" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span style={{ fontSize: '15px', color: '#c4c7c5', fontWeight: 500 }}>Sign in with Google</span>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: 840, width: '100%', margin: '40px auto', display: 'flex', gap: 64, alignItems: 'flex-start' }}>
        {/* Left Column: Title */}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '36px', fontWeight: 400, color: '#e3e3e3', lineHeight: 1.2, margin: '0 0 16px 0' }}>
            {step === 'choose' ? 'Choose an account' : 'Continue to Ripple'}
          </h1>
          <p style={{ fontSize: '15px', color: '#c4c7c5', lineHeight: 1.5, margin: 0 }}>
            {step === 'choose'
              ? 'to continue to Ripple Code Intelligence platform with any Google account'
              : `Allow Ripple to view your email address and profile info for ${selectedAccount}`}
          </p>
        </div>

        {/* Right Column: Accounts List or Confirmation */}
        <div style={{ width: 400, background: '#1e1f20', borderRadius: '24px', padding: '24px', border: '1px solid #333537' }}>
          {step === 'choose' ? (
            <div>
              {/* Manual Email Input for ANY email */}
              <form onSubmit={handleManualEmailSubmit} style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#c4c7c5', marginBottom: 8 }}>
                  Sign in with any email
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    placeholder="Enter any email address..."
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #444746',
                      background: '#131314',
                      color: '#ffffff',
                      fontSize: '13.5px',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!emailInput.trim()}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      background: '#a8c7fa',
                      color: '#062e6f',
                      fontWeight: 700,
                      border: 'none',
                      cursor: emailInput.trim() ? 'pointer' : 'not-allowed',
                      fontSize: '13px',
                    }}
                  >
                    Next
                  </button>
                </div>
              </form>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 12px' }}>
                <div style={{ flex: 1, height: 1, background: '#333537' }} />
                <span style={{ fontSize: '11px', color: '#8e918f', textTransform: 'uppercase', letterSpacing: '0.05em' }}>or choose account</span>
                <div style={{ flex: 1, height: 1, background: '#333537' }} />
              </div>

              {/* Accounts list */}
              {accounts.map((acc, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectAccount(acc.email)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    marginBottom: 6,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#2a2b2e')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: acc.color,
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 700,
                      }}
                    >
                      {acc.avatar}
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 500, color: '#e3e3e3' }}>{acc.name}</div>
                      <div style={{ fontSize: '12px', color: '#c4c7c5' }}>{acc.email}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: '#8e918f' }}>Continue →</span>
                </div>
              ))}
            </div>
          ) : (
            /* Confirm Screen */
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottom: '1px solid #333537', marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#a8c7fa', color: '#062e6f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
                  {(selectedAccount?.[0] || 'U').toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#e3e3e3' }}>{selectedAccount}</div>
                  <div style={{ fontSize: '12px', color: '#a8c7fa', cursor: 'pointer' }} onClick={() => setStep('choose')}>
                    Switch account
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '13.5px', color: '#c4c7c5', lineHeight: 1.6, marginBottom: 24 }}>
                By continuing, Google will share your name, email address, and profile picture with <strong>Ripple</strong>.
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setStep('choose')}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '20px',
                    background: 'transparent',
                    border: '1px solid #444746',
                    color: '#a8c7fa',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAccess}
                  disabled={loading}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '20px',
                    background: '#a8c7fa',
                    color: '#062e6f',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {loading ? 'Continuing...' : 'Continue'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#8e918f', borderTop: '1px solid #2a2b2e', paddingTop: 20 }}>
        <div>English (United States)</div>
        <div style={{ display: 'flex', gap: 24 }}>
          <span>Help</span>
          <span>Privacy</span>
          <span>Terms</span>
        </div>
      </div>
    </div>
  );
}
