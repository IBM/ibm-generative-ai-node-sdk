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
import { BaseLanguageModelCallOptions } from '@langchain/core/language_models/base';
import merge from 'lodash/merge.js';

import { Client, Configuration } from '../client.js';
import {
  TextChatCreateInput,
  TextChatCreateStreamInput,
  TextGenerationCreateInput,
} from '../schema.js';
import { InternalError, InvalidInputError } from '../errors.js';

export type GenAIChatModelParams = BaseChatModelParams &
  Required<
    Pick<TextGenerationCreateInput & TextChatCreateStreamInput, 'model_id'>
  > &
  Pick<
    TextGenerationCreateInput & TextChatCreateStreamInput,
    'prompt_id' | 'parameters'
  > & { model_id: string; configuration?: Configuration };
export type GenAIChatModelOptions = BaseLanguageModelCallOptions &
  Pick<GenAIChatModelParams, 'parameters'>;

export class GenAIChatModel extends BaseChatModel<GenAIChatModelOptions> {
  protected readonly client: Client;

  public readonly modelId: GenAIChatModelParams['model_id'];
  public readonly promptId: GenAIChatModelParams['prompt_id'];
  protected parameters: GenAIChatModelParams['parameters'];

  protected conversation: string | null = null;

  constructor({
    model_id,
    prompt_id,
    parameters,
    configuration,
    ...options
  }: GenAIChatModelParams) {
    super(options);

    this.modelId = model_id;
    this.promptId = prompt_id;
    this.parameters = parameters;
    this.client = new Client(configuration);
  }

  /**
   * Clears the chat history
   */
  clear() {
    this.conversation = null;
  }

  async _generate(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun,
  ): Promise<ChatResult> {
    const output = await this.client.text.chat.create(
      {
        ...(this.conversation
          ? { conversation_id: this.conversation }
          : { model_id: this.modelId, prompt_id: this.promptId }),
        messages: this._convertMessages(messages),
        parameters: merge(this.parameters, options.parameters),
      },
      { signal: options.signal },
    );
    if (output.results.length !== 1) throw new InternalError('Invalid result');
    const result = output.results[0];
    if (result.input_token_count == null)
      throw new InternalError('Missing token count');
    this.conversation = output.conversation_id;
    return {
      generations: [
        {
          message: new AIMessage({ content: result.generated_text }),
          text: result.generated_text,
          generationInfo: {
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
    runManager?: CallbackManagerForLLMRun,
  ): AsyncGenerator<ChatGenerationChunk> {
    const outputStream = await this.client.text.chat.create_stream(
      {
        ...(this.conversation
          ? { conversation_id: this.conversation }
          : { model_id: this.modelId, prompt_id: this.promptId }),
        messages: this._convertMessages(messages),
        parameters: merge(this.parameters, options.parameters),
      },
      { signal: options.signal },
    );
    for await (const output of outputStream) {
      if (output.results?.length !== 1)
        throw new InternalError('Invalid output');
      const result = output.results[0];
      this.conversation = output.conversation_id;
      yield new ChatGenerationChunk({
        message: new AIMessageChunk({
          content: result.generated_text,
        }),
        text: result.generated_text,
        generationInfo: {
          inputTokens: result.input_tokens,
          generatedTokens: result.generated_tokens,
          seed: result.seed,
          stopReason: result.stop_reason,
          stopSequence: result.stop_sequence,
          moderation: result.moderation,
        },
      });
      await runManager?.handleText(result.generated_text);
    }
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
