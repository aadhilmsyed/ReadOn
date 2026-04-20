'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';

import { AppShell } from '@views/components/AppShell';
import { useSession } from '@views/providers/SessionProvider';

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { session, isReady, refreshSession } = useSession();

  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirm, setSignUpConfirm] = useState('');

  const [notFoundOpen, setNotFoundOpen] = useState(false);
  const [existsOpen, setExistsOpen] = useState(false);

  useEffect(() => {
    if (isReady && session) {
      const next = searchParams.get('next');
      router.replace(next && next.startsWith('/') ? next : '/');
    }
  }, [isReady, router, searchParams, session]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: signInEmail, password: signInPassword }),
      });
      const data = await res.json();
      if (res.status === 404 && data.code === 'USER_NOT_FOUND') {
        setNotFoundOpen(true);
        return;
      }
      if (!res.ok) {
        toast({ status: 'error', title: data.message || 'Sign-in failed', duration: 4000, isClosable: true });
        return;
      }
      await refreshSession();
      const next = searchParams.get('next');
      router.replace(next && next.startsWith('/') ? next : '/');
      toast({ status: 'success', title: `Welcome back, ${data.user?.name || ''}` });
    } catch (err) {
      toast({ status: 'error', title: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: signUpName,
          email: signUpEmail,
          password: signUpPassword,
          confirmPassword: signUpConfirm,
        }),
      });
      const data = await res.json();
      if (res.status === 409 && data.code === 'USER_EXISTS') {
        setExistsOpen(true);
        return;
      }
      if (!res.ok) {
        toast({ status: 'error', title: data.message || 'Sign-up failed', duration: 4000, isClosable: true });
        return;
      }
      toast({ status: 'success', title: 'Account created', description: 'Sign in with your new password.', duration: 5000 });
      setTabIndex(0);
      setSignInEmail(signUpEmail);
    } catch (err) {
      toast({ status: 'error', title: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  if (!isReady) {
    return (
      <AppShell>
        <Text textAlign="center" py={20}>
          Loading…
        </Text>
      </AppShell>
    );
  }

  if (session) {
    return null;
  }

  return (
    <AppShell>
      <Box maxW="md" mx="auto" py={10} px={4}>
        <VStack spacing={8} align="stretch">
          <Heading as="h1" size="xl" textAlign="center" bgGradient="linear(to-r, blue.400, purple.500)" bgClip="text">
            Sign in to Read On
          </Heading>
          <Text textAlign="center" color="gray.600">
            Access learning features, your dashboard, and saved work.
          </Text>

          <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200" p={{ base: 6, md: 8 }} shadow="md">
            <Tabs index={tabIndex} onChange={setTabIndex} colorScheme="blue" variant="enclosed" isFitted>
              <TabList mb={6}>
                <Tab fontWeight="semibold">Sign In</Tab>
                <Tab fontWeight="semibold">Sign Up</Tab>
              </TabList>
              <TabPanels>
                <TabPanel px={0}>
                  <form onSubmit={handleSignIn}>
                    <VStack spacing={4} align="stretch">
                      <FormControl isRequired>
                        <FormLabel>Email</FormLabel>
                        <Input
                          type="email"
                          autoComplete="email"
                          value={signInEmail}
                          onChange={(ev) => setSignInEmail(ev.target.value)}
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel>Password</FormLabel>
                        <Input
                          type="password"
                          autoComplete="current-password"
                          value={signInPassword}
                          onChange={(ev) => setSignInPassword(ev.target.value)}
                        />
                      </FormControl>
                      <Button type="submit" colorScheme="blue" size="lg" isLoading={loading}>
                        Sign In
                      </Button>
                    </VStack>
                  </form>
                </TabPanel>
                <TabPanel px={0}>
                  <form onSubmit={handleSignUp}>
                    <VStack spacing={4} align="stretch">
                      <FormControl isRequired>
                        <FormLabel>Full name</FormLabel>
                        <Input value={signUpName} onChange={(ev) => setSignUpName(ev.target.value)} />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel>Email</FormLabel>
                        <Input
                          type="email"
                          autoComplete="email"
                          value={signUpEmail}
                          onChange={(ev) => setSignUpEmail(ev.target.value)}
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel>Password</FormLabel>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          value={signUpPassword}
                          onChange={(ev) => setSignUpPassword(ev.target.value)}
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel>Confirm password</FormLabel>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          value={signUpConfirm}
                          onChange={(ev) => setSignUpConfirm(ev.target.value)}
                        />
                      </FormControl>
                      <Button type="submit" colorScheme="purple" size="lg" isLoading={loading}>
                        Create account
                      </Button>
                    </VStack>
                  </form>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>
        </VStack>
      </Box>

      <Modal isOpen={notFoundOpen} onClose={() => setNotFoundOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>No account yet</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <AlertDescription>We couldn&apos;t find a user with that email. Create an account on the Sign Up tab.</AlertDescription>
            </Alert>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={() => {
                setNotFoundOpen(false);
                setTabIndex(1);
              }}
            >
              Go to Sign Up
            </Button>
            <Button variant="ghost" onClick={() => setNotFoundOpen(false)}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={existsOpen} onClose={() => setExistsOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Account already exists</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              <AlertDescription>An account with this email already exists. Sign in instead.</AlertDescription>
            </Alert>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={() => {
                setExistsOpen(false);
                setTabIndex(0);
              }}
            >
              Go to Sign In
            </Button>
            <Button variant="ghost" onClick={() => setExistsOpen(false)}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </AppShell>
  );
}
