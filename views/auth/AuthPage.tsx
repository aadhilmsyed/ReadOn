'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  SimpleGrid,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';

import type { AuthMode } from '@orchestrators/auth/authSessionOrchestrator';
import { AppShell } from '@views/components/AppShell';
import { useSession } from '@views/providers/SessionProvider';

function AuthForm({
  mode,
  onSubmit,
  isLoading,
}: {
  mode: AuthMode;
  onSubmit: (payload: { name: string; email: string }) => Promise<void>;
  isLoading: boolean;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  return (
    <VStack
      as="form"
      spacing={4}
      align="stretch"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit({ name, email });
      }}
    >
      <FormControl>
        <FormLabel>Name</FormLabel>
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter your name" />
      </FormControl>
      <FormControl isRequired>
        <FormLabel>Email</FormLabel>
        <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
      </FormControl>
      <Button type="submit" colorScheme="blue" isLoading={isLoading}>
        {mode === 'sign-in' ? 'Mock Sign In' : 'Mock Sign Up'}
      </Button>
    </VStack>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const toast = useToast();
  const { authenticate, session } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (mode: AuthMode, payload: { name: string; email: string }) => {
    setIsLoading(true);

    try {
      await authenticate(mode, payload);
      toast({
        title: 'Mock session created',
        description: 'A client-side session token was stored for dashboard access.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      router.push('/dashboard');
    } catch (error) {
      toast({
        title: 'Unable to continue',
        description: error instanceof Error ? error.message : 'Mock authentication failed.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell>
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8} alignItems="start">
        <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200" p={8} shadow="md">
          <VStack align="stretch" spacing={5}>
            <Heading as="h1" size="lg" color="blue.600">
              Account Access
            </Heading>
            <Text color="gray.600" lineHeight="tall">
              This page preserves the future sign-in and sign-up flow without connecting to a real identity provider.
              Successful actions create a mock client-side session token so the dashboard flow remains usable.
            </Text>
            <Alert status="info" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>Mock session strategy</AlertTitle>
                <AlertDescription>
                  Session data is stored locally in the browser and can be replaced later with a production-ready strategy.
                </AlertDescription>
              </Box>
            </Alert>
            {session ? (
              <Alert status="success" borderRadius="lg">
                <AlertIcon />
                <Box>
                  <AlertTitle>Session already active</AlertTitle>
                  <AlertDescription>
                    Current demo session: {session.user.email}
                  </AlertDescription>
                </Box>
              </Alert>
            ) : null}
          </VStack>
        </Box>

        <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200" p={8} shadow="md">
          <Tabs colorScheme="blue" isFitted variant="enclosed">
            <TabList mb={6}>
              <Tab>Sign In</Tab>
              <Tab>Sign Up</Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                <AuthForm mode="sign-in" isLoading={isLoading} onSubmit={(payload) => handleAuth('sign-in', payload)} />
              </TabPanel>
              <TabPanel px={0}>
                <AuthForm mode="sign-up" isLoading={isLoading} onSubmit={(payload) => handleAuth('sign-up', payload)} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </SimpleGrid>
    </AppShell>
  );
}
