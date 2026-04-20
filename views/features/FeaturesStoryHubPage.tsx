'use client';

import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Heading,
  HStack,
  SimpleGrid,
  Text,
  Tooltip,
  VStack,
} from '@chakra-ui/react';

import { featureDefinitions } from '@shared/content/features';
import type { FeatureKey } from '@shared/types/features';
import type { ReaderStoryFeatureStatus } from '@orchestrators/dashboard/clients/readerStoriesClient';
import { FeatureCard } from '@views/components/FeatureCard';
import { AppShell } from '@views/components/AppShell';

export interface FeaturesStoryHubPageProps {
  storyId: string;
  title: string;
  sourceText: string;
  features: Record<FeatureKey, ReaderStoryFeatureStatus>;
}

function routeForFeature(key: FeatureKey, storyId: string): string {
  const u = new URLSearchParams();
  u.set('storyId', storyId);
  if (key === 'audiobook') {
    return `/audiobook/player?${u.toString()}`;
  }
  const base = featureDefinitions.find((f) => f.key === key)?.route ?? '/';
  return `${base}?${u.toString()}`;
}

function isLaunchable(status: ReaderStoryFeatureStatus): boolean {
  return status === 'ready';
}

function tooltipFor(status: ReaderStoryFeatureStatus): string {
  if (status === 'ready') return '';
  if (status === 'pending') return 'This experience is still preparing.';
  return 'This experience is unavailable for this story.';
}

export function FeaturesStoryHubPage({ storyId, title, sourceText, features }: FeaturesStoryHubPageProps) {
  const router = useRouter();

  return (
    <AppShell>
      <VStack spacing={10} align="stretch" pt={4}>
        <HStack>
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
            ← Back
          </Button>
        </HStack>

        <VStack spacing={8} textAlign="center" align="stretch">
          <VStack spacing={5} textAlign="center">
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
          </VStack>
          <Heading as="h2" size="lg" color="blue.600">
            {title}
          </Heading>
        </VStack>

        <Box bg="white" p={8} borderRadius="xl" shadow="lg" border="1px" borderColor="gray.200">
          <Text fontSize="md" color="gray.700" whiteSpace="pre-wrap" lineHeight="tall">
            {sourceText}
          </Text>
        </Box>

        <VStack spacing={4} align="stretch">
          <Heading as="h2" size="lg" textAlign="center" color="blue.600">
            Choose a Learning Experience
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
            {featureDefinitions.map((feature) => {
              const st = features[feature.key];
              const disabled = !isLaunchable(st);
              const tip = tooltipFor(st);
              return (
                <Tooltip key={feature.key} label={tip} isDisabled={!disabled || !tip} hasArrow>
                  <Box>
                    <FeatureCard
                      href={routeForFeature(feature.key, storyId)}
                      title={feature.title}
                      description={feature.shortDescription}
                      icon={feature.icon}
                      onNavigate={() => {
                        if (disabled) return;
                        router.push(routeForFeature(feature.key, storyId));
                      }}
                      isDisabled={disabled}
                    />
                  </Box>
                </Tooltip>
              );
            })}
          </SimpleGrid>
        </VStack>
      </VStack>
    </AppShell>
  );
}
