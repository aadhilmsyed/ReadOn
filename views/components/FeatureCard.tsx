import Link from 'next/link';
import { Button, Icon, Text, VStack } from '@chakra-ui/react';
import type { IconType } from 'react-icons';

export function FeatureCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: IconType;
}) {
  return (
    <Button
      as={Link}
      href={href}
      height="auto"
      p={8}
      colorScheme="blue"
      variant="outline"
      width="100%"
      minH="220px"
      whiteSpace="normal"
      textAlign="center"
      display="flex"
      alignItems="center"
      justifyContent="center"
      transition="all 0.3s ease"
      _hover={{ transform: 'translateY(-4px)', shadow: 'xl', bg: 'blue.50' }}
    >
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
