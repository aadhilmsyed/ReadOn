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
} from '@chakra-ui/react';

import { getFeatureDefinition } from '@shared/content/features';
import { AppShell } from '@views/components/AppShell';

export function AudiobookFeaturePage() {
  const feature = getFeatureDefinition('audiobook');
  const router = useRouter();
  const [text, setText] = useState('');

  const readAloud = () => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      return;
    }
    sessionStorage.setItem('audiobook:sourceText', trimmedText);
    router.push('/audiobook/player');
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
            {feature.title}
          </Heading>
          <Text fontSize="md" color="gray.600" lineHeight="tall" maxW="lg" mx="auto">
            {feature.heroDescription}
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
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste or type the section you want read aloud…"
                minH="200px"
                size="md"
                borderColor="gray.200"
                _focus={{ borderColor: 'purple.400', boxShadow: '0 0 0 1px var(--chakra-colors-purple-400)' }}
              />
              <Button
                bgGradient="linear(to-r, blue.500, purple.600)"
                color="white"
                _hover={{ bgGradient: 'linear(to-r, blue.600, purple.700)', opacity: 0.95 }}
                _active={{ opacity: 0.9 }}
                onClick={readAloud}
                isDisabled={!text.trim()}
              >
                Read aloud
              </Button>
            </VStack>
          </Box>
        </Box>
      </VStack>
    </AppShell>
  );
}
