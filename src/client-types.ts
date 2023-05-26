import { z } from 'zod';
import * as ApiTypes from './api-types.js';

// GENERAL

export interface HttpHandlerOptions {
  timeout?: number;
  signal?: AbortSignal;
  retries?: number;
}

export type HttpHandlerNoStreamOptions = HttpHandlerOptions & {
  stream?: false;
};
export type HttpHandlerStreamOptions = HttpHandlerOptions & { stream: true };

// GENERATE

export const GenerateInputSchema = ApiTypes.GenerateInputSchema.omit({
  inputs: true,
  use_default: true,
}).extend({ input: z.string() });
export type GenerateInput = z.infer<typeof GenerateInputSchema>;
export type GenerateOutput = ApiTypes.GenerateOutput['results'][number];

export const GenerateConfigInputSchema = ApiTypes.GenerateConfigInputSchema;
export type GenerateConfigInput = z.infer<typeof GenerateConfigInputSchema>;
export type GenerateConfigOutput = ApiTypes.GenerateConfigOutput;

export type GenerateConfigOptions = HttpHandlerOptions & { reset?: boolean };
export type GenerateConfigInputOptions = HttpHandlerOptions & {
  strategy: 'merge' | 'replace';
};

export const GenerateLimitsInputSchema = z.never();
export type GenerateLimitsInput = z.infer<typeof GenerateLimitsInputSchema>;
export type GenerateLimitsOutput = ApiTypes.GenerateLimitsOutput;

// TOKENIZE

export const TokenizeInputSchema = ApiTypes.TokenizeInputSchema.omit({
  inputs: true,
}).extend({ input: z.string() });
export type TokenizeInput = z.infer<typeof TokenizeInputSchema>;
export type TokenizeOutput = ApiTypes.TokenizeOutput['results'][number];

// MODELS

export const ModelsInputSchema = z.never();
export type ModelsInput = z.infer<typeof ModelsInputSchema>;
export type ModelsOutput = ApiTypes.ModelsOutput['results'];

export const ModelInputSchema = z.object({ id: z.string() });
export type ModelInput = z.infer<typeof ModelInputSchema>;
export type ModelOutput = ApiTypes.ModelOutput['results'];