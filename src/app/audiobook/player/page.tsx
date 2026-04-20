import { Suspense } from 'react';
import { Box, Spinner, Text, VStack } from '@chakra-ui/react';

import { AudiobookPlaybackPage } from '@views/features/AudiobookPlaybackPage';

function PlayerFallback() {
  return (
    <Box py={16} textAlign="center">
      <VStack spacing={3}>
        <Spinner size="lg" color="purple.500" />
        <Text color="gray.600">Loading player…</Text>
      </VStack>
    </Box>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<PlayerFallback />}>
      <AudiobookPlaybackPage />
    </Suspense>
  );
}
