/**
 * Feature configuration and metadata
 */

import { FaMicrophone, FaBook, FaImages, FaHeadphones, FaGraduationCap } from 'react-icons/fa';
import { ROUTES } from '../constants';

export interface FeatureConfig {
  route: string;
  title: string;
  description: string;
  icon: typeof FaMicrophone;
  enabled: boolean;
  maintenanceMessage?: string;
}

export const FEATURES: Record<string, FeatureConfig> = {
  phonics: {
    route: ROUTES.PHONICS,
    title: 'Phonics Practice',
    description: 'Enhance phonetic awareness and word-building skills',
    icon: FaMicrophone,
    enabled: true,
  },
  comprehension: {
    route: ROUTES.COMPREHENSION,
    title: 'Reading Comprehension',
    description: 'Analyze texts and improve understanding of written content',
    icon: FaBook,
    enabled: true,
  },
  visualization: {
    route: ROUTES.VISUALIZATION,
    title: 'Word Visualization',
    description: 'Explore visual representations of words and their relationships',
    icon: FaImages,
    enabled: true,
  },
  audiobook: {
    route: ROUTES.AUDIOBOOK,
    title: 'Read Aloud',
    description: 'Listen to your text being read aloud',
    icon: FaHeadphones,
    enabled: false,
    maintenanceMessage: 'This feature is currently undergoing maintenance. Please check back later.',
  },
  interactive: {
    route: ROUTES.INTERACTIVE,
    title: 'Interactive Learning',
    description: 'Experience comprehensive learning with all features combined - phonics, comprehension, visualization, and audio in one seamless experience',
    icon: FaGraduationCap,
    enabled: true,
  },
} as const;

