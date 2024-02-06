import type { Readable } from 'node:stream';

import type { ApiClientOptions, ApiClientResponse } from './api/client.js';
import type { OmitVersion } from './utils/types.js';

type InputQueryWrapper<T> = OmitVersion<T>; // For some reason, `requestBody` is optional in the generated schema
type InputBodyWrapper<T> = NonNullable<T>; // For some reason, `requestBody` is optional in the generated schema
type OutputWrapper<T> = NonNullable<T>; // clientErrorWrapper ensures the output is defined

// TextGenerationService

export type TextGenerationCreateInput = InputBodyWrapper<
  ApiClientOptions<'POST', '/v2/text/generation'>['body']
>;
export type TextGenerationCreateOutput = OutputWrapper<
  ApiClientResponse<'POST', '/v2/text/generation'>['data']
>;

export type TextGenerationCreateStreamInput = InputBodyWrapper<
  ApiClientOptions<'POST', '/v2/text/generation_stream'>['body']
>;
export type TextGenerationCreateStreamOutput = OutputWrapper<
  ApiClientResponse<'POST', '/v2/text/generation_stream'>['data']
>;

// TextTokenizationService

export type TextTokenizationCreateInput = InputBodyWrapper<
  ApiClientOptions<'POST', '/v2/text/tokenization'>['body']
>;
export type TextTokenizationCreateOutput = OutputWrapper<
  ApiClientResponse<'POST', '/v2/text/tokenization'>['data']
>;

// TextChatService

export type TextChatCreateInput = InputBodyWrapper<
  ApiClientOptions<'POST', '/v2/text/chat'>['body']
>;
export type TextChatCreateOutput = OutputWrapper<
  ApiClientResponse<'POST', '/v2/text/chat'>['data']
>;

export type TextChatCreateStreamInput = InputBodyWrapper<
  ApiClientOptions<'POST', '/v2/text/chat_stream'>['body']
>;
export type TextChatCreateStreamOutput = OutputWrapper<
  ApiClientResponse<'POST', '/v2/text/chat_stream'>['data']
>;

// TextEmbeddingService

export type TextEmbeddingCreateInput = InputBodyWrapper<
  ApiClientOptions<'POST', '/v2/text/embeddings'>['body']
>;
export type TextEmbeddingCreateOutput = OutputWrapper<
  ApiClientResponse<'POST', '/v2/text/embeddings'>['data']
>;

// ModelService

export type ModelServiceListInput = InputQueryWrapper<
  ApiClientOptions<'GET', '/v2/models'>['params']['query']
>;
export type ModelServiceListOutput = OutputWrapper<
  ApiClientResponse<'GET', '/v2/models'>['data']
>;

export type ModelServiceRetrieveInput = ApiClientOptions<
  'GET',
  '/v2/models/{id}'
>['params']['path'];
export type ModelServiceRetrieveOutput = OutputWrapper<
  ApiClientResponse<'GET', '/v2/models/{id}'>['data']
>;

// RequestService

export type RequestServiceListInput = InputQueryWrapper<
  ApiClientOptions<'GET', '/v2/requests'>['params']['query']
>;
export type RequestServiceListOutput = OutputWrapper<
  ApiClientResponse<'GET', '/v2/requests'>['data']
>;

export type RequestServiceDeleteInput = ApiClientOptions<
  'DELETE',
  '/v2/requests/{id}'
>['params']['path'];
export type RequestServiceDeleteOutput = OutputWrapper<
  ApiClientResponse<'DELETE', '/v2/requests/{id}'>['data']
>;

export type RequestServiceChatInput = ApiClientOptions<
  'GET',
  '/v2/requests/chat/{conversationId}'
>['params']['path'];
export type RequestServiceChatOutput = OutputWrapper<
  ApiClientResponse<'GET', '/v2/requests/chat/{conversationId}'>['data']
>;

// PromptService

export type PromptServiceListInput = InputQueryWrapper<
  ApiClientOptions<'GET', '/v2/prompts'>['params']['query']
>;
export type PromptServiceListOutput = OutputWrapper<
  ApiClientResponse<'GET', '/v2/prompts'>['data']
>;

export type PromptServiceRetrieveInput = ApiClientOptions<
  'GET',
  '/v2/prompts/{id}'
>['params']['path'];
export type PromptServiceRetrieveOutput = OutputWrapper<
  ApiClientResponse<'GET', '/v2/prompts/{id}'>['data']
>;

export type PromptServiceCreateInput = InputBodyWrapper<
  ApiClientOptions<'POST', '/v2/prompts'>['body']
>;
export type PromptServiceCreateOutput = OutputWrapper<
  ApiClientResponse<'POST', '/v2/prompts'>['data']
>;

export type PromptServiceDeleteInput = ApiClientOptions<
  'DELETE',
  '/v2/prompts/{id}'
>['params']['path'];
export type PromptServiceDeleteOutput = OutputWrapper<
  ApiClientResponse<'DELETE', '/v2/prompts/{id}'>['data']
>;

// TuneService

export type TuneServiceListInput = InputQueryWrapper<
  ApiClientOptions<'GET', '/v2/tunes'>['params']['query']
>;
export type TuneServiceListOutput = OutputWrapper<
  ApiClientResponse<'GET', '/v2/tunes'>['data']
>;

export type TuneServiceReadInput = ApiClientOptions<
  'GET',
  '/v2/tunes/{id}/content/{type}'
>['params']['path'];
export type TuneServiceReadOutput = Readable;

export type TuneServiceRetrieveInput = ApiClientOptions<
  'GET',
  '/v2/tunes/{id}'
>['params']['path'];
export type TuneServiceRetrieveOutput = OutputWrapper<
  ApiClientResponse<'GET', '/v2/tunes/{id}'>['data']
>;

export type TuneServiceCreateInput = InputBodyWrapper<
  ApiClientOptions<'POST', '/v2/tunes'>['body']
>;
export type TuneServiceCreateOutput = OutputWrapper<
  ApiClientResponse<'POST', '/v2/tunes'>['data']
>;

export type TuneServiceDeleteInput = ApiClientOptions<
  'DELETE',
  '/v2/tunes/{id}'
>['params']['path'];
export type TuneServiceDeleteOutput = OutputWrapper<
  ApiClientResponse<'DELETE', '/v2/tunes/{id}'>['data']
>;

export type TuneServiceTypesInput = Record<string, never>;
export type TuneServiceTypesOutput = OutputWrapper<
  ApiClientResponse<'GET', '/v2/tuning_types'>['data']
>;
