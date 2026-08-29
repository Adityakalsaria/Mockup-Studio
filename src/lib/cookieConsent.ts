const STORAGE_KEY = "kosh-cookie-consent";

export type ConsentValue = "accepted" | "rejected";

export function getConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(STORAGE_KEY);
  if (value === "accepted" || value === "rejected") return value;
  return null;
}

export function setConsent(value: ConsentValue): void {
  localStorage.setItem(STORAGE_KEY, value);
}

export function clearConsent(): void {
  localStorage.removeItem(STORAGE_KEY);
}
