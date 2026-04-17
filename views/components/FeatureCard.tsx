import Link from 'next/link';
import { Button, Icon, Text, VStack } from '@chakra-ui/react';
import type { IconType } from 'react-icons';

export function FeatureCard({
  href,
  title,
  description,
  icon,
  onNavigate,
}: {
  href: string;
  title: string;
  description: string;
  icon: IconType;
  /** When set, navigation is handled in JS (e.g. stash text then route). */
  onNavigate?: () => void | Promise<void>;
}) {
  const common = {
    height: 'auto' as const,
    p: 8,
    colorScheme: 'blue' as const,
    variant: 'outline' as const,
    width: '100%' as const,
    minH: '220px',
    whiteSpace: 'normal' as const,
    textAlign: 'center' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    _hover: { transform: 'translateY(-4px)', shadow: 'xl', bg: 'blue.50' },
  };

  if (onNavigate) {
    return (
      <Button type="button" onClick={onNavigate} {...common}>
        <VStack spacing={4} align="center" width="100%">
          <Icon as={icon} boxSize={8} color="blue.500" />
          <Text fontSize="2xl" fontWeight="bold" textAlign="center" whiteSpace="normal">
            {title}
          </Text>
          <Text fontSize="md" textAlign="center" color="gray.600" lineHeight="tall" whiteSpace="normal">
            {description}
          </Text>
        </VStack>
      </Button>
    );
  }

  return (
    <Button as={Link} href={href} {...common}>
      <VStack spacing={4} align="center" width="100%">
        <Icon as={icon} boxSize={8} color="blue.500" />
        <Text fontSize="2xl" fontWeight="bold" textAlign="center" whiteSpace="normal">
          {title}
        </Text>
        <Text fontSize="md" textAlign="center" color="gray.600" lineHeight="tall" whiteSpace="normal">
          {description}
        </Text>
      </VStack>
    </Button>
  );
}
