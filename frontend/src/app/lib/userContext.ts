'use client';

import { useState, useEffect } from 'react';
import { ApiClient, type UserProfileData } from './api';

const AUTH_EVENT = 'ripple_auth_changed';
const PROFILE_EVENT = 'ripple_profile_updated';

// Module-level cache — single fetch per browser session across all components
let _cachedUser: UserProfileData | null = null;
let _fetchInFlight: Promise<UserProfileData | null> | null = null;
let _lastFetchMs = 0;
const REFETCH_INTERVAL_MS = 5 * 60 * 1000; // Re-validate at most every 5 minutes

async function fetchCurrentUser(): Promise<UserProfileData | null> {
  const token = ApiClient.getToken();
  if (!token) return null;

  const now = Date.now();
  // Return cache if fresh
  if (_cachedUser && now - _lastFetchMs < REFETCH_INTERVAL_MS) {
    return _cachedUser;
  }
  // Deduplicate concurrent calls
  if (_fetchInFlight) return _fetchInFlight;

  _fetchInFlight = ApiClient.getMe()
    .then((profile) => {
      _cachedUser = profile;
      _lastFetchMs = Date.now();
      ApiClient.setStoredUser(profile);
      return profile;
    })
    .catch(() => {
      // Keep stale cache on transient error
      return _cachedUser;
    })
    .finally(() => {
      _fetchInFlight = null;
    });

  return _fetchInFlight;
}

/** Call this after login/logout to flush the cache and notify all subscribers */
export function invalidateUserCache(): void {
  _cachedUser = null;
  _lastFetchMs = 0;
  _fetchInFlight = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
}

/**
 * Hook for any component that needs the current user profile.
 * Uses a shared module-level cache so only one /auth/me call is made
 * across Navbar, Sidebar, and any other subscriber.
 */
export function useCurrentUser(): UserProfileData | null {
  // Always null on first render (server and client match — no hydration mismatch)
  const [user, setUser] = useState<UserProfileData | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Seed immediately from localStorage to minimise avatar flicker
    const stored = ApiClient.getStoredUser();
    if (stored && !cancelled) setUser(stored);

    const load = async () => {
      const profile = await fetchCurrentUser();
      if (!cancelled) setUser(profile);
    };

    load();

    const handleAuthChange = () => {
      // Flush cache on explicit auth events (login/logout)
      _cachedUser = null;
      _lastFetchMs = 0;
      _fetchInFlight = null;
      load();
    };

    window.addEventListener(AUTH_EVENT, handleAuthChange);
    window.addEventListener(PROFILE_EVENT, handleAuthChange);
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_EVENT, handleAuthChange);
      window.removeEventListener(PROFILE_EVENT, handleAuthChange);
    };
  }, []);

  return user;
}
