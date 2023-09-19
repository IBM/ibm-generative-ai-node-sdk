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

const ParametersSchema = z.record(z.any());

export const GenerateInputSchema = z.object({
  model_id: z.string().nullish(),
  prompt_id: z.string().nullish(),
  inputs: z.array(z.string()),
  parameters: z.optional(ParametersSchema),
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

export const GenerateOutputSchema = z
  .object({
    model_id: z.string(),
    created_at: z.coerce.date(),
    results: z.array(GenerateResultSchema),
  })
  .passthrough();
export type GenerateOutput = z.infer<typeof GenerateOutputSchema>;

export const GenerateLimitsOutputSchema = z.object({
  tokenCapacity: z.number().int().nonnegative(),
  tokensUsed: z.number().int().nonnegative(),
});
export type GenerateLimitsOutput = z.output<typeof GenerateLimitsOutputSchema>;

export const GenerateConfigInputSchema = z.object({
  model_id: z.optional(z.string()),
  parameters: z.optional(z.record(z.any())),
});

export type GenerateConfigInput = z.infer<typeof GenerateConfigInputSchema>;

export const GenerateConfigOutputSchema = z.object({
  model_id: z.string().nullish(),
  parameters: z.record(z.any()).nullish(),
});
export type GenerateConfigOutput = z.output<typeof GenerateConfigOutputSchema>;

export const TokenizeInputSchema = z.object({
  model_id: z.string().nullish(),
  inputs: z.array(z.string()),
  use_default: z.optional(z.boolean()),
  parameters: z.optional(z.object({ return_tokens: z.optional(z.boolean()) })),
});

export type TokenizeInput = z.infer<typeof TokenizeInputSchema>;

export const TokenizeOutputSchema = z.object({
  model_id: z.string(),
  created_at: z.string(),
  results: z.array(
    z.object({
      token_count: z.number().int().nonnegative(),
      tokens: z.array(z.string()),
    }),
  ),
});
export type TokenizeOutput = z.output<typeof TokenizeOutputSchema>;

// MODELS

export const ModelsOutputSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      size: z.string(),
      token_limit: z.number().int().nonnegative(),
    }),
  ),
});
export type ModelsOutput = z.output<typeof ModelsOutputSchema>;

const ModelSchemaSchema = z.object({ id: z.number().int(), value: z.any() });

export const ModelOutputSchema = z.object({
  results: z.object({
    id: z.string(),
    name: z.string(),
    size: z.string(),
    description: z.string(),
    token_limit: z.number().int().nonnegative(),
    tags: z.array(z.string()),
    source_model_id: z.string().nullable(),
    tasks: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        json_example: z.string(),
        jsonl_example: z.string(),
      }),
    ),
    model_family: z.object({
      id: z.number().int(),
      name: z.string(),
      short_description: z.string().nullish(),
      description: z.string().nullish(),
    }),
    schema_generate: ModelSchemaSchema,
    schema_tokenize: ModelSchemaSchema,
  }),
});
export type ModelOutput = z.output<typeof ModelOutputSchema>;

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

const TuneFileSchema = z.object({
  id: z.string(),
  file_name: z.string(),
  created_at: z.string(),
});

const TuneMixinSchema = z.object({
  id: z.string(),
  name: z.string(),
  model_id: z.string(),
  method_id: z.string(),
  model_name: z.string(),
  status: TuneStatusSchema,
  task_id: z.string(),
  parameters: z.object({
    batch_size: z.number().int().positive(),
    num_epochs: z.number().int().positive(),
  }),
  created_at: z.string(),
});
type TuneMixin = z.infer<typeof TuneMixinSchema>;

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

export const TuneOutputSchema = z.object({
  results: TuneMixinSchema.extend({
    validation_files: z.array(TuneFileSchema).nullish(),
    training_files: z.array(TuneFileSchema).nullish(),
    evaluation_files: z.array(TuneFileSchema).nullish(),
    datapoints: z
      .object({
        loss: z.array(
          z.object({
            data: z.any(),
            timestamp: z.string(),
          }),
        ),
      })
      .nullish(),
  }),
});
export type TuneOutput = z.output<typeof TuneOutputSchema>;

export const TuneMethodsOutputSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    }),
  ),
});
export type TuneMethodsOutput = z.output<typeof TuneMethodsOutputSchema>;

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
    z
      .object({
        id: z.string(),
        duration: z.number().int().min(0),
        request: GenerateInputSchema.partial(),
        status: HistoryInputSchema.shape.status,
        created_at: z.coerce.date(),
        response: GenerateOutputSchema.nullable(),
      })
      .passthrough(),
  ),
});
export type HistoryOutput = z.infer<typeof HistoryOutputSchema>;

// FILES

export const FilePurposeSchema = z.enum(['tune', 'template', 'generate']);
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

// CHAT

export const ChatRoleSchema = z.enum(['user', 'system', 'assistant']);
export type ChatRole = z.infer<typeof ChatRoleSchema>;

export const ChatInputSchema = z.object({
  model_id: z.string(),
  messages: z.array(
    z.object({
      role: ChatRoleSchema,
      content: z.string(),
    }),
  ),
  conversation_id: z.string().nullish(),
  parent_id: z.string().nullish(),
  prompt_id: z.string().nullish(),
  parameters: ParametersSchema.nullish(),
});
export type ChatInput = z.input<typeof ChatInputSchema>;
export const ChatOutputSchema = z.object({
  conversation_id: z.string(),
  results: z.array(
    z
      .object({
        generated_text: z.string(),
      })
      .partial(),
  ),
});
export type ChatOutput = z.output<typeof ChatOutputSchema>;

export const ChatStreamInputSchema = ChatInputSchema;
export type ChatStreamInput = z.input<typeof ChatStreamInputSchema>;
export const ChatStreamOutputSchema = ChatOutputSchema;
export type ChatStreamOutput = z.output<typeof ChatStreamOutputSchema>;
