'use client';

import Link from 'next/link';
import {
  Box,
  Button,
  Container,
  HStack,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Spinner,
  Text,
} from '@chakra-ui/react';

import { useSession } from '@views/providers/SessionProvider';

export function AppHeader() {
  const { session, isReady, signOut } = useSession();

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

          {!isReady ? (
            <Spinner size="sm" color="white" />
          ) : session ? (
            <Menu>
              <MenuButton
                as={Button}
                variant="ghost"
                color="white"
                fontWeight="semibold"
                maxW="280px"
                _hover={{ bg: 'whiteAlpha.200' }}
              >
                <Text noOfLines={1}>{session.user.name}</Text>
              </MenuButton>
              <MenuList color="gray.800">
                <MenuItem as={Link} href="/dashboard">
                  View Dashboard
                </MenuItem>
                <MenuDivider />
                <MenuItem
                  onClick={async () => {
                    await signOut();
                  }}
                >
                  Sign Out
                </MenuItem>
              </MenuList>
            </Menu>
          ) : (
            <Button as={Link} href="/auth" variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }}>
              Sign In
            </Button>
          )}
        </HStack>
      </Container>
    </Box>
  );
}
