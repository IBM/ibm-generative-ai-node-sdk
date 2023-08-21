export const CacheDiscriminator = {
  GENERATE_CONFIG: 'generate-config',
  TUNE: 'tune',
  PROMPT_TEMPLATE: 'prompt-template',
  FILE: 'file',
  MODEL: 'model',
  MODELS: 'models',
} as const;

export type CacheDiscriminator =
  (typeof CacheDiscriminator)[keyof typeof CacheDiscriminator];

export function generateCacheKey(discriminator: CacheDiscriminator, id = '') {
  return `${discriminator}#${id}`;
}
