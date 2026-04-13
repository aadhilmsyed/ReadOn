export interface GenerateImageRequestDTO {
  storyId?: string;
  userId?: string;
  prompt: string;
  style?: string;
  theme?: string;
  ageGroup?: string;
  numImages?: number;
}

export interface GeneratedImageDTO {
  url: string;
  provider: string;
  storageKey?: string;
}

export interface GenerateImageResponseDTO {
  success: boolean;
  requestId: string;
  storyId?: string;
  status: string;
  images?: GeneratedImageDTO[];
  cached: boolean;
  error?: {
    code: string;
    message: string;
  };
}

export interface GetStatusResponseDTO {
  success: boolean;
  requestId: string;
  storyId?: string;
  userId?: string;
  prompt: string;
  status: string;
  images?: GeneratedImageDTO[];
  cached: boolean;
  createdAt: Date;
  updatedAt: Date;
  errorMessage?: string;
}
