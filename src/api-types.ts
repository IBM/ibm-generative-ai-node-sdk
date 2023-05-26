/* eslint-disable @typescript-eslint/no-explicit-any */

import { z } from 'zod';

export interface ErrorExtensions {
  code: string;
  reason?: string;
  state?: Record<string, any>;
}

export interface ErrorResponse {
  status_code: number;
  error: string;
  message: string;
  extensions?: ErrorExtensions;
}

// USER

export interface UserOutput {
  results: {
    firstName?: string;
    lastName?: string;
    tou_accepted: boolean;
    tou_accepted_at?: string;
    generate_default?: {
      model_id: string;
      parameters: Record<string, any>;
    };
    data_usage_consent: boolean;
  };
}

export const UserGenerateDefaultInputSchema = z.object({
  model_id: z.string(),
  parameters: z.optional(z.record(z.any())),
});

export type UserGenerateDefaultInput = z.infer<
  typeof UserGenerateDefaultInputSchema
>;

export interface UserGenerateDefaultOutput {
  results: {
    generate_default?: {
      model_id: string;
      parameters: Record<string, any>;
    };
  };
}

// GENERATE

export const GenerateInputSchema = z.object({
  model_id: z.string(),
  inputs: z.array(z.string()),
  parameters: z.optional(z.record(z.any())),
  use_default: z.optional(z.boolean()),
});

export type GenerateInput = z.infer<typeof GenerateInputSchema>;

export type GenerateStopReason =
  | 'NOT_FINISHED'
  | 'MAX_TOKENS'
  | 'EOS_TOKEN'
  | 'CANCELLED'
  | 'TIME_LIMIT'
  | 'STOP_SEQUENCE'
  | 'TOKEN_LIMIT'
  | 'ERROR';

export interface GenerateResult {
  generated_text: string;
  generated_token_count: number;
  input_token_count: number;
  stop_reason: GenerateStopReason;
  [x: string]: any;
}

export interface GenerateOutput {
  model_id: string;
  created_at: string;
  results: GenerateResult[];
}

export interface GenerateLimitsOutput {
  tokenCapacity: number;
  tokensUsed: number;
}

export const GenerateConfigInputSchema = z.object({
  model_id: z.optional(z.string()),
  parameters: z.optional(z.record(z.any())),
});

export type GenerateConfigInput = z.infer<typeof GenerateConfigInputSchema>;

export interface GenerateConfigOutput {
  model_id?: string;
  parameters?: Record<string, any>;
}

export const TokenizeInputSchema = z.object({
  model_id: z.string(),
  inputs: z.array(z.string()),
  parameters: z.optional(z.object({ return_tokens: z.optional(z.boolean()) })),
});

export type TokenizeInput = z.infer<typeof TokenizeInputSchema>;

export interface TokenizeResult {
  token_count: number;
  tokens?: string[];
}

export interface TokenizeOutput {
  model_id: string;
  created_at: string;
  results: TokenizeResult[];
}

export const RequestsInputSchema = z.object({
  limit: z.optional(z.number()),
  offset: z.optional(z.number()),
  status: z.optional(z.enum(['SUCCESS', 'ERROR'])),
  origin: z.optional(z.enum(['API', 'UI'])),
});

export type RequestsInput = z.infer<typeof RequestsInputSchema>;

export interface RequestSuccessResult {
  status: 'SUCCESS';
  id: string;
  created_at: string;
  duration: number;
  request: GenerateInput;
  response: GenerateOutput | null;
}

export interface RequestsErrorResult {
  status: 'ERROR';
  id: string;
  created_at: string;
  duration: number;
  request: GenerateInput;
  response: Record<string, any> | null;
}

export type RequestsResult = RequestSuccessResult | RequestsErrorResult;

export interface RequestsOutput {
  totalCount: number;
  results: RequestsResult[];
}

export interface AcceptTouOutput {
  results: {
    tou_accepted: boolean;
    tou_accepted_at: string;
  };
}

// MODELS

export interface ModelsOutput {
  results: {
    id: string;
    name: string;
    size: string;
    token_limit: number;
  }[];
}

type ModelSchema = { id: number; value: any };

export interface ModelOutput {
  results: {
    id: string;
    name: string;
    size: string;
    description: string;
    token_limit: number;
    tags: string[];
    source_model_id: string | null;
    tasks: {
      id: string;
      name: string;
      json_example: string;
      jsonl_example: string;
    }[];
    model_family: {
      id: number;
      name: string;
      short_description?: string;
      description?: string;
    };
    schema_generate: ModelSchema[];
    schema_tokenize: ModelSchema[];
  };
}