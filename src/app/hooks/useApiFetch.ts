/**
 * Custom hook for API calls with caching support
 */

import { useState, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';

interface UseApiFetchOptions<T> {
  cacheKey?: string;
  cacheGetter?: (key: string) => T | undefined;
  cacheSetter?: (key: string, data: T) => void;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useApiFetch<T>(
  endpoint: string,
  options: UseApiFetchOptions<T> = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const toast = useToast();

  const fetchData = useCallback(
    async (body: unknown) => {
      setLoading(true);
      setError(null);

      try {
        // Check cache first if provided
        if (options.cacheKey && options.cacheGetter) {
          const cached = options.cacheGetter(options.cacheKey);
          if (cached) {
            console.log('Using cached data');
            setData(cached);
            setLoading(false);
            if (options.onSuccess) {
              options.onSuccess(cached);
            }
            return cached;
          }
        }

        // Fetch from API
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        // Cache the result if provided
        if (options.cacheKey && options.cacheSetter && result) {
          options.cacheSetter(options.cacheKey, result);
        }

        setData(result);
        if (options.onSuccess) {
          options.onSuccess(result);
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        
        if (options.onError) {
          options.onError(error);
        } else {
          toast({
            title: 'Error',
            description: error.message,
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        }

        throw error;
      } finally {
        setLoading(false);
      }
    },
    [endpoint, options, toast]
  );

  return { data, loading, error, fetchData };
}

