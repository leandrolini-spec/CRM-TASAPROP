"use client";

import { createContext, useContext } from "react";

const FirmaContext = createContext<string | null>(null);

export function FirmaProvider({
  firma,
  children,
}: {
  firma: string | null;
  children: React.ReactNode;
}) {
  return <FirmaContext.Provider value={firma}>{children}</FirmaContext.Provider>;
}

export function useFirma() {
  return useContext(FirmaContext);
}
