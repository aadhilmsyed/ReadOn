'use client';

import { useEffect, useState } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Grid,
  GridItem,
  Heading,
  HStack,
  Link as ChakraLink,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  SimpleGrid,
  Spinner,
  Stat,
  StatLabel,
  StatNumber,
  Text,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react';

import { AppShell } from '@views/components/AppShell';
import { useSession } from '@views/providers/SessionProvider';
import type { FeatureKey } from '@shared/types/features';
import type { AggregatedHistory, FeatureHistorySlice } from '@orchestrators/dashboard/composition/types';

const FEATURE_CARDS: ReadonlyArray<{ key: FeatureKey; title: string }> = [
  { key: 'phonics',       title: 'Phonics History'        },
  { key: 'comprehension', title: 'Comprehension History'  },
  { key: 'visualization', title: 'Visualization History'  },
  { key: 'audiobook',     title: 'Audiobook History'      },
];

const CARD_MIN_HEIGHT = '260px';

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const { isReady, session } = useSession();

  const [history, setHistory] = useState<AggregatedHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [balance, setBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const rechargeDialog = useDisclosure();
  const [dollars, setDollars] = useState<number>(1);
  const [recharging, setRecharging] = useState(false);

  useEffect(() => {
    if (isReady && !session) router.replace('/auth');
  }, [isReady, router, session]);

  useEffect(() => {
    if (!isReady || !session) return;
    let cancelled = false;
    setLoadingHistory(true);
    setHistoryError(null);
    (async () => {
      try {
        const res = await fetch('/api/dashboard/history?limit=5', { cache: 'no-store', credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const agg = (await res.json()) as AggregatedHistory;
        if (!cancelled) setHistory(agg);
      } catch (err) {
        if (!cancelled) setHistoryError((err as Error).message);
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isReady, session]);

  useEffect(() => {
    if (!isReady || !session) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/credits/${encodeURIComponent(session.user.email)}`, {
          cache: 'no-store',
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        if (!cancelled) { setBalance(body.balance); setBalanceError(null); }
      } catch (err) {
        if (!cancelled) setBalanceError((err as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [isReady, session]);

  async function handleRecharge() {
    if (!session) return;
    if (!Number.isInteger(dollars) || dollars <= 0 || dollars > 1000) {
      toast({ status: 'error', title: 'Enter a whole dollar amount between 1 and 1000', duration: 3000, isClosable: true });
      return;
    }
    setRecharging(true);
    try {
      const res = await fetch(`/api/dashboard/credits/${encodeURIComponent(session.user.email)}/recharge`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ dollars }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast({ status: 'error', title: 'Recharge failed', description: body.error || body.message, duration: 4000, isClosable: true });
        return;
      }
      setBalance(body.balance);
      rechargeDialog.onClose();
      toast({ status: 'success', title: `Recharged $${dollars}`, description: `+${body.credits} credits — new balance ${body.balance}`, duration: 4000, isClosable: true });
    } catch (err) {
      toast({ status: 'error', title: 'Network error', description: (err as Error).message, duration: 4000, isClosable: true });
    } finally {
      setRecharging(false);
    }
  }

  if (!isReady) {
    return (
      <AppShell>
        <VStack py={20} spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text color="gray.600">Checking session state...</Text>
        </VStack>
      </AppShell>
    );
  }
  if (!session) return null;

  return (
    <AppShell>
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between" flexWrap="wrap" gap={4}>
          <Box>
            <Heading as="h1" size="lg" color="blue.600">Welcome back, {session.user.name}</Heading>
            <Text color="gray.600">Signed in securely. Credits and history load from your account.</Text>
          </Box>
          <Button colorScheme="purple" variant="outline" onClick={() => router.push('/')}>
            New Reading
          </Button>
        </HStack>

        <Grid templateColumns={{ base: '1fr', md: '1fr 2fr' }} gap={6}>
          <GridItem>
            <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200" p={6} shadow="sm" minH={CARD_MIN_HEIGHT}>
              <VStack align="stretch" spacing={3}>
                <Heading as="h2" size="md" color="blue.600">Profile Card</Heading>
                <Text fontWeight="semibold">{session.user.name}</Text>
                <Text color="gray.600">{session.user.email}</Text>
                <Text color="gray.600" lineHeight="tall">
                  Build daily confidence across pronunciation, comprehension, and listening.
                </Text>
              </VStack>
            </Box>
          </GridItem>

          <GridItem>
            <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200" p={6} shadow="sm" minH={CARD_MIN_HEIGHT} display="flex" flexDirection="column">
              <Heading as="h2" size="md" color="blue.600" mb={3}>Credit</Heading>
              {balance === null && !balanceError && (
                <HStack color="gray.500"><Spinner size="sm" /><Text fontSize="sm">Loading...</Text></HStack>
              )}
              {balanceError && (
                <Text fontSize="sm" color="red.500">Failed to load balance: {balanceError}</Text>
              )}
              {balance !== null && (
                <HStack spacing={6} align="center" mt={2}>
                  <Stat>
                    <StatLabel color="gray.500">Balance</StatLabel>
                    <StatNumber color="blue.700">{balance} credits</StatNumber>
                  </Stat>
                  <Button colorScheme="blue" onClick={rechargeDialog.onOpen}>Recharge</Button>
                </HStack>
              )}
              <Text fontSize="xs" color="gray.400" mt="auto" pt={4}>Mock charge — no real payment processed.</Text>
            </Box>
          </GridItem>
        </Grid>

        <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={6}>
          {FEATURE_CARDS.map((card) => (
            <HistoryCard
              key={card.key}
              title={card.title}
              feature={card.key}
              loading={loadingHistory}
              slice={history?.[card.key]}
              globalError={historyError}
            />
          ))}
        </SimpleGrid>
      </VStack>

      <Modal isOpen={rechargeDialog.isOpen} onClose={rechargeDialog.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Recharge Credits</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3} align="stretch">
              <Text fontSize="sm" color="gray.600">$1 = 100 credits. Enter the dollar amount (whole dollars, $1–$1000).</Text>
              <NumberInput
                value={dollars}
                onChange={(_, n) => setDollars(Number.isFinite(n) ? n : 0)}
                min={1}
                max={1000}
                step={1}
                precision={0}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <Text fontSize="sm" color="gray.600">
                You&apos;ll get <Text as="span" fontWeight="semibold">{Math.max(0, dollars) * 100}</Text> credits.
              </Text>
              <Text fontSize="xs" color="gray.400">Mock charge — no real payment processed.</Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={rechargeDialog.onClose} isDisabled={recharging}>Cancel</Button>
            <Button colorScheme="blue" onClick={handleRecharge} isLoading={recharging} loadingText="Charging">
              Recharge ${Math.max(0, dollars)}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </AppShell>
  );
}

interface HistoryCardProps {
  title: string;
  feature: FeatureKey;
  loading: boolean;
  slice: FeatureHistorySlice | undefined;
  globalError: string | null;
}

function HistoryCard({ title, feature, loading, slice, globalError }: HistoryCardProps) {
  return (
    <Box
      bg="white"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="gray.200"
      p={6}
      shadow="sm"
      minH={CARD_MIN_HEIGHT}
      display="flex"
      flexDirection="column"
    >
      <Heading as="h2" size="md" color="blue.600" mb={3}>{title}</Heading>
      {loading && (
        <HStack color="gray.500"><Spinner size="sm" /><Text fontSize="sm">Loading...</Text></HStack>
      )}
      {!loading && globalError && (
        <Text fontSize="sm" color="red.500">Failed to load: {globalError}</Text>
      )}
      {!loading && !globalError && slice?.error && (
        <Text fontSize="sm" color="orange.500">Service unavailable</Text>
      )}
      {!loading && !globalError && !slice?.error && slice && slice.items.length === 0 && (
        <Text fontSize="sm" color="gray.500">No entries yet.</Text>
      )}
      {!loading && !globalError && !slice?.error && slice && slice.items.length > 0 && (
        <VStack align="stretch" spacing={2}>
          {slice.items.map((item) => (
            <ChakraLink
              key={item.story_id}
              as={NextLink}
              href={`/?storyId=${encodeURIComponent(item.story_id)}&service=${feature}`}
              color="blue.500"
              _hover={{ textDecoration: 'underline' }}
              noOfLines={1}
              title={item.title}
            >
              {item.title}
            </ChakraLink>
          ))}
        </VStack>
      )}
    </Box>
  );
}
