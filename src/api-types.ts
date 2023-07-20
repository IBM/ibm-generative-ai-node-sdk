/* eslint-disable @typescript-eslint/no-explicit-any */

import { z } from 'zod';
import type FormData from 'form-data';

// COMMON

const PaginationOutputSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  results: z.array(z.any()),
});

// ERRORS

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
  model_id: z.string().nullish(),
  prompt_id: z.string().nullish(),
  inputs: z.array(z.string()),
  parameters: z.optional(z.record(z.any())),
  use_default: z.optional(z.boolean()),
});
export type GenerateInput = z.infer<typeof GenerateInputSchema>;

export const GenerateStopReasonSchema = z.enum([
  'NOT_FINISHED',
  'MAX_TOKENS',
  'EOS_TOKEN',
  'CANCELLED',
  'TIME_LIMIT',
  'STOP_SEQUENCE',
  'TOKEN_LIMIT',
  'ERROR',
]);
export type GenerateStopReason = z.infer<typeof GenerateStopReasonSchema>;

export const GenerateResultSchema = z
  .object({
    generated_text: z.string(),
    generated_token_count: z.number().int().min(0),
    input_token_count: z.number().int().min(0),
    stop_reason: GenerateStopReasonSchema,
  })
  .passthrough();
export type GenerateResult = z.infer<typeof GenerateResultSchema>;

export const GenerateOutputSchema = z.object({
  model_id: z.string(),
  created_at: z.coerce.date(),
  results: z.array(GenerateResultSchema),
});
export type GenerateOutput = z.infer<typeof GenerateOutputSchema>;

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
  model_id: z.string().nullish(),
  inputs: z.array(z.string()),
  use_default: z.optional(z.boolean()),
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
    schema_generate: ModelSchema;
    schema_tokenize: ModelSchema;
  };
}

// TUNES

export const TuneStatusSchema = z.enum([
  'INITIALIZING',
  'NOT_STARTED',
  'PENDING',
  'HALTED',
  'RUNNING',
  'QUEUED',
  'COMPLETED',
  'FAILED',
]);
export type TuneStatus = z.infer<typeof TuneStatusSchema>;

interface TuneFile {
  id: string;
  file_name: string;
  created_at: string;
}

interface TuneMixin {
  id: string;
  name: string;
  model_id: string;
  method_id: string;
  model_name: string;
  status: TuneStatus;
  task_id: string;
  parameters: {
    batch_size: number;
    num_epochs: number;
  };
  created_at: string;
}

export interface TunesOuput {
  results: TuneMixin[];
  totalCount: number;
}

export const TuneInputSchema = z.object({
  name: z.string(),
  model_id: z.string(),
  task_id: z.string(),
  training_file_ids: z.array(z.string()),
  validation_file_ids: z.array(z.string()).nullish(),
  evaluation_file_ids: z.array(z.string()).nullish(),
  method_id: z.string(),
  parameters: z.record(z.any()).nullish(),
});
export type TuneInput = z.input<typeof TuneInputSchema>;
export interface TuneOutput {
  results: TuneMixin & {
    validation_files?: TuneFile[];
    training_files?: TuneFile[];
    evaluation_files?: TuneFile[];
    datapoints?: {
      loss: {
        data: any;
        timestamp: string;
      }[];
    };
  };
}

export interface TuneMethodsOutput {
  results: { id: string; name: string }[];
}

// PROMPT TEMPLATES

export const PromptTemplateInputSchema = z
  .object({
    id: z.string(),
  })
  .strict();

export type PromptTemplateInput = z.output<typeof PromptTemplateInputSchema>;

export const PromptTemplateCreateInputSchema = z
  .object({
    name: z.string(),
    value: z.string(),
  })
  .strict();

export type PromptTemplateCreateInput = z.input<
  typeof PromptTemplateCreateInputSchema
>;

export const PromptTemplateUpdateInputSchema = PromptTemplateCreateInputSchema;
export type PromptTemplateUpdate = z.input<
  typeof PromptTemplateUpdateInputSchema
>;

const SinglePromptTemplateOutputSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    value: z.string(),
    created_at: z.coerce.date(),
  })
  .passthrough();

export const PromptTemplateOutputSchema = z.object({
  results: SinglePromptTemplateOutputSchema,
});
export type PromptTemplateOutput = z.infer<typeof PromptTemplateOutputSchema>;

export const PromptTemplatesOutputSchema = PaginationOutputSchema.extend({
  results: z.array(SinglePromptTemplateOutputSchema),
}).passthrough();
export type PromptTemplatesOutput = z.infer<typeof PromptTemplatesOutputSchema>;

export const PromptTemplateExecuteInputSchema = z.object({
  inputs: z.array(z.string()),
  template: z.union([
    z.object({ id: z.string() }),
    z.object({
      value: z.string(),
      data: z.object({}).passthrough(),
    }),
  ]),
});
export type PromptTemplateExecuteInput = z.input<
  typeof PromptTemplateExecuteInputSchema
>;

export const PromptTemplateExecuteOutputSchema = z.object({
  results: z.array(z.string()),
});
export type PromptTemplateExecuteOutput = z.infer<
  typeof PromptTemplateExecuteOutputSchema
>;

// HISTORY

export const HistoryStatusSchema = z.enum(['SUCCESS', 'ERROR']);
export type HistoryStatus = z.infer<typeof HistoryStatusSchema>;

export const HistoryOriginSchema = z.enum(['API', 'UI']);
export type HistoryOrigin = z.infer<typeof HistoryOriginSchema>;

export const HistoryInputSchema = z
  .object({
    status: HistoryStatusSchema,
    origin: HistoryOriginSchema,
  })
  .partial();
export type HistoryInput = z.input<typeof HistoryInputSchema>;

export const HistoryOutputSchema = PaginationOutputSchema.extend({
  results: z.array(
    z.object({
      id: z.string(),
      duration: z.number().int().min(0),
      request: GenerateInputSchema.partial(),
      status: HistoryInputSchema.shape.status,
      created_at: z.coerce.date(),
      response: GenerateOutputSchema,
    }),
  ),
});
export type HistoryOutput = z.infer<typeof HistoryOutputSchema>;

// FILES

export const FilePurposeSchema = z.enum(['tune', 'template']);
export type FilePurpose = z.infer<typeof FilePurposeSchema>;

export const FileInputSchema = z
  .object({
    id: z.string(),
  })
  .strict();
export type FileInput = z.input<typeof FileInputSchema>;

export const FileCreateInputSchema = z.custom<FormData>();
export type FileCreateInput = z.input<typeof FileCreateInputSchema>;

const SingleFileOutputSchema = z
  .object({
    id: z.string(),
    file_name: z.string(),
    purpose: FilePurposeSchema,
    created_at: z.coerce.date(),
  })
  .passthrough();

export const FileOutputSchema = z.object({
  results: SingleFileOutputSchema,
});
export type FileOutput = z.output<typeof FileOutputSchema>;

export const FilesOutputSchema = PaginationOutputSchema.extend({
  results: z.array(SingleFileOutputSchema),
});
export type FilesOutput = z.output<typeof FilesOutputSchema>;
