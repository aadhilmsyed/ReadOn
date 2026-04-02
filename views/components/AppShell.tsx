import { Box, Container } from '@chakra-ui/react';

import { AppFooter } from './AppFooter';
import { AppHeader } from './AppHeader';

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box
      minHeight="100vh"
      bg="gray.50"
      color="gray.800"
      backgroundImage="radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.05) 1px, transparent 0)"
      backgroundSize="40px 40px"
      display="flex"
      flexDirection="column"
    >
      <AppHeader />
      <Container maxW="container.xl" pb={10} pt={10} flex="1">
        {children}
      </Container>
      <AppFooter />
    </Box>
  );
}
