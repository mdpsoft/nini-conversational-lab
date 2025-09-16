import { useState, useEffect } from 'react';

const GUEST_MODE_KEY = 'guest_mode';

export function useGuestMode() {
  const [guestMode, setGuestModeState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(GUEST_MODE_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  });

  const setGuestMode = (enabled: boolean) => {
    try {
      localStorage.setItem(GUEST_MODE_KEY, enabled.toString());
      setGuestModeState(enabled);
    } catch {
      console.warn('Failed to save guest mode preference');
    }
  };

  const toggleGuestMode = () => {
    setGuestMode(!guestMode);
  };

  return {
    guestMode,
    setGuestMode,
    toggleGuestMode,
  };
}

export function isGuestModeEnabled(): boolean {
  try {
    return localStorage.getItem(GUEST_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}