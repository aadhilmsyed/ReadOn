/**
 * Reusable footer component
 */

import { Box, Container, VStack, Text, Button } from '@chakra-ui/react';
import Link from 'next/link';
import { FaHome } from 'react-icons/fa';

export function AppFooter() {
  return (
    <Box
      py={4}
      bgGradient="linear(to-r, blue.500, purple.600)"
      borderTop="1px"
      borderColor="blue.300"
      backdropFilter="blur(8px)"
      boxShadow="0 -4px 6px -1px rgba(0, 0, 0, 0.1)"
      zIndex={10}
    >
      <Container maxW="container.xl">
        <VStack spacing={2}>
          <Link href="/" passHref>
            <Button
              leftIcon={<FaHome />}
              variant="ghost"
              color="white"
              size="lg"
              _hover={{
                bg: "whiteAlpha.200",
                transform: "translateY(-2px)"
              }}
              transition="all 0.2s"
            >
              Back to Home
            </Button>
          </Link>
          <Text
            textAlign="center"
            fontSize="sm"
            color="white"
            fontWeight="medium"
          >
            © {new Date().getFullYear()} Read On. Created by Aadhil Mubarak Syed. All rights reserved.
          </Text>
        </VStack>
      </Container>
    </Box>
  );
}

