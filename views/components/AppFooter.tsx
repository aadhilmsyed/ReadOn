import Link from 'next/link';
import { Box, Button, Container, HStack, Text, VStack } from '@chakra-ui/react';
import { FaGithub } from 'react-icons/fa';

export function AppFooter() {
  return (
    <Box
      as="footer"
      mt="auto"
      py={5}
      bgGradient="linear(to-r, blue.500, purple.600)"
      borderTop="1px"
      borderColor="blue.300"
      boxShadow="0 -4px 6px -1px rgba(0, 0, 0, 0.1)"
    >
      <Container maxW="container.xl">
        <VStack spacing={2}>
          <HStack spacing={3} flexWrap="wrap" justify="center">
            <Button
              as={Link}
              href="https://github.com/AsadShahid04/ReadOn"
              target="_blank"
              rel="noopener noreferrer"
              leftIcon={<FaGithub />}
              variant="ghost"
              color="white"
              _hover={{ bg: 'whiteAlpha.200' }}
            >
              Repository
            </Button>
          </HStack>
          <Text textAlign="center" fontSize="sm" color="white" fontWeight="medium">
            © {new Date().getFullYear()} Read On. All Rights Reserved.
          </Text>
        </VStack>
      </Container>
    </Box>
  );
}
