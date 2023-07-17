import { z } from 'zod';
import * as ApiTypes from './api-types.js';
import { Readable } from 'node:stream';
import { FlagOption } from './helpers/types.js';

// COMMON

const ListSchema = z.object({
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

// TUNES

export const TunesInputSchema = z
  .object({
    filters: ListSchema.and(
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
export type TuneOutput =
  | (ApiTypes.TuneOutput['results'] & {
      status: Exclude<ApiTypes.TuneOutput['results']['status'], 'COMPLETED'>;
    })
  | (ApiTypes.TuneOutput['results'] & {
      status: Extract<ApiTypes.TuneOutput['results']['status'], 'COMPLETED'>;
      downloadAsset: (type: TuneAssetType) => Promise<Readable>;
    });

export const TuneMethodsInputSchema = z.never();
export type TuneMethodsInput = z.infer<typeof TuneMethodsInputSchema>;
export type TuneMethodsOutput = ApiTypes.TuneMethodsOutput['results'];

// PROMPT TEMPLATES

export type PromptTemplateInput = ApiTypes.PromptTemplateInput;
export type PromptTemplateCreateInput = ApiTypes.PromptTemplateCreateInput;
export const PromptTemplateUpdateInputSchema = z.intersection(
  ApiTypes.PromptTemplateInputSchema,
  ApiTypes.PromptTemplateUpdateInputSchema,
);
export type PromptTemplateUpdateInput = z.input<
  typeof PromptTemplateUpdateInputSchema
>;

export type PromptTemplateOutput = ApiTypes.PromptTemplateOutput['results'];
export type PromptTemplatesOutput =
  ApiTypes.PromptTemplatesOutput['results'][number];

export const PromptTemplatesInputSchema = ListSchema;
export type PromptTemplatesInput = z.input<typeof PromptTemplatesInputSchema>;

export type PromptTemplateOptions = HttpHandlerOptions &
  FlagOption<'delete', false>;
export type PromptTemplateDeleteOptions = HttpHandlerOptions &
  FlagOption<'delete', true>;

export const PromptTemplateExecuteInputSchema =
  ApiTypes.PromptTemplateExecuteInputSchema;
export type PromptTemplateExecuteInput = z.input<
  typeof PromptTemplateExecuteInputSchema
>;
export type PromptTemplateExecuteOutput =
  ApiTypes.PromptTemplateExecuteOutput['results'];
export type PromptTemplateExecuteOptions = HttpHandlerOptions;

// HISTORY

export const HistoryInputSchema = ListSchema.and(
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

export const FilesInputSchema = ListSchema;
export type FilesInput = z.input<typeof FilesInputSchema>;

export type FileOptions = HttpHandlerOptions & FlagOption<'delete', false>;
export type FileDeleteOptions = HttpHandlerOptions & FlagOption<'delete', true>;

export const FilesOutputSchema =
  ApiTypes.FilesOutputSchema.shape.results.element;
export type FilesOutput = z.output<typeof FilesOutputSchema>;
