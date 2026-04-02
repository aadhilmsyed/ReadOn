'use client';

import { ChakraProvider } from '@chakra-ui/react';

import { SessionProvider } from './SessionProvider';
import { TextProvider } from './TextProvider';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider>
      <SessionProvider>
        <TextProvider>{children}</TextProvider>
      </SessionProvider>
    </ChakraProvider>
  );
}
