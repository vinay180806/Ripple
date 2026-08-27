'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <nav className="navbar" style={{ boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.4)' : 'none' }}>
      <div className="container flex items-center justify-between">
        <Link href="/" className="nav-logo">
          <div className="nav-logo-icon">〜</div>
          <span>Ripple</span>
        </Link>

        <ul className="nav-links">
          <li><Link href="/" className="nav-link">Home</Link></li>
          <li><Link href="/dashboard" className="nav-link">Dashboard</Link></li>
          <li><Link href="/chat" className="nav-link">Q&amp;A</Link></li>
          <li><Link href="/impact" className="nav-link">Impact Report</Link></li>
          <li><Link href="/graph" className="nav-link">Dep Graph</Link></li>
        </ul>

        <div className="flex items-center gap-4">
          <Link href="/login" className="btn btn-secondary btn-sm">Log in</Link>
          <Link href="/signup" className="btn btn-primary btn-sm">Get Started</Link>
        </div>
      </div>
    </nav>
  );
}
