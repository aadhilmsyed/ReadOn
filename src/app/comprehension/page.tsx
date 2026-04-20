import { Suspense } from 'react';
import { Box, Spinner, Text, VStack } from '@chakra-ui/react';

import { ComprehensionPage } from '@views/features/ComprehensionPage';

function ComprehensionFallback() {
  return (
    <Box py={16} textAlign="center">
      <VStack spacing={3}>
        <Spinner size="lg" color="blue.500" />
        <Text color="gray.600">Loading comprehension…</Text>
      </VStack>
    </Box>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<ComprehensionFallback />}>
      <ComprehensionPage />
    </Suspense>
  );
}
