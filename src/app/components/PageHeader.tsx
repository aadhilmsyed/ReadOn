/**
 * Reusable page header component with Read On branding
 */

import { Heading, Text, VStack, Container } from '@chakra-ui/react';
import Link from 'next/link';

export function PageHeader() {
  return (
    <Container maxW="container.lg" mt={8}>
      <VStack spacing={8}>
        <Link href="/" passHref>
          <Heading
            as="h1"
            size="2xl"
            textAlign="center"
            bgGradient="linear(to-r, blue.400, purple.500, pink.500)"
            bgClip="text"
            fontWeight="extrabold"
            letterSpacing="tight"
            _hover={{
              bgGradient: "linear(to-r, blue.500, purple.600, pink.600)",
              cursor: "pointer",
              transform: "translateY(-2px)"
            }}
            transition="all 0.3s ease"
            mb={4}
          >
            Read On
          </Heading>
        </Link>
        <Text
          fontSize="xl"
          textAlign="center"
          maxWidth="800px"
          mx="auto"
          color="gray.600"
          lineHeight="tall"
        >
          Your AI-Powered Reading Companion
        </Text>
      </VStack>
    </Container>
  );
}

