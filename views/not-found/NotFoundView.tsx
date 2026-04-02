import Link from 'next/link';
import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react';

import { AppShell } from '@views/components/AppShell';

export default function NotFoundView() {
  return (
    <AppShell>
      <VStack spacing={6} minH="50vh" justify="center" textAlign="center">
        <Heading as="h1" size="xl" color="blue.600">
          Page Not Found
        </Heading>
        <Text color="gray.600" maxW="2xl">
          The page you requested is unavailable. Use the main navigation to return to the learning experience.
        </Text>
        <Box>
          <Button as={Link} href="/" colorScheme="blue">
            Return Home
          </Button>
        </Box>
      </VStack>
    </AppShell>
  );
}
