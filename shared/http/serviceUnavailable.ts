/** Developer-facing hints when a local microservice is down or misconfigured. */

export const LOCAL_SERVICE_URLS = {
  phonics: 'http://127.0.0.1:3001',
  comprehension: 'http://127.0.0.1:3002',
  imageGeneration: 'http://127.0.0.1:3003',
  audiobook: 'http://127.0.0.1:3004',
  dashboard: 'http://127.0.0.1:3005',
} as const;

export const START_COMMANDS = {
  phonics: 'cd microservices/phonics-service && npm run dev',
  comprehension: 'cd microservices/comprehension-service && npm run dev',
  imageGeneration: 'cd microservices/image-generation-service && npm run dev',
  audiobook: 'cd microservices/audiobook-service && npm run dev',
  dashboard: 'cd microservices/dashboard-service && npm run dev',
} as const;

export function serviceDownMessage(
  label: string,
  expectedUrl: string,
  startCommand: string,
  cause?: string,
): string {
  const tail = cause ? ` (${cause})` : '';
  return `${label} is not reachable at ${expectedUrl}. Start it with: ${startCommand}${tail}`;
}
