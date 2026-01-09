/**
 * Visualization domain models and types
 */

export interface VisualizationResult {
  segment: string;
  image_data: string;
  segment_type: 'paragraph' | 'sentence';
}

export interface VisualizationRequest {
  text: string;
}

export interface VisualizationResponse {
  results: VisualizationResult[];
}

