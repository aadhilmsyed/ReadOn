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

interface MyStoryRow {
  story_id: string;
  title: string;
  source_text: string;
  phonics_status: string;
  comprehension_status: string;
  visualization_status: string;
  audiobook_status: string;
  created_at: string;
}

const CARD_MIN_HEIGHT = '260px';
const STORIES_PAGE_SIZE = 3;

function relativeTimeFromNow(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const deltaSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (deltaSec < 60) return `${deltaSec}s ago`;
  const deltaMin = Math.floor(deltaSec / 60);
  if (deltaMin < 60) return `${deltaMin}m ago`;
  const deltaHr = Math.floor(deltaMin / 60);
  if (deltaHr < 24) return `${deltaHr}h ago`;
  const deltaDay = Math.floor(deltaHr / 24);
  return `${deltaDay}d ago`;
}

function storyPreview(text: string, maxChars = 180): string {
  const compact = (text || '').replace(/\s+/g, ' ').trim();
  if (!compact) return 'No preview available.';
  if (compact.length <= maxChars) return compact;
  return `${compact.slice(0, maxChars).trimEnd()}...`;
}

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const { isReady, session } = useSession();

  const [myStories, setMyStories] = useState<MyStoryRow[]>([]);
  const [visibleStoryCount, setVisibleStoryCount] = useState(STORIES_PAGE_SIZE);
  const [loadingStories, setLoadingStories] = useState(true);
  const [storiesError, setStoriesError] = useState<string | null>(null);

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
    setLoadingStories(true);
    setStoriesError(null);
    (async () => {
      try {
        const res = await fetch('/api/dashboard/my-stories?limit=50', { cache: 'no-store', credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { stories?: MyStoryRow[] };
        if (!cancelled) setMyStories(body.stories ?? []);
      } catch (err) {
        if (!cancelled) setStoriesError((err as Error).message);
      } finally {
        if (!cancelled) setLoadingStories(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isReady, session]);

  useEffect(() => {
    setVisibleStoryCount(STORIES_PAGE_SIZE);
  }, [myStories.length]);

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

        <Box
          bg="white"
          borderRadius="xl"
          borderWidth="1px"
          borderColor="gray.200"
          p={6}
          shadow="sm"
          minH={CARD_MIN_HEIGHT}
        >
          <Heading as="h2" size="md" color="blue.600" mb={3}>
            Your recent stories
          </Heading>
          {loadingStories && (
            <HStack color="gray.500"><Spinner size="sm" /><Text fontSize="sm">Loading...</Text></HStack>
          )}
          {!loadingStories && storiesError && (
            <Text fontSize="sm" color="red.500">Failed to load stories: {storiesError}</Text>
          )}
          {!loadingStories && !storiesError && myStories.length === 0 && (
            <VStack align="stretch" spacing={4} maxW="560px">
              <Text fontSize="sm" color="gray.500">You don&apos;t have any stories in your history.</Text>
              <Button colorScheme="blue" variant="outline" alignSelf="flex-start" onClick={() => router.push('/')}>
                Create a Story
              </Button>
            </VStack>
          )}
          {!loadingStories && !storiesError && myStories.length > 0 && (
            <VStack align="stretch" spacing={3}>
              {Array.from({ length: visibleStoryCount }, (_, idx) => myStories[idx] ?? null).map((story, idx, arr) => (
                <Box key={story?.story_id ?? `empty-slot-${idx}`} px={1}>
                  {story ? (
                    <Box as={NextLink} href={`/features/${encodeURIComponent(story.story_id)}`} display="block" _hover={{ textDecoration: 'none' }}>
                      <HStack justify="space-between" align="baseline" spacing={3}>
                        <Text fontSize="md" color="black" fontWeight="bold" noOfLines={1}>
                          {story.title}
                        </Text>
                        <Text fontSize="xs" color="gray.500" whiteSpace="nowrap" flexShrink={0}>
                          {relativeTimeFromNow(story.created_at)}
                        </Text>
                      </HStack>
                      <Text fontSize="sm" color="gray.700" mt={1} noOfLines={2}>
                        {storyPreview(story.source_text)}
                      </Text>
                    </Box>
                  ) : (
                    <Box py={2} minH="68px" />
                  )}
                  {idx < arr.length - 1 ? (
                    <Box mt={3} mx={1} borderBottomWidth="1px" borderColor="gray.200" />
                  ) : null}
                </Box>
              ))}
              {visibleStoryCount < myStories.length ? (
                <Button
                  variant="outline"
                  colorScheme="blue"
                  alignSelf="flex-start"
                  onClick={() => setVisibleStoryCount((count) => Math.min(count + STORIES_PAGE_SIZE, myStories.length))}
                >
                  View More Previous Stories
                </Button>
              ) : null}
            </VStack>
          )}
        </Box>
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

