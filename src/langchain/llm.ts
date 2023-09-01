import { BaseLLM, BaseLLMParams } from 'langchain/llms/base';
import { Client, Configuration } from '../client/client.js';
import { CallbackManagerForLLMRun } from 'langchain/callbacks';
import { isNotEmptyArray, concatUnique, isNullish } from '../helpers/common.js';
import type { LLMResult, Generation } from 'langchain/schema';
import type { GenerateOutput } from '../client/types.js';
import { GenerateInput } from '../client/types.js';

interface BaseGenAIModelOptions {
  stream?: boolean;
  parameters?: Record<string, any>;
  timeout?: number;
  configuration?: Configuration;
}

export type GenAIModelOptions =
  | (BaseGenAIModelOptions & { modelId?: string; promptId?: never })
  | (BaseGenAIModelOptions & { modelId?: never; promptId: string });

export class GenAIModel extends BaseLLM {
  #client: Client;

  protected modelId?: string;
  protected promptId?: string;
  protected stream: boolean;
  protected timeout: number | undefined;
  protected parameters: Record<string, any>;

  constructor({
    modelId,
    promptId,
    stream = false,
    parameters,
    timeout,
    configuration,
    ...baseParams
  }: GenAIModelOptions & BaseLLMParams) {
    super(baseParams ?? {});

    this.modelId = modelId;
    this.promptId = promptId;
    this.timeout = timeout;
    this.parameters = parameters || {};
    this.stream = Boolean(stream);
    this.#client = new Client({
      config: configuration,
    });
  }

  #createPayload(
    prompts: string[],
    options: this['ParsedCallOptions'],
  ): GenerateInput[] {
    const stopSequences = concatUnique(this.parameters.stop, options.stop);

    return prompts.map((input) => ({
      ...(!isNullish(this.promptId)
        ? {
            prompt_id: this.promptId,
          }
        : !isNullish(this.modelId)
        ? {
            model_id: this.modelId,
          }
        : {}),
      input,
      parameters: {
        ...this.parameters,
        stop_sequences: isNotEmptyArray(stopSequences)
          ? stopSequences
          : undefined,
      },
    }));
  }

  async #execute(
    prompts: string[],
    options: this['ParsedCallOptions'],
  ): Promise<GenerateOutput[]> {
    return await Promise.all(
      this.#client.generate.generate(this.#createPayload(prompts, options), {
        signal: options.signal,
        timeout: this.timeout,
      }),
    );
  }

  async #executeStream(
    prompts: string[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun,
  ): Promise<GenerateOutput[]> {
    return await Promise.all(
      this.#createPayload(prompts, options).map(async (payload) => {
        const stream = this.#client.generate.generateStream(payload, {
          signal: options.signal,
          timeout: this.timeout,
        });

        const output: GenerateOutput = {
          generated_text: '',
          stop_reason: 'NOT_FINISHED',
          input_token_count: 0,
          generated_token_count: 0,
        };

        for await (const chunk of stream) {
          output.generated_text += chunk.generated_text;
          if (chunk.stop_reason) {
            output.stop_reason = chunk.stop_reason;
          }
          output.input_token_count += chunk.input_token_count;
          output.generated_token_count += chunk.generated_token_count;

          void runManager?.handleLLMNewToken(chunk.generated_text);
        }

        return output;
      }),
    );
  }

  async _generate(
    prompts: string[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun,
  ): Promise<LLMResult> {
    const response = this.stream
      ? await this.#executeStream(prompts, options, runManager)
      : await this.#execute(prompts, options);

    const generations: Generation[][] = response.map(
      ({ generated_text: text, ...generationInfo }) => [
        {
          text,
          generationInfo,
        },
      ],
    );

    const llmOutput = await response.reduce(
      (acc, generation) => {
        acc.generated_token_count += generation.generated_token_count;
        acc.input_token_count += generation.input_token_count;
        return acc;
      },
      {
        generated_token_count: 0,
        input_token_count: 0,
      } as Pick<GenerateOutput, 'generated_token_count' | 'input_token_count'>,
    );

    return { generations, llmOutput };
  }

  async getNumTokens(input: string): Promise<number> {
    const result = await this.#client.tokenizer.tokenize({
      ...(!isNullish(this.modelId) && {
        model_id: this.modelId,
      }),
      input,
      parameters: {
        return_tokens: false,
      },
    });

    return result.token_count ?? 0;
  }

  _modelType(): string {
    return this.modelId ?? 'default';
  }

  _llmType(): string {
    return 'GenAI';
  }
}
