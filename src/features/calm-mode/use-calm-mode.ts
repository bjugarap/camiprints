"use client";

import { useCallback, useSyncExternalStore } from "react";

import { CALM_MODE_STORAGE_KEY } from "./calm-mode-script";

/**
 * Calm Mode is carried as a `data-calm` attribute on <html>, persisted per
 * device. Layout differences are expressed in CSS through the `calm:` and
 * `not-calm:` variants wherever possible; this hook exists for controls that
 * need the state itself (the header toggle).
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-calm"],
  });
  return () => observer.disconnect();
}

const getSnapshot = () => document.documentElement.hasAttribute("data-calm");
const getServerSnapshot = () => false;

export function useCalmMode() {
  const calm = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setCalm = useCallback((on: boolean) => {
    document.documentElement.toggleAttribute("data-calm", on);
    try {
      localStorage.setItem(CALM_MODE_STORAGE_KEY, on ? "1" : "0");
    } catch {
      // Persistence is best-effort; the attribute still applies this session.
    }
  }, []);

  const toggle = useCallback(() => {
    setCalm(!document.documentElement.hasAttribute("data-calm"));
  }, [setCalm]);

  return { calm, setCalm, toggle };
}
