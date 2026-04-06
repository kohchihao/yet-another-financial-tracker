'use client';

import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'privacy-mode';
const CHANGE_EVENT = 'privacy-mode-change';

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', callback); // sync across tabs
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

function getServerSnapshot() {
  return false;
}

interface PrivacyContextValue {
  isPrivate: boolean;
  togglePrivacy: () => void;
}

const PrivacyContext = createContext<PrivacyContextValue>({
  isPrivate: false,
  togglePrivacy: () => {},
});

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const isPrivate = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const togglePrivacy = useCallback(() => {
    const next = !(localStorage.getItem(STORAGE_KEY) === 'true');
    localStorage.setItem(STORAGE_KEY, String(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return (
    <PrivacyContext.Provider value={{ isPrivate, togglePrivacy }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}
