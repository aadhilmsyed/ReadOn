import { FaBook, FaHeadphones, FaImages, FaMicrophone } from 'react-icons/fa';
import type { IconType } from 'react-icons';

import type { FeatureDefinition, FeatureKey } from '../types/features';

export interface FeatureCardDefinition extends FeatureDefinition {
  icon: IconType;
}

export const featureDefinitions: FeatureCardDefinition[] = [
  {
    key: 'phonics',
    route: '/phonics',
    title: 'Phonics Practice',
    shortDescription: 'Break down pronunciation, vocabulary, and word recognition in a guided flow.',
    heroDescription:
      'Use pronunciation cards, decoding prompts, and mock listening support to shape a future phonics coaching experience.',
    placeholderTitle: 'Pronunciation support will connect here',
    placeholderDescription:
      'Future service integrations can analyze difficult words, surface phonetic hints, and provide guided audio assistance.',
    sampleOutputs: [
      'Difficult-word spotlight cards',
      'Pronunciation practice queue',
      'Vocabulary review summary',
    ],
    ctaLabel: 'Run Phonics Stub',
    icon: FaMicrophone,
  },
  {
    key: 'comprehension',
    route: '/comprehension',
    title: 'Reading Comprehension',
    shortDescription: 'Preview how quizzes, checks for understanding, and progress feedback can fit the product.',
    heroDescription:
      'This static page keeps the future quiz workflow visible while backend generation, scoring, and persistence remain intentionally unimplemented.',
    placeholderTitle: 'Question generation is intentionally pending',
    placeholderDescription:
      'Future orchestrators can coordinate reading analysis, question creation, scoring, and saved progress through backend services.',
    sampleOutputs: [
      'Question set preview',
      'Answer feedback panel',
      'Progress and mastery summary',
    ],
    ctaLabel: 'Run Comprehension Stub',
    icon: FaBook,
  },
  {
    key: 'visualization',
    route: '/visualization',
    title: 'Visualization',
    shortDescription: 'Show where story scenes, concept art, and visual reading supports will be wired in later.',
    heroDescription:
      'The page remains navigable with static illustration placeholders so teammates can connect future image-generation workflows without changing the view layer.',
    placeholderTitle: 'Visualization generation belongs behind services',
    placeholderDescription:
      'Later implementations can call orchestrators that request scene generation, store assets, and manage retrieval for dashboards and history.',
    sampleOutputs: [
      'Scene-by-scene illustration cards',
      'Concept board placeholders',
      'Saved generation gallery preview',
    ],
    ctaLabel: 'Run Visualization Stub',
    icon: FaImages,
  },
  {
    key: 'audiobook',
    route: '/audiobook',
    title: 'Audiobook',
    shortDescription: 'Retain the listening experience layout for future narration, playback, and follow-along support.',
    heroDescription:
      'Playback controls and progress visuals stay in place for demos while text-to-speech generation and audio delivery remain intentionally unimplemented.',
    placeholderTitle: 'Narration infrastructure will plug in later',
    placeholderDescription:
      'Future services can generate audio, stream it securely, track playback, and store narration assets without changing this route structure.',
    sampleOutputs: [
      'Playback queue preview',
      'Narration timeline placeholder',
      'Listening history and saved audio card',
    ],
    ctaLabel: 'Run Audiobook Stub',
    icon: FaHeadphones,
  },
];

export function getFeatureDefinition(featureKey: FeatureKey): FeatureCardDefinition {
  const feature = featureDefinitions.find((entry) => entry.key === featureKey);

  if (!feature) {
    throw new Error(`Unknown feature: ${featureKey}`);
  }

  return feature;
}
