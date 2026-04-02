'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Heading,
  HStack,
  ListItem,
  SimpleGrid,
  Spinner,
  Text,
  UnorderedList,
  VStack,
} from '@chakra-ui/react';

import { getDashboardSnapshot } from '@orchestrators/dashboard/dashboardOrchestrator';
import { AppShell } from '@views/components/AppShell';
import { useSession } from '@views/providers/SessionProvider';

export default function DashboardPage() {
  const router = useRouter();
  const { isReady, session } = useSession();
  const snapshot = getDashboardSnapshot();

  useEffect(() => {
    if (isReady && !session) {
      router.replace('/auth');
    }
  }, [isReady, router, session]);

  if (!isReady) {
    return (
      <AppShell>
        <VStack py={20} spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text color="gray.600">Checking session state...</Text>
        </VStack>
      </AppShell>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <AppShell>
      <VStack spacing={8} align="stretch">
        <HStack justify="space-between" flexWrap="wrap" gap={4}>
          <Box>
            <Heading as="h1" size="lg" color="blue.600">
              Welcome back, {session.user.name}
            </Heading>
            <Text color="gray.600">Mock session token: {session.token}</Text>
          </Box>
          <Button colorScheme="purple" variant="outline" onClick={() => router.push('/phonics')}>
            Explore Feature Pages
          </Button>
        </HStack>

        <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6}>
          <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200" p={6} shadow="sm">
            <VStack align="stretch" spacing={3}>
              <Heading as="h2" size="md" color="blue.600">
                Profile Card
              </Heading>
              <Text fontWeight="semibold">{snapshot.profile.name}</Text>
              <Text color="gray.600">{snapshot.profile.email}</Text>
              <Text color="gray.600" lineHeight="tall">{snapshot.profile.readingGoal}</Text>
            </VStack>
          </Box>

          <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200" p={6} shadow="sm">
            <VStack align="stretch" spacing={3}>
              <Heading as="h2" size="md" color="blue.600">
                Saved Generations / History
              </Heading>
              <UnorderedList spacing={3} ml={5}>
                {snapshot.history.map((item) => (
                  <ListItem key={item.title}>
                    <Text fontWeight="semibold">{item.title}</Text>
                    <Text color="gray.600">{item.detail}</Text>
                  </ListItem>
                ))}
              </UnorderedList>
            </VStack>
          </Box>

          <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200" p={6} shadow="sm">
            <VStack align="stretch" spacing={3}>
              <Heading as="h2" size="md" color="blue.600">
                Subscriptions / Credits Area
              </Heading>
              <Text fontWeight="semibold">{snapshot.subscription.plan}</Text>
              <Text color="gray.600">{snapshot.subscription.creditsLabel}</Text>
              <Text color="gray.600" lineHeight="tall">{snapshot.subscription.note}</Text>
            </VStack>
          </Box>
        </SimpleGrid>
      </VStack>
    </AppShell>
  );
}
