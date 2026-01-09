/**
 * Custom hook for character limit validation
 */

import { useMemo, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import { CHARACTER_LIMIT } from '../constants';

const DEFAULT_LIMIT = CHARACTER_LIMIT;

export function useCharacterLimit(
  text: string,
  limit: number = DEFAULT_LIMIT
) {
  const toast = useToast();

  const isOverLimit = useMemo(() => text.length > limit, [text, limit]);

  const showLimitError = useCallback(() => {
    toast({
      title: 'Text Too Long',
      description: `Please shorten your text to ${limit} characters or less before proceeding.`,
      status: 'error',
      duration: 5000,
      isClosable: true,
      position: 'top',
    });
  }, [limit, toast]);

  return {
    isOverLimit,
    showLimitError,
    remaining: limit - text.length,
    percentage: (text.length / limit) * 100,
  };
}

