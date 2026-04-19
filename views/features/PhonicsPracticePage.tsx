'use client';

import { keyframes } from '@emotion/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { FaVolumeHigh } from 'react-icons/fa6';
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  IconButton,
  Text,
  Tooltip,
  VStack,
} from '@chakra-ui/react';

import {
  PHONICS_SESSION_HOME_FLASH_ERROR_KEY,
  PHONICS_SESSION_STORY_TEXT_KEY,
} from '@shared/constants/phonicsClient';
import type { WordTypeTag } from '@phonics/types';

type Flash = {
  wordId: number;
  word: string;
  meaning: string;
  breakdown: string | null;
  audioUrl: string | null;
  displayOrder: number;
  wordType: WordTypeTag;
};

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

function formatPartOfSpeech(wt: WordTypeTag): string | null {
  if (wt === 'unknown') return null;
  const map: Record<Exclude<WordTypeTag, 'unknown'>, string> = {
    noun: '(noun)',
    verb: '(verb)',
    adjective: '(adjective)',
    adverb: '(adverb)',
    acronym: '(acronym)',
  };
  return wt in map ? map[wt as Exclude<WordTypeTag, 'unknown'>] : null;
}

export function PhonicsPracticePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cards, setCards] = useState<Flash[]>([]);
  const [index, setIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const current = cards[index] ?? null;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [index]);

  useLayoutEffect(() => {
    const storyText = sessionStorage.getItem(PHONICS_SESSION_STORY_TEXT_KEY)?.trim();
    if (!storyText) {
      sessionStorage.setItem(
        PHONICS_SESSION_HOME_FLASH_ERROR_KEY,
        'No input text could be found.',
      );
      router.replace('/');
      return;
    }

    let cancelled = false;

    async function run() {
      setPhase('loading');
      setErrorMessage(null);
      try {
        const res = await fetch('/api/phonics/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ storyText }),
        });
        const json = (await res.json()) as {
          success?: boolean;
          data?: Flash[];
          detail?: string;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || json.success === false) {
          setErrorMessage(json.detail || json.error || `Request failed (${res.status})`);
          setPhase('error');
          setCards([]);
          return;
        }
        const list = json.data ?? [];
        setCards(list);
        setIndex(0);
        setPhase('ready');
      } catch (e) {
        if (cancelled) return;
        setErrorMessage(e instanceof Error ? e.message : String(e));
        setPhase('error');
        setCards([]);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const playAudio = useCallback(() => {
    if (!current?.audioUrl) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const a = new Audio(current.audioUrl);
    audioRef.current = a;
    void a.play();
  }, [current]);

  const posLabel = useMemo(
    () => (current ? formatPartOfSpeech(current.wordType) : null),
    [current],
  );

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + cards.length) % cards.length);
  }, [cards.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % cards.length);
  }, [cards.length]);

  if (phase === 'idle') {
    return null;
  }

  if (phase === 'loading') {
    return (
      <VStack spacing={8} align="center" justify="center" minH="50vh" py={16}>
        <Box
          w="72px"
          h="72px"
          borderRadius="full"
          borderWidth="4px"
          borderStyle="solid"
          borderColor="transparent"
          borderTopColor="blue.400"
          borderRightColor="purple.500"
          borderBottomColor="pink.400"
          borderLeftColor="blue.300"
          animation={`${spin} 0.9s linear infinite`}
        />
        <Text fontSize="lg" fontWeight="medium" color="gray.600">
          Loading Word Phonics...
        </Text>
      </VStack>
    );
  }

  if (phase === 'error') {
    return (
      <VStack spacing={8} align="center" maxW="lg" mx="auto" py={12}>
        <VStack spacing={3} textAlign="center">
          <Heading as="h2" size="lg" color="blue.600">
            Something went wrong
          </Heading>
          <Text color="gray.600" lineHeight="tall">
            {errorMessage ?? 'We could not load phonics for your story. Please try again from the home page.'}
          </Text>
        </VStack>
        <Button
          colorScheme="blue"
          size="lg"
          onClick={() => router.push('/')}
          bgGradient="linear(to-r, blue.400, purple.500)"
          _hover={{ bgGradient: 'linear(to-r, blue.500, purple.600)' }}
        >
          Back to home
        </Button>
      </VStack>
    );
  }

  return (
    <VStack spacing={10} align="stretch" maxW="900px" mx="auto">
      <VStack spacing={3} align="center" textAlign="center" pt={2}>
        <Heading
          as="h1"
          size="2xl"
          bgGradient="linear(to-r, blue.400, purple.500, pink.500)"
          bgClip="text"
          fontWeight="extrabold"
        >
          Read On
        </Heading>
        <Text fontSize="xl" color="gray.600" fontWeight="medium">
          Your AI-Powered Reading Companion
        </Text>
        <Heading as="h2" size="xl" color="blue.600" pt={2}>
          Phonics Practice
        </Heading>
        <Text fontSize="md" color="gray.600" maxW="2xl" lineHeight="tall">
          Practice pronunciation with interactive flashcards built from your story. Use the arrows to move
          between words, and tap the speaker when you want to hear how a word sounds.
        </Text>
      </VStack>

      {cards.length > 0 && current ? (
        <Flex
          w="100%"
          maxW={{ base: '100%', md: '860px', lg: '900px' }}
          mx="auto"
          align="center"
          justify="center"
          gap={{ base: 2, sm: 3, md: 4 }}
          px={{ base: 0, sm: 1 }}
          flexDir={{ base: 'column', md: 'row' }}
        >
          <IconButton
            display={{ base: 'none', md: 'inline-flex' }}
            aria-label="Previous card"
            icon={<FaChevronLeft />}
            onClick={goPrev}
            isRound
            flexShrink={0}
            size="lg"
            bgGradient="linear(to-br, blue.500, purple.600)"
            color="white"
            boxShadow="md"
            _hover={{
              bgGradient: 'linear(to-br, blue.600, purple.700)',
              boxShadow: 'lg',
              transform: 'translateY(-1px)',
            }}
            _active={{ transform: 'translateY(0)' }}
            transition="all 0.2s ease"
          />
          <Box
            bg="white"
            borderRadius="2xl"
            borderWidth="1px"
            borderColor="blue.100"
            boxShadow="0 4px 24px rgba(79, 70, 229, 0.07), 0 2px 8px rgba(15, 23, 42, 0.06)"
            px={{ base: 6, md: 10, lg: 12 }}
            py={{ base: 7, md: 9, lg: 10 }}
            w="100%"
            maxW={{ base: '92%', sm: '94%', md: '600px', lg: '650px' }}
            minH={{ base: '260px', md: '380px', lg: '400px' }}
            mx="auto"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <VStack spacing={4} align="center" textAlign="center" justify="center" w="100%">
              <Text
                as="span"
                display="block"
                fontSize={{ base: '3xl', md: '4xl' }}
                fontWeight="bold"
                lineHeight="shorter"
                bgGradient="linear(to-r, blue.500, purple.600)"
                bgClip="text"
                color="transparent"
              >
                {current.word}
              </Text>
              {posLabel && (
                <Text fontSize="md" color="gray.500" lineHeight="short">
                  {posLabel}
                </Text>
              )}
              {current.breakdown != null && current.breakdown !== '' && (
                <Text fontSize="lg" color="gray.700" fontWeight="medium" lineHeight="snug">
                  {current.breakdown}
                </Text>
              )}
              <Text
                fontSize="md"
                color="gray.500"
                fontStyle="italic"
                lineHeight="tall"
                maxW="md"
                mx="auto"
              >
                {current.meaning}
              </Text>
              <Box pt={1}>
                {current.audioUrl ? (
                  <IconButton
                    aria-label="Play pronunciation"
                    icon={<FaVolumeHigh />}
                    isRound
                    size="lg"
                    w="56px"
                    h="56px"
                    bgGradient="linear(to-br, blue.400, blue.600)"
                    color="white"
                    boxShadow="0 4px 14px rgba(59, 130, 246, 0.45)"
                    _hover={{
                      bgGradient: 'linear(to-br, blue.500, blue.700)',
                      boxShadow: '0 6px 20px rgba(59, 130, 246, 0.5)',
                      transform: 'translateY(-1px)',
                    }}
                    _active={{ transform: 'translateY(0)' }}
                    onClick={playAudio}
                  />
                ) : (
                  <Tooltip label="Audio Unavailable for this word" hasArrow>
                    <Box as="span" display="inline-block">
                      <IconButton
                        aria-label="Audio unavailable"
                        icon={<FaVolumeHigh />}
                        isRound
                        size="lg"
                        w="56px"
                        h="56px"
                        bg="gray.200"
                        color="gray.500"
                        _hover={{ bg: 'gray.200' }}
                        isDisabled
                        cursor="not-allowed"
                        opacity={0.85}
                      />
                    </Box>
                  </Tooltip>
                )}
              </Box>
              <Text fontSize="md" fontWeight="medium" color="blue.400" opacity={0.85} pt={1}>
                Word {index + 1} of {cards.length}
              </Text>
            </VStack>
          </Box>
          <IconButton
            display={{ base: 'none', md: 'inline-flex' }}
            aria-label="Next card"
            icon={<FaChevronRight />}
            onClick={goNext}
            isRound
            flexShrink={0}
            size="lg"
            bgGradient="linear(to-br, blue.500, purple.600)"
            color="white"
            boxShadow="md"
            _hover={{
              bgGradient: 'linear(to-br, blue.600, purple.700)',
              boxShadow: 'lg',
              transform: 'translateY(-1px)',
            }}
            _active={{ transform: 'translateY(0)' }}
            transition="all 0.2s ease"
          />
          <HStack
            display={{ base: 'flex', md: 'none' }}
            justify="center"
            spacing={6}
            pt={1}
            w="100%"
          >
            <IconButton
              aria-label="Previous card"
              icon={<FaChevronLeft />}
              onClick={goPrev}
              isRound
              size="md"
              bgGradient="linear(to-br, blue.500, purple.600)"
              color="white"
              boxShadow="md"
              _hover={{ bgGradient: 'linear(to-br, blue.600, purple.700)' }}
            />
            <IconButton
              aria-label="Next card"
              icon={<FaChevronRight />}
              onClick={goNext}
              isRound
              size="md"
              bgGradient="linear(to-br, blue.500, purple.600)"
              color="white"
              boxShadow="md"
              _hover={{ bgGradient: 'linear(to-br, blue.600, purple.700)' }}
            />
          </HStack>
        </Flex>
      ) : (
        <VStack spacing={4} py={8} textAlign="center">
          <Text color="gray.600">No practice words were generated for this story.</Text>
          <Button colorScheme="blue" variant="outline" onClick={() => router.push('/')}>
            Back to home
          </Button>
        </VStack>
      )}
    </VStack>
  );
}
