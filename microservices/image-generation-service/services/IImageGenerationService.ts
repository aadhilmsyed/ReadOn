import { GenerateImageRequestDTO, GenerateImageResponseDTO } from '../types/dtos';

export interface IImageGenerationService {
  generateImage(request: GenerateImageRequestDTO): Promise<GenerateImageResponseDTO>;
  getGenerationStatus(requestId: string): Promise<GenerateImageResponseDTO>;
}
