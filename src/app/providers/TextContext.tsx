'use client'

import React, { createContext, useContext, useState, useEffect } from 'react';

interface TextContextType {
  inputText: string;
  setInputText: (text: string) => void;
}

const TextContext = createContext<TextContextType | undefined>(undefined);

export function TextProvider({ children }: { children: React.ReactNode }) {
  const [inputText, setInputText] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('inputText') || '';
    }
    return '';
  });

  useEffect(() => {
    localStorage.setItem('inputText', inputText);
  }, [inputText]);

  return (
    <TextContext.Provider value={{ inputText, setInputText }}>
      {children}
    </TextContext.Provider>
  );
}

export function useText() {
  const context = useContext(TextContext);
  if (context === undefined) {
    throw new Error('useText must be used within a TextProvider');
  }
  return context;
}

