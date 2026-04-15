'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  Box,
  Button,
  Heading,
  HStack,
  Icon,
  Input,
  SimpleGrid,
  Text,
  Textarea,
  VStack,
  useToast,
} from '@chakra-ui/react';

import { featureDefinitions } from '@shared/content/features';
import { AppShell } from '@views/components/AppShell';
import { useSession } from '@views/providers/SessionProvider';
import { useText } from '@views/providers/TextProvider';
import type { FeatureKey } from '@shared/types/features';

const TITLE_MAX = 100;
const TEXT_CHARACTER_LIMIT = 3500;
const VALID_FEATURES: ReadonlyArray<FeatureKey> = ['phonics', 'comprehension', 'visualization', 'audiobook'];

export default function HomePage() {
  const { inputText, setInputText } = useText();
  const { session } = useSession();
  const [title, setTitle] = useState('');
  const [submittingFeature, setSubmittingFeature] = useState<FeatureKey | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  // Prefill from ?storyId=&service= when user clicked a History link on the dashboard.
  useEffect(() => {
    const storyId = searchParams.get('storyId');
    const service = searchParams.get('service') as FeatureKey | null;
    if (!storyId || !service || !VALID_FEATURES.includes(service)) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/stories/${service}/${storyId}`, { cache: 'no-store' });
        if (!res.ok) return;
        const story = await res.json();
        if (cancelled) return;
        if (typeof story.title === 'string')       setTitle(story.title);
        if (typeof story.source_text === 'string') setInputText(story.source_text);
      } catch {/* silent — user can still type fresh content */}
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const titleOver = title.length > TITLE_MAX;
  const titleEmpty = title.trim().length === 0;
  const textEmpty  = inputText.trim().length === 0;
  const textOver   = inputText.length > TEXT_CHARACTER_LIMIT;

  async function handleStartFeature(feature: FeatureKey) {
    if (titleEmpty) return toast({ status: 'error', title: 'Title is required', duration: 3000, isClosable: true });
    if (titleOver)  return toast({ status: 'error', title: `Title must be at most ${TITLE_MAX} characters`, duration: 3000, isClosable: true });
    if (textEmpty)  return toast({ status: 'error', title: 'Text is required', duration: 3000, isClosable: true });

    if (!session) {
      toast({ status: 'warning', title: 'Please sign in', description: 'Sign in to use a learning experience.', duration: 3000, isClosable: true });
      router.push('/auth');
      return;
    }

    setSubmittingFeature(feature);
    try {
      const res = await fetch('/api/features/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ feature, title: title.trim(), sourceText: inputText.trim(), userId: session.user.email }),
      });
      const body = await res.json();
      if (res.status === 402) {
        toast({ status: 'error', title: 'Insufficient credits', description: 'Recharge on the Dashboard to continue.', duration: 4000, isClosable: true });
        return;
      }
      if (!res.ok) {
        const detail = body.field ? `${body.field}: ${body.reason}` : body.message;
        toast({ status: 'error', title: body.error || 'Could not start feature', description: detail, duration: 4000, isClosable: true });
        return;
      }
      router.push(body.redirectTo);
    } catch (err) {
      toast({ status: 'error', title: 'Network error', description: (err as Error).message, duration: 4000, isClosable: true });
    } finally {
      setSubmittingFeature(null);
    }
  }

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
            multiple interactive tools. Give your reading a title, paste your text, and pick one of the four
            learning modes below.
          </Text>
        </VStack>

        <Box bg="white" p={8} borderRadius="xl" shadow="lg" border="1px" borderColor="gray.200">
          <VStack spacing={4} align="stretch">
            <VStack spacing={1} align="stretch">
              <Text fontSize="sm" fontWeight="semibold" color="gray.700">Title</Text>
              <Input
                placeholder="A short title (max 100 characters)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                isInvalid={titleOver}
              />
              <HStack justify="space-between">
                <Text fontSize="xs" color={titleOver ? 'red.500' : 'gray.500'}>
                  {title.length}/{TITLE_MAX}
                </Text>
                {titleOver && <Text fontSize="xs" color="red.500">Title is too long</Text>}
              </HStack>
            </VStack>

            <VStack spacing={1} align="stretch">
              <Text fontSize="sm" fontWeight="semibold" color="gray.700">Reading Text</Text>
              <Textarea
                placeholder="Type or paste your text here..."
                size="lg"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                minHeight="300px"
                resize="vertical"
                borderColor={textOver ? 'red.400' : 'gray.200'}
                _focus={{ borderColor: textOver ? 'red.500' : 'blue.400', boxShadow: 'none' }}
              />
              <HStack justify="space-between" flexWrap="wrap">
                <Text fontSize="sm" color={textOver ? 'red.500' : 'gray.500'}>
                  {inputText.length}/{TEXT_CHARACTER_LIMIT} characters
                </Text>
                <Text fontSize="sm" color="gray.500">
                  Navigation remains live even when backend-driven actions are stubbed.
                </Text>
              </HStack>
            </VStack>
          </VStack>
        </Box>

        <VStack spacing={2} align="stretch">
          <Heading as="h2" size="lg" textAlign="center" color="blue.600">
            Choose a Learning Experience
          </Heading>
          <Text fontSize="sm" color="gray.500" textAlign="center">
            10 credits charged per service
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} pt={4}>
            {featureDefinitions.map((feature) => {
              const isSubmitting = submittingFeature === feature.key;
              const isOtherSubmitting = submittingFeature !== null && submittingFeature !== feature.key;
              return (
                <Button
                  key={feature.key}
                  onClick={() => handleStartFeature(feature.key)}
                  isLoading={isSubmitting}
                  isDisabled={isOtherSubmitting}
                  loadingText={feature.title}
                  height="auto"
                  p={8}
                  colorScheme="blue"
                  variant="outline"
                  width="100%"
                  minH="220px"
                  whiteSpace="normal"
                  textAlign="center"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  transition="all 0.3s ease"
                  _hover={{ transform: 'translateY(-4px)', shadow: 'xl', bg: 'blue.50' }}
                >
                  <VStack spacing={4} align="center" width="100%">
                    <Icon as={feature.icon} boxSize={8} color="blue.500" />
                    <Text fontSize="2xl" fontWeight="bold" textAlign="center" whiteSpace="normal">
                      {feature.title}
                    </Text>
                    <Text fontSize="md" textAlign="center" color="gray.600" lineHeight="tall" whiteSpace="normal">
                      {feature.shortDescription}
                    </Text>
                  </VStack>
                </Button>
              );
            })}
          </SimpleGrid>
        </VStack>

        <Box maxW="1200px" mx="auto">
          <VStack align="stretch" spacing={8}>
            <Heading as="h2" size="lg" textAlign="center" color="blue.600">
              More About Read On
            </Heading>
            <Text fontSize="lg" textAlign="center" lineHeight="tall">
              Read On offers four powerful learning tools, each designed to address different aspects
              of reading comprehension and learning:
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
              <Box p={6} borderWidth="1px" borderRadius="lg" borderColor="gray.200" bg="white" transition="all 0.3s ease" _hover={{ transform: 'translateY(-2px)', shadow: 'md', bgGradient: 'linear(to-br, white, blue.50)' }}>
                <Heading as="h3" size="md" color="blue.600" mb={4}>1. Phonics Practice</Heading>
                <Text fontSize="lg" lineHeight="tall">
                  Having trouble with tricky words? Our Phonics Practice tool is like having a
                  personal reading coach! It helps you break down difficult words into smaller,
                  easier-to-understand parts. You can listen to how each word should sound, see
                  how it&apos;s pronounced, and practice at your own pace. Perfect for building confidence
                  with challenging vocabulary and improving your reading skills.
                </Text>
              </Box>
              <Box p={6} borderWidth="1px" borderRadius="lg" borderColor="gray.200" bg="white" transition="all 0.3s ease" _hover={{ transform: 'translateY(-2px)', shadow: 'md', bgGradient: 'linear(to-br, white, blue.50)' }}>
                <Heading as="h3" size="md" color="blue.600" mb={4}>2. Reading Comprehension</Heading>
                <Text fontSize="lg" lineHeight="tall">
                  Understanding what you read is just as important as reading itself. This tool
                  turns your reading into an interactive quiz game! After you read a text, it creates
                  personalized questions to check your understanding. You&apos;ll get instant feedback on
                  your answers, track your progress, and even celebrate your successes with fun
                  animations. It&apos;s like having a friendly teacher who helps you understand the story
                  better!
                </Text>
              </Box>
              <Box p={6} borderWidth="1px" borderRadius="lg" borderColor="gray.200" bg="white" transition="all 0.3s ease" _hover={{ transform: 'translateY(-2px)', shadow: 'md', bgGradient: 'linear(to-br, white, blue.50)' }}>
                <Heading as="h3" size="md" color="blue.600" mb={4}>3. Word Visualization</Heading>
                <Text fontSize="lg" lineHeight="tall">
                  Sometimes words can paint pictures in our minds - and this tool makes those pictures
                  real! It creates beautiful, custom images that match what you&apos;re reading about.
                  Whether it&apos;s a story about space exploration or a description of a peaceful garden,
                  our tool brings these words to life through pictures. This helps you remember and
                  understand what you&apos;re reading in a fun, visual way.
                </Text>
              </Box>
              <Box p={6} borderWidth="1px" borderRadius="lg" borderColor="gray.200" bg="white" transition="all 0.3s ease" _hover={{ transform: 'translateY(-2px)', shadow: 'md', bgGradient: 'linear(to-br, white, blue.50)' }}>
                <Heading as="h3" size="md" color="blue.600" mb={4}>4. Audiobook</Heading>
                <Text fontSize="lg" lineHeight="tall">
                  Want to hear your text come to life? Our Audiobook feature is like having a
                  friendly storyteller right beside you! It reads your text out loud while highlighting
                  each word as it goes, making it easy to follow along. This is great for learning
                  how words should sound, improving your pronunciation, or just giving your eyes a
                  rest while you listen. You can pause, replay, and learn at your own speed.
                </Text>
              </Box>
            </SimpleGrid>

            <Box p={6} borderWidth="1px" borderRadius="lg" borderColor="gray.200" bg="white" transition="all 0.3s ease" _hover={{ transform: 'translateY(-2px)', shadow: 'md', bgGradient: 'linear(to-br, white, blue.50)' }}>
              <Heading as="h3" size="md" color="blue.600" mb={4}>5. User Dashboard</Heading>
              <Text fontSize="lg" lineHeight="tall">
                The Read On dashboard gives learners a personal home base for everything they create and
                explore. It is designed to bring together profile details, saved generations, learning history,
                and subscription or credits information in one organized place. This makes it easier to return
                to favorite activities, continue past reading sessions, and build a more personalized reading
                journey over time.
              </Text>
            </Box>

            <Text fontSize="lg" textAlign="center" lineHeight="tall">
              These four tools work together to make reading more fun and accessible for everyone.
              Whether you learn better by seeing, hearing, or doing, Read On adapts to your unique
              way of learning. It&apos;s like having a whole team of friendly teachers ready to help you
              succeed in your reading journey!
            </Text>
          </VStack>
        </Box>

        <Box maxW="800px" mx="auto">
          <VStack align="stretch" spacing={8} mt={6}>
            <Heading as="h2" size="lg" textAlign="center" color="blue.600">Why We Built Read On</Heading>
            <Text fontSize="lg" textAlign="left" lineHeight="tall">
              Having worked with children with learning disabilities, we have witnessed firsthand the
              unique challenges these remarkable young minds face in their educational journey.
              Traditional learning methods often fall short in addressing their diverse needs, leaving
              many bright and capable students struggling to reach their full potential. This personal
              experience has been the driving force behind Read On, born from a deep-seated desire to
              create a tool that adapts to each child&apos;s unique learning style and pace.
            </Text>
            <Text fontSize="lg" textAlign="left" lineHeight="tall">
              Read On harnesses the power of artificial intelligence to transform the learning experience
              for special needs children. By combining visual, auditory, and interactive elements, we&apos;ve
              created a comprehensive platform that breaks down traditional barriers to learning. Whether
              it&apos;s using AI-generated images to help visual learners grasp complex concepts, providing
              phonetic breakdowns for those struggling with reading, or offering text-to-speech capabilities
              for auditory learners, every feature has been thoughtfully designed to support and empower
              these extraordinary children. Our goal is not just to assist in their learning journey, but
              to help build their confidence and independence, proving that with the right tools, every
              child can thrive.
            </Text>
            <Text fontSize="lg" textAlign="left" lineHeight="tall">
              We hope that through our application, we can help people of all skill levels overcome
              their learning barriers and <Text as="span" fontStyle="italic">Read On</Text>.
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
      </VStack>
    </AppShell>
  );
}
