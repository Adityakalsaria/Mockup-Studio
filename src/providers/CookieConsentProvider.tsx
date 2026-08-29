"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getConsent,
  setConsent as persistConsent,
  clearConsent,
  type ConsentValue,
} from "@/lib/cookieConsent";

interface CookieConsentCtx {
  consent: ConsentValue | null;
  setConsent: (value: ConsentValue) => void;
  showBanner: boolean;
  requestShowBanner: () => void;
}

const CookieConsentContext = createContext<CookieConsentCtx>({
  consent: null,
  setConsent: () => {},
  showBanner: false,
  requestShowBanner: () => {},
});

export function useCookieConsent() {
  return useContext(CookieConsentContext);
}

export default function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsentState] = useState<ConsentValue | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Read localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    const stored = getConsent();
    setConsentState(stored);
    setShowBanner(stored === null);
    setHydrated(true);
  }, []);

  const setConsent = useCallback((value: ConsentValue) => {
    persistConsent(value);
    setConsentState(value);
    setShowBanner(false);
  }, []);

  const requestShowBanner = useCallback(() => {
    clearConsent();
    setConsentState(null);
    setShowBanner(true);
  }, []);

  return (
    <CookieConsentContext.Provider
      value={{
        consent,
        setConsent,
        showBanner: hydrated && showBanner,
        requestShowBanner,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}
