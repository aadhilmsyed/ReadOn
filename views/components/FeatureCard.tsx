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
  /** When set, click is handled here instead of navigating to `href`. */
  onNavigate?: () => void;
}) {
  const shared = {
    height: 'auto' as const,
    p: 8,
    colorScheme: 'blue' as const,
    variant: 'outline' as const,
    width: '100%',
    minH: '220px',
    whiteSpace: 'normal' as const,
    textAlign: 'center' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    _hover: { transform: 'translateY(-4px)', shadow: 'xl', bg: 'blue.50' },
  };

  const inner = (
    <VStack spacing={4} align="center" width="100%">
      <Icon as={icon} boxSize={8} color="blue.500" />
      <Text fontSize="2xl" fontWeight="bold" textAlign="center" whiteSpace="normal">
        {title}
      </Text>
      <Text fontSize="md" textAlign="center" color="gray.600" lineHeight="tall" whiteSpace="normal">
        {description}
      </Text>
    </VStack>
  );

  if (onNavigate) {
    return (
      <Button type="button" onClick={onNavigate} {...shared}>
        {inner}
      </Button>
    );
  }

  return (
    <Button as={Link} href={href} {...shared}>
      {inner}
    </Button>
  );
}
