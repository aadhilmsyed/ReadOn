'use client';

import Link from 'next/link';
import { Box, Button, Container, HStack } from '@chakra-ui/react';

export function AppHeader() {

  return (
    <Box as="header" bgGradient="linear(to-r, blue.500, purple.600)" py={4} boxShadow="sm">
      <Container maxW="container.xl">
        <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
          <HStack gap={3} flexWrap="wrap">
            <Button as={Link} href="/" variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }}>
              Home
            </Button>
            <Button as={Link} href="/dashboard" variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }}>
              Dashboard
            </Button>
          </HStack>
          <Button as={Link} href="/auth" variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }}>
            Sign In
          </Button>
        </HStack>
      </Container>
    </Box>
  );
}
