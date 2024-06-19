import type { ApiClientOptions, ApiClientResponse } from './api/client.js';
import type { Empty, OmitVersion, Replace } from './utils/types.js';

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

// TextSentenceSimilarityService

export type TextSentenceSimilarityCreateInput = InputBodyWrapper<
  ApiClientOptions<'POST', '/v2/beta/text/sentence-similarity'>['body']
>;
export type TextSentenceSimilarityCreateOutput = OutputWrapper<
  ApiClientResponse<'POST', '/v2/beta/text/sentence-similarity'>['data']
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
  '/v2/requests/chat/{conversation_id}'
>['params']['path'];
export type RequestServiceChatOutput = OutputWrapper<
  ApiClientResponse<'GET', '/v2/requests/chat/{conversation_id}'>['data']
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
export type TuneServiceReadOutput = Blob; // TODO Replace with proper derivation

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

export type TuneServiceTypesInput = Empty;
export type TuneServiceTypesOutput = OutputWrapper<
  ApiClientResponse<'GET', '/v2/tuning_types'>['data']
>;

// UserService

export type UserServiceCreateInput = InputBodyWrapper<
  ApiClientOptions<'POST', '/v2/user'>['body']
>;
export type UserServiceCreateOutput = OutputWrapper<
  ApiClientResponse<'POST', '/v2/user'>['data']
>;

export type UserServiceRetrieveInput = Empty;
export type UserServiceRetrieveOutput = OutputWrapper<
  ApiClientResponse<'GET', '/v2/user'>['data']
>;

export type UserServiceUpdateInput = InputBodyWrapper<
  ApiClientOptions<'PATCH', '/v2/user'>['body']
>;
export type UserServiceUpdateOutput = OutputWrapper<
  ApiClientResponse<'PATCH', '/v2/user'>['data']
>;

export type UserServiceDeleteInput = Empty;
export type UserServiceDeleteOutput = OutputWrapper<
  ApiClientResponse<'DELETE', '/v2/user'>['data']
>;

// FileService

export type FileServiceCreateInput = Replace<
  InputBodyWrapper<ApiClientOptions<'POST', '/v2/files'>['body']>,
  { file: { content: Blob; name: string } }
>;
export type FileServiceCreateOutput = OutputWrapper<
  ApiClientResponse<'POST', '/v2/files'>['data']
>;

export type FileServiceRetrieveInput = ApiClientOptions<
  'GET',
  '/v2/files/{id}'
>['params']['path'];
export type FileServiceRetrieveOutput = OutputWrapper<
  ApiClientResponse<'GET', '/v2/files/{id}'>['data']
>;

export type FileServiceReadInput = ApiClientOptions<
  'GET',
  '/v2/files/{id}/content'
>['params']['path'];
export type FileServiceReadOutput = Blob; // TODO Replace with proper derivation

export type FileServiceDeleteInput = ApiClientOptions<
  'DELETE',
  '/v2/files/{id}'
>['params']['path'];
export type FileServiceDeleteOutput = OutputWrapper<
  ApiClientResponse<'DELETE', '/v2/files/{id}'>['data']
>;

export type FileServiceListInput = InputQueryWrapper<
  ApiClientOptions<'GET', '/v2/files'>['params']['query']
>;
export type FileServiceListOutput = OutputWrapper<
  ApiClientResponse<'GET', '/v2/files'>['data']
>;

// SystemPromptService

export type SystemPromptServiceCreateInput = InputBodyWrapper<
  ApiClientOptions<'POST', '/v2/system_prompts'>['body']
>;
export type SystemPromptServiceCreateOutput = OutputWrapper<
  ApiClientResponse<'POST', '/v2/system_prompts'>['data']
>;

export type SystemPromptServiceRetrieveInput = ApiClientOptions<
  'GET',
  '/v2/system_prompts/{id}'
>['params']['path'];
export type SystemPromptServiceRetrieveOutput = OutputWrapper<
  ApiClientResponse<'GET', '/v2/system_prompts/{id}'>['data']
>;

export type SystemPromptServiceUpdateInput = ApiClientOptions<
  'PUT',
  '/v2/system_prompts/{id}'
>['params']['path'] &
  InputBodyWrapper<ApiClientOptions<'PUT', '/v2/system_prompts/{id}'>['body']>;
export type SystemPromptServiceUpdateOutput = OutputWrapper<
  ApiClientResponse<'PUT', '/v2/system_prompts/{id}'>['data']
>;

export type SystemPromptServiceDeleteInput = ApiClientOptions<
  'DELETE',
  '/v2/system_prompts/{id}'
>['params']['path'];
export type SystemPromptServiceDeleteOutput = OutputWrapper<
  ApiClientResponse<'DELETE', '/v2/system_prompts/{id}'>['data']
>;

export type SystemPromptServiceListInput = InputQueryWrapper<
  ApiClientOptions<'GET', '/v2/system_prompts'>['params']['query']
>;
export type SystemPromptServiceListOutput = OutputWrapper<
  ApiClientResponse<'GET', '/v2/system_prompts'>['data']
>;
