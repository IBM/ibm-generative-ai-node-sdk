import { BaseLLM, BaseLLMParams } from '@langchain/core/language_models/llms';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import type { LLMResult, Generation } from '@langchain/core/outputs';
import { GenerationChunk } from '@langchain/core/outputs';

import { Client, Configuration } from '../client.js';
import {
  isNotEmptyArray,
  concatUnique,
  isNullish,
  asyncGeneratorToArray,
} from '../helpers/common.js';
import {
  TextGenerationCreateInput,
  TextGenerationCreateOutput,
} from '../schema.js';

type BaseGenAIModelOptions = {
  stream?: boolean;
  parameters?: Record<string, any>;
  timeout?: number;
} & (
  | { client: Client; configuration?: never }
  | { client?: never; configuration: Configuration }
);

export type GenAIModelOptions =
  | (BaseGenAIModelOptions & { modelId?: string; promptId?: never })
  | (BaseGenAIModelOptions & { modelId?: never; promptId: string });

export class GenAIModel extends BaseLLM {
  #client: Client;

  protected modelId?: string;
  protected promptId?: string;
  protected isStreaming: boolean;
  protected timeout: number | undefined;
  protected parameters: Record<string, any>;

  constructor({
    modelId,
    promptId,
    stream = false,
    parameters,
    timeout,
    client,
    configuration,
    ...baseParams
  }: GenAIModelOptions & BaseLLMParams) {
    super(baseParams ?? {});

    this.modelId = modelId;
    this.promptId = promptId;
    this.timeout = timeout;
    this.isStreaming = Boolean(stream);
    this.parameters = parameters || {};
    this.#client = client ?? new Client(configuration);
  }

  #createPayload(
    prompts: string[],
    options: this['ParsedCallOptions'],
  ): TextGenerationCreateInput[] {
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
  ): Promise<TextGenerationCreateOutput[]> {
    return await Promise.all(
      this.#createPayload(prompts, options).map((input) =>
        this.#client.text.generation.create(input, {
          signal: options.signal,
        }),
      ),
    );
  }

  async _generate(
    prompts: string[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun,
  ): Promise<LLMResult> {
    const response: TextGenerationCreateOutput[] = [];
    if (this.isStreaming) {
      const { output } = await asyncGeneratorToArray(
        this._streamResponseChunks(prompts[0], options, runManager),
      );
      response.push(output);
    } else {
      const outputs = await this.#execute(prompts, options);
      response.push(...outputs);
    }

    const contentResponses = response.flatMap(
      (res) => res.results?.at(0) ?? [],
    );

    const generations: Generation[][] = contentResponses.map(
      ({ generated_text: text, ...generationInfo }) => [
        {
          text,
          generationInfo,
        },
      ],
    );

    const llmOutput = await contentResponses.reduce(
      (acc, generation) => {
        acc.generated_token_count += generation.generated_token_count;
        acc.input_token_count += generation.input_token_count ?? 0;
        return acc;
      },
      {
        generated_token_count: 0,
        input_token_count: 0,
      },
    );

    return { generations, llmOutput };
  }

  async *_streamResponseChunks(
    _input: string,
    _options: this['ParsedCallOptions'],
    _runManager?: CallbackManagerForLLMRun,
  ): AsyncGenerator<GenerationChunk> {
    const [payload] = this.#createPayload([_input], _options);
    const stream = await this.#client.text.generation.create_stream(payload, {
      signal: _options.signal,
    });

    const fullOutput = {
      id: '',
      model_id: '',
      created_at: '',
      results: [
        {
          generated_text: '',
          stop_reason:
            'not_finished' as TextGenerationCreateOutput['results'][number]['stop_reason'],
          input_token_count: 0,
          generated_token_count: 0,
        },
      ],
    } satisfies TextGenerationCreateOutput;

    for await (const response of stream) {
      fullOutput.id = response.id ?? fullOutput.id;
      fullOutput.model_id = response.model_id;
      fullOutput.created_at = response.created_at ?? fullOutput.created_at;

      const results = response.results;
      if (!results) continue;

      const { generated_text, ...chunk } = results[0];
      const generation = new GenerationChunk({
        text: generated_text,
        generationInfo: chunk,
      });
      yield generation;
      void _runManager?.handleLLMNewToken(generated_text);

      fullOutput.results[0].generated_text += generation.text;
      if (chunk.stop_reason) {
        fullOutput.results[0].stop_reason = chunk.stop_reason;
      }
      fullOutput.results[0].input_token_count += chunk.input_token_count ?? 0;
      fullOutput.results[0].generated_token_count +=
        chunk.generated_token_count;
    }
    return fullOutput;
  }

  async getNumTokens(input: string): Promise<number> {
    const result = await this.#client.text.tokenization.create({
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
    return this.modelId ?? 'default';
  }

  _llmType(): string {
    return 'GenAI';
  }
}
