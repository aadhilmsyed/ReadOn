import type { IImageProvider } from '../clients/IImageProvider';
import type { ImageProviderRequest, ImageProviderResponse } from '../clients/IImageProvider';

export type { ImageProviderRequest as ExternalImageRequest, ImageProviderResponse as ExternalImageResponse };

/** @deprecated Use OpenAIImageClient from ./OpenAIImageClient */
export { OpenAIImageClient as ExternalAIImageClient } from './OpenAIImageClient';
export type { IImageProvider };
