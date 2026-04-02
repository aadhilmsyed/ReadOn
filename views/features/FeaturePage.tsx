'use client';

import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Heading,
  Text,
  VStack,
} from '@chakra-ui/react';

import { getFeatureDefinition } from '@shared/content/features';
import type { FeatureKey } from '@shared/types/features';
import { AppShell } from '@views/components/AppShell';

export function FeaturePage({ featureKey }: { featureKey: FeatureKey }) {
  const feature = getFeatureDefinition(featureKey);

  return (
    <AppShell>
      <VStack spacing={8} align="stretch" maxW="900px" mx="auto">
        <VStack spacing={4} align="stretch" textAlign="center">
          <Heading as="h1" size="xl" color="blue.600">
            {feature.title}
          </Heading>
        </VStack>

        <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200" p={10} shadow="sm">
          <VStack align="stretch" spacing={5} textAlign="center">
            <Alert status="info" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>{feature.placeholderTitle}</AlertTitle>
                <AlertDescription>{feature.placeholderDescription}</AlertDescription>
              </Box>
            </Alert>
            <Text fontSize="lg" color="gray.600" lineHeight="tall">
              This feature page is intentionally kept minimal while implementation is under development.
            </Text>
          </VStack>
        </Box>
      </VStack>
    </AppShell>
  );
}
