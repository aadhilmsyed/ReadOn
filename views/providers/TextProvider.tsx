'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

interface TextContextValue {
  inputText: string;
  setInputText: (value: string) => void;
}

const TextContext = createContext<TextContextValue | undefined>(undefined);
const INPUT_STORAGE_KEY = 'readon.client.input';

export function TextProvider({ children }: { children: React.ReactNode }) {
  const [inputText, setInputText] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const savedValue = window.localStorage.getItem(INPUT_STORAGE_KEY) ?? '';
    setInputText(savedValue);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(INPUT_STORAGE_KEY, inputText);
  }, [hydrated, inputText]);

  const value = useMemo(() => ({ inputText, setInputText }), [inputText]);

  return <TextContext.Provider value={value}>{children}</TextContext.Provider>;
}

export function useText() {
  const context = useContext(TextContext);

  if (!context) {
    throw new Error('useText must be used within TextProvider.');
  }

  return context;
}
