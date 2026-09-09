'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'ripple_active_repo';
const CHANGE_EVENT = 'ripple_repo_changed';

export function getStoredActiveRepo(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_KEY) || 'api-gateway';
  }
  return 'api-gateway';
}

export function setStoredActiveRepo(key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, key);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key }));
  }
}

export function useActiveRepo(): [string, (key: string) => void] {
  const [activeRepo, setActiveRepoState] = useState<string>('api-gateway');

  useEffect(() => {
    // Initial read
    const current = getStoredActiveRepo();
    setActiveRepoState(current);

    // Event listener for cross-component sync
    const handleRepoChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setActiveRepoState(customEvent.detail);
      }
    };

    window.addEventListener(CHANGE_EVENT, handleRepoChange);
    return () => window.removeEventListener(CHANGE_EVENT, handleRepoChange);
  }, []);

  const setActiveRepo = useCallback((key: string) => {
    setActiveRepoState(key);
    setStoredActiveRepo(key);
  }, []);

  return [activeRepo, setActiveRepo];
}
