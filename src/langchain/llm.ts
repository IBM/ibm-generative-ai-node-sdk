import {
  BaseLLM,
  BaseLLMCallOptions,
  BaseLLMParams,
} from '@langchain/core/language_models/llms';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import type { LLMResult } from '@langchain/core/outputs';
import { GenerationChunk } from '@langchain/core/outputs';
import merge from 'lodash/merge.js';

import { Client, Configuration } from '../client.js';
import { concatUnique, isNullish } from '../helpers/common.js';
import {
  TextGenerationCreateInput,
  TextGenerationCreateStreamInput,
} from '../schema.js';

type TextGenerationInput = TextGenerationCreateInput &
  TextGenerationCreateStreamInput;

export type GenAIModelParams = BaseLLMParams &
  Pick<
    TextGenerationInput,
    'model_id' | 'prompt_id' | 'parameters' | 'moderations'
  > & {
    model_id: NonNullable<TextGenerationInput['model_id']>;
  } & (
    | { client: Client; configuration?: never }
    | { client?: never; configuration: Configuration }
  );
export type GenAIChatModelOptions = BaseLLMCallOptions &
  Partial<Omit<GenAIModelParams, 'client' | 'configuration'>>;

export class GenAIModel extends BaseLLM<GenAIChatModelOptions> {
  protected readonly client: Client;

  public readonly modelId: GenAIModelParams['model_id'];
  public readonly promptId: GenAIModelParams['prompt_id'];
  public readonly parameters: GenAIModelParams['parameters'];
  public readonly moderations: GenAIModelParams['moderations'];

  constructor({
    model_id,
    prompt_id,
    parameters,
    moderations,
    client,
    configuration,
    ...options
  }: GenAIModelParams) {
    super(options);

    this.modelId = model_id;
    this.promptId = prompt_id;
    this.parameters = parameters;
    this.moderations = moderations;
    this.client = client ?? new Client(configuration);
  }

  async _generate(
    inputs: string[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun,
  ): Promise<LLMResult> {
    const outputs = await Promise.all(
      inputs.map((input) =>
        this.client.text.generation.create(
          this._prepareRequest(input, options),
          {
            signal: options.signal,
          },
        ),
      ),
    );

    const generations = outputs.map((output) =>
      output.results.map((result) => {
        const { generated_text, ...generationInfo } = result;
        return { text: generated_text, generationInfo };
      }),
    );

    const llmOutput = generations.flat().reduce(
      (acc, generation) => {
        acc.generated_token_count +=
          generation.generationInfo.generated_token_count;
        acc.input_token_count +=
          generation.generationInfo.input_token_count ?? 0;
        return acc;
      },
      {
        generated_token_count: 0,
        input_token_count: 0,
      },
    );

    return {
      generations,
      llmOutput,
    };
  }

  async *_streamResponseChunks(
    input: string,
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun,
  ): AsyncGenerator<GenerationChunk> {
    const stream = await this.client.text.generation.create_stream(
      this._prepareRequest(input, options),
      {
        signal: options.signal,
      },
    );

    for await (const response of stream) {
      if (response.results) {
        for (const { generated_text, ...generationInfo } of response.results) {
          yield new GenerationChunk({
            text: generated_text,
            generationInfo,
          });
          void runManager?.handleText(generated_text);
        }
      }
      if (response.moderation) {
        yield new GenerationChunk({
          text: '',
          generationInfo: {
            moderation: response.moderation,
          },
        });
        void runManager?.handleText('');
      }
    }
  }

  private _prepareRequest(
    input: string,
    options: this['ParsedCallOptions'],
  ): TextGenerationInput {
    const stop_sequences = concatUnique(
      options.stop,
      options.parameters?.stop_sequences,
    );
    const { model_id, prompt_id, ...rest } = merge(
      {
        model_id: this.modelId,
        prompt_id: this.promptId,
        moderations: this.moderations,
        parameters: this.parameters,
      },
      {
        model_id: options.model_id,
        prompt_id: options.prompt_id,
        moderations: options.moderations,
        parameters: {
          ...options.parameters,
          stop_sequences,
        },
      },
      { input },
    );
    return {
      ...(prompt_id ? { prompt_id } : { model_id }),
      ...rest,
    };
  }

  async getNumTokens(input: string): Promise<number> {
    const result = await this.client.text.tokenization.create({
      ...(!isNullish(this.modelId) && {
        model_id: this.modelId,
      }),
      input,
      parameters: {
        return_options: {
          tokens: false,
        },
      },
    });

    return result.results.at(0)?.token_count ?? 0;
  }

  _modelType(): string {
    return this.modelId;
  }

  _llmType(): string {
    return 'GenAI';
  }
}
