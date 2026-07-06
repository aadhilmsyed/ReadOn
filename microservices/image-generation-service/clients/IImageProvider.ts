export interface ImageProviderRequest {
  prompt: string;
  style?: string;
  numImages: number;
}

export interface ImageProviderResponse {
  images: Array<{
    url?: string;
    base64?: string;
    storageKey?: string;
  }>;
  provider: string;
}

export interface IImageProvider {
  generateImages(request: ImageProviderRequest): Promise<ImageProviderResponse>;
}
