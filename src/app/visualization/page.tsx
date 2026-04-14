'use client';

import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Grid,
  Heading,
  HStack,
  IconButton,
  Image,
  Progress,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import HTMLFlipBook from 'react-pageflip';

import { AppShell } from '@views/components/AppShell';
import { useText } from '@views/providers/TextProvider';
import { generateImage, type GeneratedImageClientResult } from '@shared/clients/imageGenerationClient';

type IllustrationStatus = 'idle' | 'loading' | 'complete' | 'failed';

interface ParagraphScene {
  paragraph: string;
  prompt: string;
  imageUrl?: string;
  requestId?: string;
  cached?: boolean;
  status: IllustrationStatus;
  error?: string;
}

const STORYBOOK_CACHE_KEY = 'readon.visualization.storybook';
const MAX_PROMPT_PARAGRAPH_CHARS = 900;
const MAX_CONTEXT_CHARS = 700;
const NAV_AND_SHELL_OFFSET = 96;

interface FlipBookRef {
  pageFlip: () => {
    flip: (page: number, corner?: 'top' | 'bottom') => void;
    flipNext: (corner?: 'top' | 'bottom') => void;
    flipPrev: (corner?: 'top' | 'bottom') => void;
    getCurrentPageIndex: () => number;
    turnToPage: (page: number) => void;
  };
}

function splitStoryIntoParagraphs(story: string): string[] {
  return story
    .split(/\n+/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function compactText(text: string, limit: number): string {
  const compacted = text.replace(/\s+/g, ' ').trim();

  if (compacted.length <= limit) {
    return compacted;
  }

  return `${compacted.slice(0, limit).trim()}...`;
}

function buildIllustrationPrompt(paragraph: string, fullStory: string, paragraphIndex: number): string {
  const storyContext = compactText(fullStory, MAX_CONTEXT_CHARS);
  const sceneText = compactText(paragraph, MAX_PROMPT_PARAGRAPH_CHARS);

  return [
    'Create a single children\'s storybook illustration for one paragraph.',
    'Use warm, readable, age-appropriate visual storytelling with expressive characters and a clear setting.',
    'Keep character appearance consistent with the story context.',
    'Do not include written words, captions, speech bubbles, logos, watermarks, UI, or book-page text in the image.',
    'Use a rectangular storybook composition that fits a 4:3 illustration frame.',
    `Story context: ${storyContext}`,
    `Paragraph ${paragraphIndex + 1} scene to illustrate: ${sceneText}`,
    'Focus on the most important action, emotion, location, and objects from this paragraph.',
    'Style: polished picture-book art, soft natural lighting, rich but balanced colors, safe for children.',
  ].join('\n');
}

function getCachedStorybook(story: string): ParagraphScene[] | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.sessionStorage.getItem(STORYBOOK_CACHE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { story: string; scenes: ParagraphScene[] };
    return parsed.story === story ? parsed.scenes : null;
  } catch {
    return null;
  }
}

function cacheStorybook(story: string, scenes: ParagraphScene[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(STORYBOOK_CACHE_KEY, JSON.stringify({ story, scenes }));
}

function getBookSize() {
  if (typeof window === 'undefined') {
    return { pageWidth: 520, pageHeight: 660 };
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const availableHeight = Math.max(520, viewportHeight - NAV_AND_SHELL_OFFSET - 28);
  const availableWidth = Math.max(320, viewportWidth - 130);
  const pageWidth = Math.min(1180, availableWidth);
  const pageHeight = Math.min(720, Math.max(500, Math.floor(pageWidth * 0.58), availableHeight - 18));

  return {
    pageWidth: Math.max(340, pageWidth),
    pageHeight: Math.min(pageHeight, availableHeight),
  };
}

async function generateSceneImage(prompt: string): Promise<GeneratedImageClientResult> {
  return generateImage({
    prompt,
    style: 'storybook illustration',
    theme: 'reading visualization',
    ageGroup: 'children',
    numImages: 1,
  });
}

const StorybookPage = forwardRef<HTMLDivElement, { scene: ParagraphScene; index: number; total: number }>(
  ({ scene, index, total }, ref) => (
    <Box
      ref={ref}
      bg="#fffdf7"
      color="gray.800"
      border="1px solid"
      borderColor="orange.100"
      boxShadow="inset 0 0 32px rgba(102, 77, 38, 0.08)"
      h="100%"
      overflow="hidden"
    >
      <VStack h="100%" align="stretch" spacing={0}>
        <Grid
          templateColumns={{ base: '1fr', md: '0.9fr 1.1fr' }}
          gap={{ base: 4, md: 7 }}
          px={{ base: 4, md: 8 }}
          py={{ base: 4, md: 7 }}
          flex="1"
          minH={0}
        >
          <Box
            borderRight={{ base: 'none', md: '1px solid' }}
            borderBottom={{ base: '1px solid', md: 'none' }}
            borderColor="orange.100"
            pr={{ base: 0, md: 7 }}
            pb={{ base: 4, md: 0 }}
            overflowY="auto"
            display="flex"
            alignItems="center"
          >
            <Text
              fontFamily="Georgia, serif"
              fontSize={{ base: 'md', md: '2xl' }}
              lineHeight="1.75"
              color="gray.800"
            >
              {scene.paragraph}
            </Text>
          </Box>

          <Box
            bg="white"
            border="1px solid"
            borderColor="gray.200"
            borderRadius="md"
            alignSelf="center"
            justifySelf="stretch"
            aspectRatio={4 / 3}
            display="grid"
            placeItems="center"
            overflow="hidden"
          >
            {scene.status === 'loading' && (
              <VStack spacing={3} color="gray.600">
                <Spinner size="xl" color="blue.500" />
                <Text>Painting this scene...</Text>
              </VStack>
            )}

            {scene.status === 'complete' && scene.imageUrl && (
              <Image
                src={scene.imageUrl}
                alt={`Illustration for paragraph ${index + 1}`}
                w="100%"
                h="100%"
                objectFit="cover"
              />
            )}

            {scene.status === 'failed' && (
              <Alert status="error" borderRadius="md" m={4}>
                <AlertIcon />
                <AlertDescription>{scene.error}</AlertDescription>
              </Alert>
            )}

            {scene.status === 'idle' && (
              <Text color="gray.500" px={4} textAlign="center">
                Waiting for this scene...
              </Text>
            )}
          </Box>
        </Grid>

        <HStack
          justify="space-between"
          px={{ base: 4, md: 6 }}
          py={3}
          borderTop="1px solid"
          borderColor="orange.100"
          color="gray.500"
          fontSize="xs"
        >
          <Text>Page {index + 1} of {total}</Text>
          {scene.requestId && (
            <Text noOfLines={1}>
              {scene.cached ? 'Cached' : 'Generated'} - {scene.requestId}
            </Text>
          )}
        </HStack>
      </VStack>
    </Box>
  )
);

StorybookPage.displayName = 'StorybookPage';

export default function VisualizationPage() {
  const { inputText } = useText();
  const story = inputText.trim();
  const [scenes, setScenes] = useState<ParagraphScene[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const [bookSize, setBookSize] = useState(() => getBookSize());
  const [visibleSceneIndex, setVisibleSceneIndex] = useState(0);
  const flipBookRef = useRef<FlipBookRef>(null);

  const paragraphs = useMemo(() => splitStoryIntoParagraphs(story), [story]);
  const completedCount = scenes.filter((scene) => scene.status === 'complete').length;
  const failedCount = scenes.filter((scene) => scene.status === 'failed').length;
  const progressValue = scenes.length > 0 ? ((completedCount + failedCount) / scenes.length) * 100 : 0;
  const isGenerating = scenes.some((scene) => scene.status === 'loading');
  const canGoPrevious = visibleSceneIndex > 0;
  const canGoNext = visibleSceneIndex < Math.max(0, scenes.length - 1);

  function goToScenePage(targetPage: number) {
    const boundedTarget = Math.max(0, Math.min(scenes.length - 1, targetPage));
    const pageFlip = flipBookRef.current?.pageFlip();

    if (!pageFlip) {
      return;
    }

    pageFlip.flip(boundedTarget, 'bottom');
    setVisibleSceneIndex(boundedTarget);

    window.setTimeout(() => {
      if (pageFlip.getCurrentPageIndex() !== boundedTarget) {
        pageFlip.turnToPage(boundedTarget);
      }
    }, 760);
  }

  function flipPreviousPage() {
    if (!canGoPrevious) {
      return;
    }

    goToScenePage(visibleSceneIndex - 1);
  }

  function flipNextPage() {
    if (!canGoNext) {
      return;
    }

    goToScenePage(visibleSceneIndex + 1);
  }

  useEffect(() => {
    function updateBookSize() {
      setBookSize(getBookSize());
    }

    updateBookSize();
    window.addEventListener('resize', updateBookSize);

    return () => {
      window.removeEventListener('resize', updateBookSize);
    };
  }, []);

  useEffect(() => {
    if (!story || paragraphs.length === 0) {
      return;
    }

    const initialScenes: ParagraphScene[] = paragraphs.map((paragraph, index) => ({
      paragraph,
      prompt: buildIllustrationPrompt(paragraph, story, index),
      status: 'idle' as IllustrationStatus,
    }));
    const cachedScenes = getCachedStorybook(story);
    const startScenes = initialScenes.map((scene, index) => {
      const cachedScene = cachedScenes?.[index];

      if (!cachedScene || cachedScene.paragraph !== scene.paragraph) {
        return scene;
      }

      if (cachedScene.status === 'complete' && cachedScene.imageUrl) {
        return cachedScene;
      }

      return {
        ...scene,
        status: 'idle' as IllustrationStatus,
      };
    });

    setScenes(startScenes);
    setStarted(true);
    setVisibleSceneIndex(0);

    let cancelled = false;

    async function generateAllScenes() {
      const workingScenes = [...startScenes];

      for (let index = 0; index < workingScenes.length; index += 1) {
        if (cancelled) {
          return;
        }

        if (workingScenes[index].status === 'complete') {
          continue;
        }

        setActiveIndex(index);
        workingScenes[index] = { ...workingScenes[index], status: 'loading', error: undefined };
        setScenes([...workingScenes]);

        try {
          const result = await generateSceneImage(workingScenes[index].prompt);
          const completedScene = {
            ...workingScenes[index],
            imageUrl: result.images?.[0]?.url,
            requestId: result.requestId,
            cached: result.cached,
            status: 'complete' as IllustrationStatus,
          };

          if (cancelled) {
            return;
          }

          workingScenes[index] = completedScene;
        } catch (error) {
          if (cancelled) {
            return;
          }

          workingScenes[index] = {
            ...workingScenes[index],
            status: 'failed',
            error: error instanceof Error ? error.message : 'Image generation failed.',
          };
        }

        setScenes([...workingScenes]);
        cacheStorybook(story, workingScenes);
      }

      setActiveIndex(null);
    }

    generateAllScenes();

    return () => {
      cancelled = true;
    };
  }, [paragraphs, story]);

  return (
    <AppShell>
      <Box
        position="relative"
        w="100vw"
        minH={`calc(100vh - ${NAV_AND_SHELL_OFFSET}px)`}
        ml="calc(50% - 50vw)"
        mt={-10}
      >
        {!story && (
          <Alert status="info" borderRadius="lg" maxW="720px" mx="auto">
            <AlertIcon />
            <AlertDescription>
              Enter a story on the home page, then choose Visualization to create your illustrated storybook.
            </AlertDescription>
          </Alert>
        )}

        {story && started && (
          <Box
            position="fixed"
            top={{ base: '74px', md: '14px' }}
            left={{ base: 3, md: '50%' }}
            transform={{ base: 'none', md: 'translateX(-50%)' }}
            zIndex={20}
            w={{ base: 'calc(100% - 24px)', md: '390px' }}
            bg="whiteAlpha.200"
            border="1px solid"
            borderColor="whiteAlpha.300"
            borderRadius="md"
            px={3}
            py={1.5}
            boxShadow="sm"
            backdropFilter="blur(10px)"
          >
            <HStack align="center" spacing={3} h="34px">
              <Box minW={0} flex="1">
                <Text fontSize="xs" fontWeight="bold" color="white" noOfLines={1}>
                  Storybook
                </Text>
                <Progress value={progressValue} colorScheme="yellow" borderRadius="full" size="xs" mt={1} />
              </Box>
              <HStack spacing={2} flexShrink={0}>
                {isGenerating && activeIndex !== null && <Spinner size="xs" color="whiteAlpha.900" />}
                <Text fontSize="xs" color="whiteAlpha.900" whiteSpace="nowrap">
                  {completedCount}/{scenes.length} ready
                </Text>
                {failedCount > 0 && (
                  <Text fontSize="xs" color="red.100" whiteSpace="nowrap">
                    {failedCount} failed
                  </Text>
                )}
                <Button as={Link} href="/" variant="solid" colorScheme="yellow" size="xs" borderRadius="md">
                  Edit
                </Button>
              </HStack>
            </HStack>
          </Box>
        )}

        {scenes.length > 0 && (
          <Box
            position="relative"
            minH={`calc(100vh - ${NAV_AND_SHELL_OFFSET}px)`}
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg="#d8e3e7"
            borderRadius="none"
            p={{ base: 2, md: 3 }}
            boxShadow="2xl"
            overflow="hidden"
          >
            <IconButton
              aria-label="Previous page"
              icon={<FaChevronLeft />}
              onClick={flipPreviousPage}
              isDisabled={!canGoPrevious}
              colorScheme="yellow"
              variant="solid"
              borderRadius="md"
              position="absolute"
              left={{ base: 2, md: 6 }}
              top="50%"
              transform="translateY(-50%)"
              zIndex={4}
              boxShadow="lg"
            />

            <Box
              overflow="hidden"
              borderRadius="md"
              bg="#6b7d84"
              p={{ base: 1, md: 3 }}
              maxW="calc(100vw - 112px)"
              maxH={`calc(100vh - ${NAV_AND_SHELL_OFFSET + 24}px)`}
            >
              <HTMLFlipBook
                ref={flipBookRef}
                className="readon-storybook"
                style={{ margin: '0 auto' }}
                width={bookSize.pageWidth}
                height={bookSize.pageHeight}
                minWidth={bookSize.pageWidth}
                maxWidth={bookSize.pageWidth}
                minHeight={bookSize.pageHeight}
                maxHeight={bookSize.pageHeight}
                size="fixed"
                startPage={0}
                drawShadow
                flippingTime={700}
                usePortrait
                startZIndex={0}
                autoSize
                maxShadowOpacity={0.35}
                showCover={false}
                mobileScrollSupport
                clickEventForward
                useMouseEvents
                swipeDistance={20}
                showPageCorners
                disableFlipByClick
              >
                {scenes.map((scene, index) => (
                  <StorybookPage
                    key={`${index}-${scene.paragraph.slice(0, 20)}`}
                    scene={scene}
                    index={index}
                    total={scenes.length}
                  />
                ))}
              </HTMLFlipBook>
            </Box>

            <IconButton
              aria-label="Next page"
              icon={<FaChevronRight />}
              onClick={flipNextPage}
              isDisabled={!canGoNext}
              colorScheme="yellow"
              variant="solid"
              borderRadius="md"
              position="absolute"
              right={{ base: 2, md: 6 }}
              top="50%"
              transform="translateY(-50%)"
              zIndex={4}
              boxShadow="lg"
            />
          </Box>
        )}
      </Box>
    </AppShell>
  );
}
