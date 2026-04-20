'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  HStack,
  Image,
  Spinner,
} from '@chakra-ui/react';
import { AppShell } from '@views/components/AppShell';

interface StoryData {
  story: string;
  imageUrl: string;
  requestId: string;
  generatedAt: string;
}

export default function StoryViewPage() {
  const router = useRouter();
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = sessionStorage.getItem('storyData');
    if (data) {
      setStoryData(JSON.parse(data));
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <AppShell>
        <VStack py={20}>
          <Spinner size="xl" color="blue.500" />
          <Text>Loading story...</Text>
        </VStack>
      </AppShell>
    );
  }

  if (!storyData) {
    return (
      <AppShell>
        <VStack py={20} spacing={4}>
          <Heading color="gray.600">Story not found</Heading>
          <Button colorScheme="blue" onClick={() => router.push('/visualization')}>
            Create a new story
          </Button>
        </VStack>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <VStack spacing={8} align="stretch" maxW="1000px" mx="auto">
        <HStack justify="space-between" flexWrap="wrap" gap={4}>
          <Heading as="h1" size="lg" color="blue.600">
            Your Illustrated Story
          </Heading>
          <Button variant="outline" onClick={() => router.push('/visualization')}>
            Create Another
          </Button>
        </HStack>

        <Box
          bg="white"
          borderRadius="xl"
          borderWidth="1px"
          borderColor="gray.200"
          overflow="hidden"
          shadow="lg"
        >
          {/* Generated Image */}
          <Box position="relative" bg="gray.100">
            <Image
              src={storyData.imageUrl}
              alt="Story illustration"
              w="100%"
              maxH="500px"
              objectFit="contain"
            />
          </Box>

          {/* Story Text */}
          <Box p={8}>
            <VStack align="stretch" spacing={4}>
              <Heading as="h2" size="md" color="gray.700">
                The Story
              </Heading>
              <Text
                fontSize="lg"
                lineHeight="tall"
                color="gray.700"
                whiteSpace="pre-wrap"
              >
                {storyData.story}
              </Text>
              <Text fontSize="sm" color="gray.400" pt={4}>
                Generated on {new Date(storyData.generatedAt).toLocaleString()}
              </Text>
            </VStack>
          </Box>
        </Box>
      </VStack>
    </AppShell>
  );
}
