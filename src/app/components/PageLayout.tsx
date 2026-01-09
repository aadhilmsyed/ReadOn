/**
 * Reusable page layout wrapper
 */

import { Box, Container } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { PageHeader } from './PageHeader';
import { AppFooter } from './AppFooter';

interface PageLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  maxW?: string;
}

export function PageLayout({ 
  children, 
  showHeader = true, 
  showFooter = true,
  maxW = "container.lg"
}: PageLayoutProps) {
  return (
    <Box
      minHeight="100vh"
      backgroundImage="radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.05) 1px, transparent 0)"
      backgroundSize="40px 40px"
      display="flex"
      flexDirection="column"
    >
      {showHeader && <PageHeader />}
      
      <Container maxW={maxW} flex="1" pt={8}>
        {children}
      </Container>

      {showFooter && <AppFooter />}
    </Box>
  );
}

