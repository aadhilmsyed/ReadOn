'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  Heading,
  HStack,
  SimpleGrid,
  Text,
  Textarea,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';

import {
  PHONICS_SESSION_HOME_FLASH_ERROR_KEY,
  PHONICS_SESSION_STORY_TEXT_KEY,
} from '@shared/constants/phonicsClient';
import { featureDefinitions } from '@shared/content/features';
import type { FeatureKey } from '@shared/types/features';
import { FeatureCard } from '@views/components/FeatureCard';
import { AppShell } from '@views/components/AppShell';
import { useSession } from '@views/providers/SessionProvider';
import { useText } from '@views/providers/TextProvider';

const CHARACTER_LIMIT = 3500;
const VALID_FEATURES: ReadonlyArray<FeatureKey> = ['phonics', 'comprehension', 'visualization', 'audiobook'];

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { inputText, setInputText } = useText();
  const { session, isReady } = useSession();
  const authDialog = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const overLimit = inputText.length > CHARACTER_LIMIT;
  const [phonicsInputError, setPhonicsInputError] = useState<string | null>(null);
  const [phonicsFlashError, setPhonicsFlashError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const msg = sessionStorage.getItem(PHONICS_SESSION_HOME_FLASH_ERROR_KEY);
    if (msg) {
      setPhonicsFlashError(msg);
      sessionStorage.removeItem(PHONICS_SESSION_HOME_FLASH_ERROR_KEY);
    }
  }, []);

  // Prefill reading text when opened from dashboard history (?storyId=&service=)
  useEffect(() => {
    const storyId = searchParams.get('storyId');
    const service = searchParams.get('service') as FeatureKey | null;
    if (!storyId || !service || !VALID_FEATURES.includes(service)) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/stories/${service}/${storyId}`, {
          cache: 'no-store',
          credentials: 'include',
        });
        if (!res.ok) return;
        const story = await res.json();
        if (cancelled) return;
        if (typeof story.source_text === 'string') setInputText(story.source_text);
      } catch {
        /* silent — user can still type fresh content */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePhonicsPractice = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      setPhonicsInputError('Add some reading text in the box above before starting Phonics Practice.');
      return;
    }
    setPhonicsInputError(null);
    sessionStorage.setItem(PHONICS_SESSION_STORY_TEXT_KEY, trimmed);
    router.push('/phonics');
  }, [inputText, router]);

  const launchAudiobook = useCallback(() => {
    const trimmed = inputText.trim();
    if (trimmed) {
      sessionStorage.setItem('audiobook:sourceText', trimmed);
      router.push('/audiobook/player');
      return;
    }
    router.push('/audiobook');
  }, [router, inputText]);

  const gateFeature = useCallback(
    (run: () => void) => {
      if (!isReady) return;
      if (!session) {
        authDialog.onOpen();
        return;
      }
      run();
    },
    [authDialog, isReady, session],
  );

  const handleFeatureNavigate = useCallback(
    (key: FeatureKey) => {
      gateFeature(() => {
        if (key === 'phonics') handlePhonicsPractice();
        else if (key === 'audiobook') launchAudiobook();
        else {
          const route = featureDefinitions.find((f) => f.key === key)?.route;
          if (route) router.push(route);
        }
      });
    },
    [gateFeature, handlePhonicsPractice, launchAudiobook, router],
  );

  return (
    <AppShell>
      <VStack spacing={12} align="stretch">
        <VStack spacing={5} textAlign="center" pt={4}>
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
          <Text fontSize="lg" color="gray.600" maxW="4xl" lineHeight="tall">
            Read On is an AI-powered reading companion designed to enhance your learning experience through
            multiple interactive tools. Start by inputting your text in the box below, then select one of the
            four distinct learning modes:
          </Text>
        </VStack>

        <Box bg="white" p={8} borderRadius="xl" shadow="lg" border="1px" borderColor="gray.200">
          <VStack spacing={4} align="stretch">
            <VStack spacing={1}>
              <Text fontSize="xl" fontWeight="semibold" color="gray.700">
                Add Reading Text
              </Text>
              <Text fontSize="sm" color="gray.500">
                This text is stored client-side so it remains available as you move between pages.
              </Text>
            </VStack>
            <Textarea
              placeholder="Type or paste your text here..."
              size="lg"
              value={inputText}
              onChange={(event) => {
                setInputText(event.target.value);
                if (phonicsInputError) setPhonicsInputError(null);
              }}
              minHeight="300px"
              resize="vertical"
              borderColor={overLimit ? 'red.400' : 'gray.200'}
              _focus={{ borderColor: overLimit ? 'red.500' : 'blue.400', boxShadow: 'none' }}
            />
            {(phonicsInputError || phonicsFlashError) && (
              <Alert
                status="error"
                borderRadius="lg"
                variant="subtle"
                bg="red.50"
                borderWidth="1px"
                borderColor="red.100"
              >
                <AlertIcon />
                <AlertDescription color="gray.700">{phonicsInputError ?? phonicsFlashError}</AlertDescription>
              </Alert>
            )}
            <HStack justify="space-between" flexWrap="wrap">
              <Text fontSize="sm" color={overLimit ? 'red.500' : 'gray.500'}>
                {inputText.length}/{CHARACTER_LIMIT} characters
              </Text>
              <Text fontSize="sm" color="gray.500">
                Sign in to unlock Phonics, Comprehension, Visualization, and Audiobook.
              </Text>
            </HStack>
          </VStack>
        </Box>

        <VStack spacing={6} align="stretch">
          <Heading as="h2" size="lg" textAlign="center" color="blue.600">
            Choose a Learning Experience
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
            {featureDefinitions.map((feature) => (
              <FeatureCard
                key={feature.key}
                href={feature.route}
                title={feature.title}
                description={feature.shortDescription}
                icon={feature.icon}
                onNavigate={() => handleFeatureNavigate(feature.key)}
              />
            ))}
          </SimpleGrid>
        </VStack>

        <Box maxW="1200px" mx="auto">
          <VStack align="stretch" spacing={8}>
            <Heading as="h2" size="lg" textAlign="center" color="blue.600">
              More About Read On
            </Heading>

            <Text fontSize="lg" textAlign="center" lineHeight="tall">
              Read On offers four powerful learning tools, each designed to address different aspects of reading
              comprehension and learning:
            </Text>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
              <Box
                p={6}
                borderWidth="1px"
                borderRadius="lg"
                borderColor="gray.200"
                bg="white"
                transition="all 0.3s ease"
                _hover={{
                  transform: 'translateY(-2px)',
                  shadow: 'md',
                  bgGradient: 'linear(to-br, white, blue.50)',
                }}
              >
                <Heading as="h3" size="md" color="blue.600" mb={4}>
                  1. Phonics Practice
                </Heading>
                <Text fontSize="lg" lineHeight="tall">
                  Having trouble with tricky words? Our Phonics Practice tool is like having a personal reading
                  coach! It helps you break down difficult words into smaller, easier-to-understand parts. You can
                  listen to how each word should sound, see how it&apos;s pronounced, and practice at your own
                  pace. Perfect for building confidence with challenging vocabulary and improving your reading
                  skills.
                </Text>
              </Box>

              <Box
                p={6}
                borderWidth="1px"
                borderRadius="lg"
                borderColor="gray.200"
                bg="white"
                transition="all 0.3s ease"
                _hover={{
                  transform: 'translateY(-2px)',
                  shadow: 'md',
                  bgGradient: 'linear(to-br, white, blue.50)',
                }}
              >
                <Heading as="h3" size="md" color="blue.600" mb={4}>
                  2. Reading Comprehension
                </Heading>
                <Text fontSize="lg" lineHeight="tall">
                  Understanding what you read is just as important as reading itself. This tool turns your
                  reading into an interactive quiz game! After you read a text, it creates personalized
                  questions to check your understanding. You&apos;ll get instant feedback on your answers, track
                  your progress, and even celebrate your successes with fun animations. It&apos;s like having a
                  friendly teacher who helps you understand the story better!
                </Text>
              </Box>

              <Box
                p={6}
                borderWidth="1px"
                borderRadius="lg"
                borderColor="gray.200"
                bg="white"
                transition="all 0.3s ease"
                _hover={{
                  transform: 'translateY(-2px)',
                  shadow: 'md',
                  bgGradient: 'linear(to-br, white, blue.50)',
                }}
              >
                <Heading as="h3" size="md" color="blue.600" mb={4}>
                  3. Word Visualization
                </Heading>
                <Text fontSize="lg" lineHeight="tall">
                  Sometimes words can paint pictures in our minds - and this tool makes those pictures real! It
                  creates beautiful, custom images that match what you&apos;re reading about. Whether it&apos;s a
                  story about space exploration or a description of a peaceful garden, our tool brings these words
                  to life through pictures. This helps you remember and understand what you&apos;re reading in a
                  fun, visual way.
                </Text>
              </Box>

              <Box
                p={6}
                borderWidth="1px"
                borderRadius="lg"
                borderColor="gray.200"
                bg="white"
                transition="all 0.3s ease"
                _hover={{
                  transform: 'translateY(-2px)',
                  shadow: 'md',
                  bgGradient: 'linear(to-br, white, blue.50)',
                }}
              >
                <Heading as="h3" size="md" color="blue.600" mb={4}>
                  4. Read Aloud
                </Heading>
                <Text fontSize="lg" lineHeight="tall">
                  Want to hear your text come to life? Our Read Aloud feature is like having a friendly
                  storyteller right beside you! It reads your text out loud while highlighting each word as it
                  goes, making it easy to follow along. This is great for learning how words should sound,
                  improving your pronunciation, or just giving your eyes a rest while you listen. You can pause,
                  replay, and learn at your own speed.
                </Text>
              </Box>
            </SimpleGrid>

            <Box
              p={6}
              borderWidth="1px"
              borderRadius="lg"
              borderColor="gray.200"
              bg="white"
              transition="all 0.3s ease"
              _hover={{
                transform: 'translateY(-2px)',
                shadow: 'md',
                bgGradient: 'linear(to-br, white, blue.50)',
              }}
            >
              <Heading as="h3" size="md" color="blue.600" mb={4}>
                5. User Dashboard
              </Heading>
              <Text fontSize="lg" lineHeight="tall">
                The Read On dashboard gives learners a personal home base for everything they create and explore.
                It is designed to bring together profile details, saved generations, learning history, and
                subscription or credits information in one organized place. This makes it easier to return to
                favorite activities, continue past reading sessions, and build a more personalized reading
                journey over time.
              </Text>
            </Box>

            <Text fontSize="lg" textAlign="center" lineHeight="tall">
              These four tools work together to make reading more fun and accessible for everyone. Whether you
              learn better by seeing, hearing, or doing, Read On adapts to your unique way of learning. It&apos;s
              like having a whole team of friendly teachers ready to help you succeed in your reading journey!
            </Text>
          </VStack>
        </Box>

        <Box maxW="800px" mx="auto">
          <VStack align="stretch" spacing={8} mt={6}>
            <Heading as="h2" size="lg" textAlign="center" color="blue.600">
              Why We Built Read On
            </Heading>

            <Text fontSize="lg" textAlign="left" lineHeight="tall">
              Having worked with children with learning disabilities, we have witnessed firsthand the unique
              challenges these remarkable young minds face in their educational journey. Traditional learning
              methods often fall short in addressing their diverse needs, leaving many bright and capable students
              struggling to reach their full potential. This personal experience has been the driving force behind
              Read On, born from a deep-seated desire to create a tool that adapts to each child&apos;s unique
              learning style and pace.
            </Text>

            <Text fontSize="lg" textAlign="left" lineHeight="tall">
              Read On harnesses the power of artificial intelligence to transform the learning experience for
              special needs children. By combining visual, auditory, and interactive elements, we&apos;ve created a
              comprehensive platform that breaks down traditional barriers to learning. Whether it&apos;s using
              AI-generated images to help visual learners grasp complex concepts, providing phonetic breakdowns for
              those struggling with reading, or offering text-to-speech capabilities for auditory learners, every
              feature has been thoughtfully designed to support and empower these extraordinary children. Our goal is
              not just to assist in their learning journey, but to help build their confidence and independence,
              proving that with the right tools, every child can thrive.
            </Text>

            <Text fontSize="lg" textAlign="left" lineHeight="tall">
              We hope that through our application, we can help people of all skill levels overcome their learning
              barriers and{' '}
              <Text as="span" fontStyle="italic">
                Read On
              </Text>
              .
            </Text>
          </VStack>
        </Box>

        <Box maxW="600px" mx="auto" mt={4} mb={8}>
          <VStack spacing={2}>
            <Image
              src="/ReadaBook.png"
              alt="A mother and a child read a book together"
              width={600}
              height={400}
              style={{ objectFit: 'contain' }}
              priority
            />
            <Text fontSize="md" color="gray.600" fontStyle="italic" textAlign="center">
              A mother and a child read a book together
            </Text>
          </VStack>
        </Box>

        <AlertDialog isOpen={authDialog.isOpen} leastDestructiveRef={cancelRef} onClose={authDialog.onClose}>
          <AlertDialogOverlay />
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Sign in required
            </AlertDialogHeader>
            <AlertDialogBody>
              Create a free account or sign in to use Phonics, Comprehension, Visualization, and Audiobook.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={authDialog.onClose}>
                Stay here
              </Button>
              <Button
                colorScheme="blue"
                onClick={() => {
                  authDialog.onClose();
                  router.push('/auth');
                }}
                ml={3}
              >
                Go to Sign In
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </VStack>
    </AppShell>
  );
}
