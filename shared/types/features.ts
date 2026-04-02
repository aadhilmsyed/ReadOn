export type FeatureKey = 'phonics' | 'comprehension' | 'visualization' | 'audiobook';

export interface FeatureDefinition {
  key: FeatureKey;
  route: `/${FeatureKey}`;
  title: string;
  shortDescription: string;
  heroDescription: string;
  placeholderTitle: string;
  placeholderDescription: string;
  sampleOutputs: string[];
  ctaLabel: string;
}
