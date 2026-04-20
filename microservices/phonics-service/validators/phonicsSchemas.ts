import { z } from 'zod';

export const processPhonicsBodySchema = z.object({
  storyId: z.string().min(1, 'storyId is required'),
  storyText: z.string().min(1, 'storyText is required'),
});

export type ProcessPhonicsBodyParsed = z.infer<typeof processPhonicsBodySchema>;
