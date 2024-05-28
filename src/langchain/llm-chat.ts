import {
  BaseChatModel,
  BaseChatModelParams,
} from '@langchain/core/language_models/chat_models';
import {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
} from '@langchain/core/messages';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { ChatGenerationChunk, ChatResult } from '@langchain/core/outputs';
import { BaseLanguageModelCallOptions as BaseChatModelCallOptions } from '@langchain/core/language_models/base';
import merge from 'lodash/merge.js';

import { Client, Configuration } from '../client.js';
import { TextChatCreateInput, TextChatCreateStreamInput } from '../schema.js';
import { InternalError, InvalidInputError } from '../errors.js';

type TextChatInput = TextChatCreateInput & TextChatCreateStreamInput;

export type GenAIChatModelParams = BaseChatModelParams &
  Omit<TextChatInput, 'messages' | 'prompt_template_id'> & {
    model_id: NonNullable<TextChatInput['model_id']>;
  } & (
    | { client: Client; configuration?: never }
    | { client?: never; configuration: Configuration }
  );
export type GenAIChatModelOptions = BaseChatModelCallOptions &
  Partial<Omit<GenAIChatModelParams, 'client' | 'configuration'>>;

export class GenAIChatModel extends BaseChatModel<GenAIChatModelOptions> {
  protected readonly client: Client;

  public readonly modelId: GenAIChatModelParams['model_id'];
  public readonly promptId: GenAIChatModelParams['prompt_id'];
  public readonly conversationId: GenAIChatModelParams['conversation_id'];
  public readonly parameters: GenAIChatModelParams['parameters'];
  public readonly moderations: GenAIChatModelParams['moderations'];
  public readonly useConversationParameters: GenAIChatModelParams['use_conversation_parameters'];
  public readonly parentId: GenAIChatModelParams['parent_id'];
  public readonly trimMethod: GenAIChatModelParams['trim_method'];

  constructor({
    model_id,
    prompt_id,
    conversation_id,
    parameters,
    moderations,
    parent_id,
    use_conversation_parameters,
    trim_method,
    client,
    configuration,
    ...options
  }: GenAIChatModelParams) {
    super(options);

    this.modelId = model_id;
    this.promptId = prompt_id;
    this.conversationId = conversation_id;
    this.parameters = parameters;
    this.moderations = moderations;
    this.parentId = parent_id;
    this.useConversationParameters = use_conversation_parameters;
    this.trimMethod = trim_method;
    this.client = client ?? new Client(configuration);
  }

  async _generate(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    _runManager?: CallbackManagerForLLMRun,
  ): Promise<ChatResult> {
    const output = await this.client.text.chat.create(
      this._prepareRequest(messages, options),
      { signal: options.signal },
    );
    if (output.results.length !== 1) throw new InternalError('Invalid result');
    const result = output.results[0];
    if (result.input_token_count == null)
      throw new InternalError('Missing token count');
    return {
      generations: [
        {
          message: new AIMessage({ content: result.generated_text }),
          text: result.generated_text,
          generationInfo: {
            conversationId: output.conversation_id,
            inputTokens: result.input_tokens,
            generatedTokens: result.generated_tokens,
            seed: result.seed,
            stopReason: result.stop_reason,
            stopSequence: result.stop_sequence,
            moderation: result.moderation,
          },
        },
      ],
      llmOutput: {
        tokenUsage: {
          completionTokens: result.generated_token_count,
          promptTokens: result.input_token_count,
          totalTokens: result.generated_token_count + result.input_token_count,
        },
      },
    };
  }

  async *_streamResponseChunks(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    _runManager?: CallbackManagerForLLMRun,
  ): AsyncGenerator<ChatGenerationChunk> {
    const outputStream = await this.client.text.chat.create_stream(
      this._prepareRequest(messages, options),
      { signal: options.signal },
    );
    for await (const output of outputStream) {
      if (output.results) {
        for (const result of output.results) {
          yield new ChatGenerationChunk({
            message: new AIMessageChunk({
              content: result.generated_text,
            }),
            text: result.generated_text,
            generationInfo: {
              conversationId: output.conversation_id,
              inputTokens: result.input_tokens,
              generatedTokens: result.generated_tokens,
              seed: result.seed,
              stopReason: result.stop_reason,
              stopSequence: result.stop_sequence,
            },
          });
          await _runManager?.handleText(result.generated_text);
        }
      }
      if (output.moderations) {
        yield new ChatGenerationChunk({
          message: new AIMessageChunk({
            content: '',
          }),
          text: '',
          generationInfo: {
            conversationId: output.conversation_id,
            moderation: output.moderations,
          },
        });
        await _runManager?.handleText('');
      }
    }
  }

  private _prepareRequest(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
  ) {
    const {
      conversation_id,
      model_id,
      prompt_id,
      use_conversation_parameters,
      parameters,
      ...rest
    } = merge(
      {
        conversation_id: this.conversationId,
        model_id: this.modelId,
        prompt_id: this.promptId,
        moderations: this.moderations,
        parameters: this.parameters,
        use_conversation_parameters: this.useConversationParameters,
        parent_id: this.parentId,
        trim_method: this.trimMethod,
      },
      {
        conversation_id: options.conversation_id,
        model_id: options.model_id,
        prompt_id: options.prompt_id,
        moderations: options.moderations,
        parameters: options.parameters,
        use_conversation_parameters: options.use_conversation_parameters,
        parent_id: options.parent_id,
        trim_method: options.trim_method,
      },
      { messages: this._convertMessages(messages) },
    );
    return {
      ...(conversation_id
        ? { conversation_id }
        : prompt_id
        ? { prompt_id }
        : { model_id }),
      ...(use_conversation_parameters
        ? { use_conversation_parameters }
        : { parameters }),
      ...rest,
    };
  }

  private _convertMessages(
    messages: BaseMessage[],
  ): TextChatCreateInput['messages'] & TextChatCreateStreamInput['messages'] {
    return messages.map((message) => {
      const content = message.content;
      if (typeof content !== 'string')
        throw new InvalidInputError('Multimodal messages are not supported.');
      const type = message._getType();
      switch (type) {
        case 'system':
          return { content, role: 'system' };
        case 'human':
          return { content, role: 'user' };
        case 'ai':
          return { content, role: 'assistant' };
        default:
          throw new InvalidInputError(`Unsupported message type "${type}"`);
      }
    });
  }

  _llmType(): string {
    return 'GenAIChat';
  }

  _modelType(): string {
    return this.modelId;
  }
}
