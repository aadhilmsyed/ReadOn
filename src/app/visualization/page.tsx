'use client';

import { Suspense, forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Flex,
  Grid,
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

import { extractStoryParagraphFromIllustrationPrompt } from '@/lib/visualization/extractStoryParagraphFromPrompt';
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
/** Page height ÷ width — keep in sync with prior storybook layout. */
const PAGE_HEIGHT_OVER_WIDTH = 0.72;

/** Full width of the content track (same as Storybook bar); height follows fixed ratio. */
function computeBookDimensions(trackWidthPx: number): { pageWidth: number; pageHeight: number } {
  const w = Math.floor(trackWidthPx);
  if (w < 120) {
    return { pageWidth: 640, pageHeight: Math.round(640 * PAGE_HEIGHT_OVER_WIDTH) };
  }
  const pageWidth = Math.max(300, w);
  const pageHeight = Math.round(pageWidth * PAGE_HEIGHT_OVER_WIDTH);
  return { pageWidth, pageHeight };
}

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

async function generateSceneImage(
  prompt: string,
  storyId: string,
  paragraphIndex: number
): Promise<GeneratedImageClientResult> {
  return generateImage({
    prompt,
    storyId,
    paragraphIndex,
    style: 'storybook illustration',
    theme: 'reading visualization',
    ageGroup: 'children',
    numImages: 1,
  });
}

interface PreparedSceneApi {
  prompt?: string;
  imageUrls?: string[];
  generationId?: string;
}

function mapPreparedScene(s: PreparedSceneApi): ParagraphScene {
  const p = s.prompt || '';
  const paragraph = extractStoryParagraphFromIllustrationPrompt(p);
  const url = Array.isArray(s.imageUrls) && s.imageUrls[0] ? s.imageUrls[0] : undefined;
  return {
    paragraph,
    prompt: p,
    imageUrl: url,
    requestId: s.generationId,
    cached: true,
    status: url ? 'complete' : 'failed',
    error: url ? undefined : 'No image for this scene.',
  };
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
              fontSize={{ base: 'sm', md: 'xl' }}
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
          justify="center"
          px={{ base: 4, md: 6 }}
          py={3}
          borderTop="1px solid"
          borderColor="orange.100"
          color="gray.500"
          fontSize="xs"
        >
          <Text>Page {index + 1} of {total}</Text>
        </HStack>
      </VStack>
    </Box>
  )
);

StorybookPage.displayName = 'StorybookPage';

function VisualizationPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storyIdParam = (searchParams.get('storyId') ?? '').trim();
  const { inputText } = useText();
  const story = inputText.trim();
  const [scenes, setScenes] = useState<ParagraphScene[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const [bookSize, setBookSize] = useState(() => ({
    pageWidth: 920,
    pageHeight: Math.round(920 * PAGE_HEIGHT_OVER_WIDTH),
  }));
  const [visibleSceneIndex, setVisibleSceneIndex] = useState(0);
  const [packError, setPackError] = useState<string | null>(null);
  const flipBookRef = useRef<FlipBookRef>(null);
  const bookTrackRef = useRef<HTMLDivElement>(null);

  const paragraphs = useMemo(() => splitStoryIntoParagraphs(story), [story]);
  const canGoPrevious = visibleSceneIndex > 0;
  const canGoNext = visibleSceneIndex < Math.max(0, scenes.length - 1);

  // Callback when flipbook page changes (mouse drag, touch swipe, or click)
  function handleFlip(e: { data: number }) {
    const newPage = e.data;
    if (typeof newPage === 'number' && newPage >= 0 && newPage < scenes.length) {
      setVisibleSceneIndex(newPage);
    }
  }

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
    if (scenes.length === 0) return undefined;

    function measure() {
      const el = bookTrackRef.current;
      if (!el) return;
      const w = el.getBoundingClientRect().width;
      if (w >= 32) {
        setBookSize(computeBookDimensions(w));
      }
    }

    const el = bookTrackRef.current;
    if (!el) return undefined;

    measure();
    const rafId = requestAnimationFrame(measure);
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    window.addEventListener('resize', measure);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [scenes.length]);

  useEffect(() => {
    if (!storyIdParam) return undefined;
    let cancelled = false;
    setPackError(null);
    (async () => {
      try {
        const res = await fetch(`/api/visualization/story/${encodeURIComponent(storyIdParam)}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (cancelled) return;
        if (!res.ok) {
          setPackError('This storybook is not available for your account.');
          setScenes([]);
          setStarted(false);
          return;
        }
        const data = (await res.json()) as { success?: boolean; scenes?: PreparedSceneApi[] };
        if (cancelled) return;
        const raw = Array.isArray(data.scenes) ? data.scenes : [];
        const mapped = raw.map((s) => mapPreparedScene(s));
        if (mapped.length === 0) {
          setPackError('No illustration scenes were found for this story.');
        }
        setScenes(mapped);
        setStarted(true);
        setVisibleSceneIndex(0);
      } catch {
        if (!cancelled) setPackError('Could not load the storybook.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storyIdParam]);

  useEffect(() => {
    if (storyIdParam) return undefined;
    if (!story || paragraphs.length === 0) {
      return undefined;
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
      // Generate a unique storyId for this session
      const sessionStoryId = `story-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
          const result = await generateSceneImage(
            workingScenes[index].prompt,
            sessionStoryId,
            index
          );
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
  }, [paragraphs, story, storyIdParam]);

  return (
    <AppShell>
      <VStack spacing={5} align="stretch" maxW="1100px" mx="auto" px={{ base: 3, md: 6 }} pb={10} pt={2}>
        <HStack justify="space-between" w="100%" flexWrap="wrap" gap={2}>
          <Box>
            {storyIdParam ? (
              <Button variant="ghost" size="sm" onClick={() => router.push(`/features/${encodeURIComponent(storyIdParam)}`)}>
                ← Back to story features
              </Button>
            ) : null}
          </Box>
          <Box>
            {!storyIdParam && story ? (
              <Button as={Link} href="/" variant="ghost" size="sm">
                Edit story
              </Button>
            ) : null}
          </Box>
        </HStack>

        {packError ? (
          <Alert status="warning" borderRadius="lg">
            <AlertIcon />
            <AlertDescription>{packError}</AlertDescription>
          </Alert>
        ) : null}

        {!story && !storyIdParam && (
          <Alert status="info" borderRadius="lg">
            <AlertIcon />
            <AlertDescription>
              Enter a story on the home page, then choose Visualization to create your illustrated storybook.
            </AlertDescription>
          </Alert>
        )}

        {storyIdParam && !started && !packError ? (
          <VStack py={16} spacing={4}>
            <Spinner size="xl" color="blue.500" />
            <Text color="gray.600">Loading storybook…</Text>
          </VStack>
        ) : null}

        {scenes.length > 0 && (
          <Flex
            w="100%"
            align="center"
            justify="center"
            gap={{ base: 2, sm: 3, md: 4 }}
            px={{ base: 0, sm: 1 }}
            flexDir={{ base: 'column', md: 'row' }}
            py={2}
          >
            <IconButton
              display={{ base: 'none', md: 'inline-flex' }}
              aria-label="Previous page"
              icon={<FaChevronLeft />}
              onClick={flipPreviousPage}
              isDisabled={!canGoPrevious}
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

            <Box ref={bookTrackRef} flex="1" minW={0} w="100%" maxW="100%">
              <Box
                overflow="hidden"
                borderRadius="md"
                boxShadow="md"
                borderWidth="1px"
                borderColor="gray.200"
                bg="white"
                mx="auto"
                w="100%"
                maxW="100%"
                display="flex"
                justifyContent="center"
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
                  onFlip={handleFlip}
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
            </Box>

            <IconButton
              display={{ base: 'none', md: 'inline-flex' }}
              aria-label="Next page"
              icon={<FaChevronRight />}
              onClick={flipNextPage}
              isDisabled={!canGoNext}
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

            <HStack display={{ base: 'flex', md: 'none' }} justify="center" spacing={6} pt={1} w="100%">
              <IconButton
                aria-label="Previous page"
                icon={<FaChevronLeft />}
                onClick={flipPreviousPage}
                isDisabled={!canGoPrevious}
                isRound
                size="md"
                bgGradient="linear(to-br, blue.500, purple.600)"
                color="white"
                boxShadow="md"
                _hover={{ bgGradient: 'linear(to-br, blue.600, purple.700)' }}
              />
              <IconButton
                aria-label="Next page"
                icon={<FaChevronRight />}
                onClick={flipNextPage}
                isDisabled={!canGoNext}
                isRound
                size="md"
                bgGradient="linear(to-br, blue.500, purple.600)"
                color="white"
                boxShadow="md"
                _hover={{ bgGradient: 'linear(to-br, blue.600, purple.700)' }}
              />
            </HStack>
          </Flex>
        )}
      </VStack>
    </AppShell>
  );
}

export default function VisualizationPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <VStack py={20} spacing={4}>
            <Spinner size="xl" color="blue.500" />
            <Text color="gray.600">Loading visualization…</Text>
          </VStack>
        </AppShell>
      }
    >
      <VisualizationPageInner />
    </Suspense>
  );
}
