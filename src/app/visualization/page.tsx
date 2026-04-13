'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Heading,
  Text,
  Textarea,
  VStack,
  Spinner,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { AppShell } from '@views/components/AppShell';

export default function Page() {
  const router = useRouter();
  const [story, setStory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateAndView = async () => {
    if (!story.trim()) return;
    
    setLoading(true);
    setError('');

    try {
      const prompt = `Children's book illustration for this story: ${story.substring(0, 400)}`;
      
      const response = await fetch('http://localhost:3001/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, numImages: 1 }),
      });

      const data = await response.json();

      if (data.success && data.images?.[0]?.url) {
        // Store in sessionStorage and navigate to story view
        sessionStorage.setItem('storyData', JSON.stringify({
          story,
          imageUrl: data.images[0].url,
          requestId: data.requestId,
          generatedAt: new Date().toISOString(),
        }));
        router.push(`/story/${data.requestId}`);
      } else {
        setError(data.error?.message || 'Failed to generate image');
      }
    } catch (err) {
      setError('Failed to connect to image generation service. Make sure the microservice is running on port 3001.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <VStack spacing={8} align="stretch" maxW="800px" mx="auto">
        <VStack spacing={2} textAlign="center">
          <Heading as="h1" size="xl" color="blue.600">
            Story Visualization
          </Heading>
          <Text color="gray.600">
            Paste your story below and we&apos;ll generate an illustration for it
          </Text>
        </VStack>

        <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200" p={6} shadow="sm">
          <VStack spacing={4} align="stretch">
            <Textarea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="Once upon a time, in a magical forest, there lived a friendly dragon who loved to read books..."
              minH="200px"
              fontSize="md"
              resize="vertical"
            />

            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {error}
              </Alert>
            )}

            <Button
              colorScheme="blue"
              size="lg"
              onClick={generateAndView}
              isLoading={loading}
              loadingText="Generating illustration..."
              isDisabled={!story.trim() || loading}
            >
              {loading ? <Spinner /> : 'Generate & View Story'}
            </Button>

            {loading && (
              <Text textAlign="center" color="gray.500" fontSize="sm">
                This may take 10-20 seconds...
              </Text>
            )}
          </VStack>
        </Box>
      </VStack>
    </AppShell>
  );
}
