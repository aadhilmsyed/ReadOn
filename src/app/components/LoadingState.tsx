/**
 * Reusable loading state component
 */

import { Box, VStack, Spinner, Text, Container } from '@chakra-ui/react';
import { PageHeader } from './PageHeader';
import { AppFooter } from './AppFooter';

interface LoadingStateProps {
  message?: string;
  subMessage?: string;
}

export function LoadingState({ 
  message = "Loading...", 
  subMessage 
}: LoadingStateProps) {
  return (
    <Box
      minHeight="100vh"
      display="flex"
      flexDirection="column"
      backgroundImage="radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.05) 1px, transparent 0)"
      backgroundSize="40px 40px"
      position="relative"
    >
      <PageHeader />

      <Box flex="1" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text fontSize="lg" color="gray.600">{message}</Text>
          {subMessage && (
            <Text fontSize="md" color="gray.500">{subMessage}</Text>
          )}
        </VStack>
      </Box>

      <AppFooter />
    </Box>
  );
}

