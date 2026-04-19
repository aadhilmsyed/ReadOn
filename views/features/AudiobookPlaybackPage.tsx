'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Heading,
  Text,
  VStack,
} from '@chakra-ui/react';

import { getFeatureDefinition } from '@shared/content/features';
import { AppShell } from '@views/components/AppShell';

function tokenizeSourceText(text: string) {
  return text.match(/\S+\s*/g) ?? [];
}

export function AudiobookPlaybackPage() {
  const feature = getFeatureDefinition('audiobook');
  const [sourceText, setSourceText] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTokenIndex, setActiveTokenIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const tokens = useMemo(() => tokenizeSourceText(sourceText), [sourceText]);

  useEffect(() => {
    const cachedText = sessionStorage.getItem('audiobook:sourceText') ?? '';
    setSourceText(cachedText);
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!sourceText) {
      return;
    }

    const generateAudio = async () => {
      setError(null);
      setLoading(true);

      try {
        const res = await fetch('/api/audiobook/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: sourceText }),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? `Request failed (${res.status})`);
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl((prevUrl) => {
          if (prevUrl) {
            URL.revokeObjectURL(prevUrl);
          }
          return url;
        });

        queueMicrotask(() => {
          void audioRef.current?.play().catch(() => {
            /* autoplay may be blocked; user can press play */
          });
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not generate audio.');
      } finally {
        setLoading(false);
      }
    };

    void generateAudio();
  }, [sourceText]);

  const updateActiveToken = () => {
    const player = audioRef.current;
    if (!player || !tokens.length || !Number.isFinite(player.duration) || player.duration <= 0) {
      setActiveTokenIndex(0);
      return;
    }

    const progress = Math.max(0, Math.min(1, player.currentTime / player.duration));
    const nextIndex = Math.min(tokens.length - 1, Math.floor(progress * (tokens.length - 1)));
    setActiveTokenIndex(nextIndex);
  };

  return (
    <AppShell>
      <VStack spacing={8} align="stretch" maxW="900px" mx="auto" w="100%">
        <VStack spacing={3} align="stretch" textAlign="center" pt={2}>
          <Heading
            as="h1"
            size="xl"
            bgGradient="linear(to-r, blue.400, purple.500, pink.500)"
            bgClip="text"
            fontWeight="extrabold"
          >
            {feature.title} Playback
          </Heading>
          <Text fontSize="md" color="gray.600" lineHeight="tall" maxW="lg" mx="auto">
            Listen with synced highlighting while the generated speech plays.
          </Text>
        </VStack>

        <Box
          p="1px"
          borderRadius="2xl"
          bgGradient="linear(to-br, blue.400, purple.500, pink.300)"
          boxShadow="0 4px 24px rgba(59, 130, 246, 0.12)"
        >
          <Box bg="white" borderRadius="2xl" p={{ base: 6, md: 10 }} shadow="sm">
          <VStack align="stretch" spacing={5}>
            {!sourceText ? (
              <Alert status="info" borderRadius="lg">
                <AlertIcon />
                <Box>
                  <AlertTitle>No input text found</AlertTitle>
                  <AlertDescription>
                    Enter text on the audiobook page first, then start read-aloud.
                  </AlertDescription>
                </Box>
              </Alert>
            ) : null}

            {error ? (
              <Alert status="error" borderRadius="lg">
                <AlertIcon />
                <Box>
                  <AlertTitle>Read-aloud error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Box>
              </Alert>
            ) : null}

            <Box>
              <Text fontSize="sm" fontWeight="semibold" color="purple.600" letterSpacing="wide" mb={2}>
                TTS Player
              </Text>
              <audio
                ref={audioRef}
                controls
                src={audioUrl ?? undefined}
                onTimeUpdate={updateActiveToken}
                onLoadedMetadata={updateActiveToken}
                onPlay={updateActiveToken}
                style={{ width: '100%' }}
              />
              {loading ? (
                <Text mt={2} fontSize="sm" color="gray.600">
                  Generating narration…
                </Text>
              ) : null}
            </Box>

            {sourceText ? (
              <Box
                p="1px"
                borderRadius="xl"
                bgGradient="linear(to-r, blue.200, purple.200)"
              >
                <Box borderRadius="lg" p={4} lineHeight="tall" bg="gray.50">
                {tokens.map((token, idx) => (
                  <Text
                    key={`${token}-${idx}`}
                    as="span"
                    bg={idx === activeTokenIndex ? 'purple.100' : 'transparent'}
                    color={idx === activeTokenIndex ? 'purple.800' : 'gray.800'}
                    borderRadius="sm"
                    transition="background 0.12s ease, color 0.12s ease"
                  >
                    {token}
                  </Text>
                ))}
                </Box>
              </Box>
            ) : null}

            <Button
              as={Link}
              href="/audiobook"
              variant="outline"
              colorScheme="purple"
              alignSelf="flex-start"
            >
              Back to input
            </Button>
          </VStack>
          </Box>
        </Box>
      </VStack>
    </AppShell>
  );
}
