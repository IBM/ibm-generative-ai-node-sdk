import { z } from 'zod';
import * as ApiTypes from './api-types.js';
import { Readable } from 'node:stream';
import { FlagOption } from './helpers/types.js';

// COMMON

const ListInputSchema = z.object({
  offset: z.number().int().nonnegative().nullish(),
  count: z.number().int().positive().nullish(),
});

// GENERAL

export interface HttpHandlerOptions {
  timeout?: number;
  signal?: AbortSignal;
  retries?: number;
}

export type HttpHandlerNoStreamOptions = HttpHandlerOptions &
  FlagOption<'stream', false>;
export type HttpHandlerStreamOptions = HttpHandlerOptions &
  FlagOption<'stream', true>;

// GENERATE
const BaseGenerateInputSchema = ApiTypes.GenerateInputSchema.omit({
  inputs: true,
  use_default: true,
  prompt_id: true,
  model_id: true,
}).extend({ input: z.string() });
export const GenerateInputSchema = z.union([
  BaseGenerateInputSchema.extend({
    model_id: ApiTypes.GenerateInputSchema.shape.model_id,
    prompt_id: z.never().optional(),
  }),
  BaseGenerateInputSchema.extend({
    prompt_id: ApiTypes.GenerateInputSchema.shape.prompt_id,
    model_id: z.never().optional(),
  }),
]);
export type GenerateInput = z.infer<typeof GenerateInputSchema>;
export type GenerateOutput = ApiTypes.GenerateOutput['results'][number];

export const GenerateConfigInputSchema = ApiTypes.GenerateConfigInputSchema;
export type GenerateConfigInput = z.input<typeof GenerateConfigInputSchema>;

export const GenerateConfigOutputSchema = ApiTypes.GenerateConfigOutputSchema;
export type GenerateConfigOutput = z.output<typeof GenerateConfigOutputSchema>;

export type GenerateConfigOptions = HttpHandlerOptions & { reset?: boolean };
export type GenerateConfigInputOptions = HttpHandlerOptions & {
  strategy: 'merge' | 'replace';
};

export const GenerateLimitsInputSchema = z.never();
export type GenerateLimitsInput = z.input<typeof GenerateLimitsInputSchema>;

export const GenerateLimitsOutputSchema = ApiTypes.GenerateLimitsOutputSchema;
export type GenerateLimitsOutput = z.output<typeof GenerateLimitsOutputSchema>;

// TOKENIZE

export const TokenizeInputSchema = ApiTypes.TokenizeInputSchema.omit({
  inputs: true,
}).extend({ input: z.string() });
export type TokenizeInput = z.infer<typeof TokenizeInputSchema>;

export const TokenizeOutputSchema =
  ApiTypes.TokenizeOutputSchema.shape.results.element;
export type TokenizeOutput = z.output<typeof TokenizeOutputSchema>;

// MODELS

export const ModelsInputSchema = z.never();
export type ModelsInput = z.infer<typeof ModelsInputSchema>;

export const ModelsOutputSchema = ApiTypes.ModelsOutputSchema.shape.results;
export type ModelsOutput = z.output<typeof ModelsOutputSchema>;

export const ModelInputSchema = z.object({ id: z.string() });
export type ModelInput = z.infer<typeof ModelInputSchema>;

export const ModelOutputSchema = ApiTypes.ModelOutputSchema.shape.results;
export type ModelOutput = z.output<typeof ModelOutputSchema>;

// TUNES

export const TunesInputSchema = z
  .object({
    filters: ListInputSchema.and(
      z.object({
        search: z.string().nullish(),
        status: ApiTypes.TuneStatusSchema.nullish(),
      }),
    ),
  })
  .partial();
export type TunesInput = z.infer<typeof TunesInputSchema>;
export type TunesOutput = ApiTypes.TunesOuput['results'][number];

export type TuneAssetType = z.infer<typeof TuneAssetTypeSchema>;
export const TuneAssetTypeSchema = z.enum(['encoder', 'logs']);

export const TuneInputSchema = z.object({
  id: z.string(),
});
export type TuneInput = z.infer<typeof TuneInputSchema>;

export type TuneOptions = HttpHandlerOptions & {
  delete?: boolean;
};

export const TuneCreateInputSchema = z.union([
  TuneInputSchema,
  ApiTypes.TuneInputSchema,
]);
export type TuneCreateInput = z.infer<typeof TuneCreateInputSchema>;
export type TuneCreateOptions = HttpHandlerOptions;

export const TuneOutputSchema = z.union([
  ApiTypes.TuneOutputSchema.shape.results.extend({
    status: ApiTypes.TuneOutputSchema.shape.results.shape.status.exclude([
      'COMPLETED',
    ]),
  }),
  ApiTypes.TuneOutputSchema.shape.results
    .extend({
      status: ApiTypes.TuneOutputSchema.shape.results.shape.status.extract([
        'COMPLETED',
      ]),
    })
    .and(
      z.object({
        downloadAsset: z
          .function()
          .args(TuneAssetTypeSchema)
          .returns(z.custom<Promise<Readable>>()),
      }),
    ),
]);
export type TuneOutput = z.output<typeof TuneOutputSchema>;

export const TuneDeleteOutputSchema = z.void();
export type TuneDeleteOutput = z.output<typeof TuneDeleteOutputSchema>;

export const TuneMethodsInputSchema = z.never();
export type TuneMethodsInput = z.infer<typeof TuneMethodsInputSchema>;

export const TuneMethodsOutputSchema =
  ApiTypes.TuneMethodsOutputSchema.shape.results;
export type TuneMethodsOutput = z.output<typeof TuneMethodsOutputSchema>;

// PROMPT TEMPLATES

export const PromptTemplateInputSchema = ApiTypes.PromptTemplateInputSchema;
export type PromptTemplateInput = z.input<typeof PromptTemplateInputSchema>;

export const PromptTemplateCreateInputSchema =
  ApiTypes.PromptTemplateCreateInputSchema;
export type PromptTemplateCreateInput = z.input<
  typeof PromptTemplateCreateInputSchema
>;

export const PromptTemplateUpdateInputSchema = z.intersection(
  PromptTemplateInputSchema,
  ApiTypes.PromptTemplateUpdateInputSchema,
);
export type PromptTemplateUpdateInput = z.input<
  typeof PromptTemplateUpdateInputSchema
>;

export const PromptTemplateOutputSchema =
  ApiTypes.PromptTemplateOutputSchema.shape.results;
export type PromptTemplateOutput = z.output<typeof PromptTemplateOutputSchema>;

export const PromptTemplateDeleteOutputSchema = z.void();
export type PromptTemplateDeleteOutput = z.output<
  typeof PromptTemplateDeleteOutputSchema
>;

export const PromptTemplatesInputSchema = ListInputSchema;
export type PromptTemplatesInput = z.input<typeof PromptTemplatesInputSchema>;

export const PromptTemplatesOutputSchema =
  ApiTypes.PromptTemplatesOutputSchema.shape.results.element;
export type PromptTemplatesOutput = z.output<
  typeof PromptTemplatesOutputSchema
>;

export type PromptTemplateOptions = HttpHandlerOptions &
  FlagOption<'delete', false>;
export type PromptTemplateDeleteOptions = HttpHandlerOptions &
  FlagOption<'delete', true>;

export const PromptTemplateExecuteInputSchema =
  ApiTypes.PromptTemplateExecuteInputSchema;
export type PromptTemplateExecuteInput = z.input<
  typeof PromptTemplateExecuteInputSchema
>;

export const PromptTemplateExecuteOutputSchema =
  ApiTypes.PromptTemplateExecuteOutputSchema.shape.results;
export type PromptTemplateExecuteOutput = z.output<
  typeof PromptTemplateExecuteOutputSchema
>;

export type PromptTemplateExecuteOptions = HttpHandlerOptions;

// HISTORY

export const HistoryInputSchema = ListInputSchema.and(
  ApiTypes.HistoryInputSchema.pick({
    status: true,
    origin: true,
  }),
);
export type HistoryInput = z.input<typeof HistoryInputSchema>;

export type HistoryOptions = HttpHandlerOptions;

export const HistoryOutputSchema =
  ApiTypes.HistoryOutputSchema.shape.results.element;
export type HistoryOutput = z.infer<typeof HistoryOutputSchema>;

// FILES

export const FilePurposeSchema = ApiTypes.FilePurposeSchema;
export type FilePupose = z.infer<typeof FilePurposeSchema>;

export const FileInputSchema = ApiTypes.FileInputSchema;
export type FileInput = z.input<typeof FileInputSchema>;

export const FileCreateInputSchema = z.object({
  purpose: FilePurposeSchema,
  filename: z.string(),
  file: z.custom<Readable>(),
});
export type FileCreateInput = z.input<typeof FileCreateInputSchema>;

export const FileOutputSchema = ApiTypes.FileOutputSchema.shape.results.and(
  z.object({
    download: z.function().returns(z.custom<Promise<Readable>>()),
  }),
);
export type FileOutput = z.output<typeof FileOutputSchema>;

export const FileDeleteOutputSchema = z.void();
export type FileDeleteOutput = z.output<typeof FileDeleteOutputSchema>;

export const FilesInputSchema = ListInputSchema;
export type FilesInput = z.input<typeof FilesInputSchema>;

export type FileOptions = HttpHandlerOptions & FlagOption<'delete', false>;
export type FileDeleteOptions = HttpHandlerOptions & FlagOption<'delete', true>;

export const FilesOutputSchema =
  ApiTypes.FilesOutputSchema.shape.results.element;
export type FilesOutput = z.output<typeof FilesOutputSchema>;
