import {
  BaseChatModel,
  BaseChatModelParams,
} from '@langchain/core/language_models/chat_models';
import {
  BaseMessage,
  MessageType,
  SystemMessage,
} from '@langchain/core/messages';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { ChatResult } from '@langchain/core/outputs';

import { InvalidInputError } from '../errors.js';
import { concatUnique } from '../helpers/common.js';
import type { RequiredPartial } from '../helpers/types.js';
import { TextGenerationCreateOutput } from '../schema.js';

import { GenAIModel, GenAIModelOptions } from './llm.js';

export type RolesMapping = RequiredPartial<
  Record<
    MessageType,
    {
      stopSequence: string;
    }
  >,
  'system'
>;

type Options = BaseChatModelParams &
  GenAIModelOptions & {
    rolesMapping: RolesMapping;
  };

export class GenAIChatModel extends BaseChatModel {
  readonly #model: GenAIModel;
  readonly #rolesMapping: RolesMapping;

  constructor(options: Options) {
    super(options);

    this.#rolesMapping = options.rolesMapping;

    this.#model = new GenAIModel({
      ...options,
      parameters: {
        ...options.parameters,
        stop_sequences: concatUnique(
          options.parameters?.stop_sequences,
          Object.values(options.rolesMapping).map((role) => role.stopSequence),
        ),
      },
      configuration: {
        ...options.configuration,
        // retries: options.maxRetries ?? options.configuration?.retries, TODO reintroduce when client has support
      },
    });
  }

  async _generate(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun,
  ): Promise<ChatResult> {
    const message = messages
      .map((msg) => {
        const type = this.#rolesMapping[msg._getType()];
        if (!type) {
          throw new InvalidInputError(
            `Unsupported message type "${msg._getType()}"`,
          );
        }
        return `${type.stopSequence}${msg.content}`;
      })
      .join('\n')
      .concat(this.#rolesMapping.system.stopSequence);

    const output = await this.#model._generate([message], options, runManager);

    return {
      generations: output.generations.map(([generation]) => ({
        message: new SystemMessage(generation.text),
        generationInfo: generation.generationInfo,
        text: generation.text,
      })),
      llmOutput: output.llmOutput,
    };
  }

  _combineLLMOutput(...llmOutputs: TextGenerationCreateOutput[]) {
    return llmOutputs
      .flatMap((output) => output.results?.at(0) ?? [])
      .reduce(
        (acc, gen) => {
          acc.tokenUsage.generated_token_count +=
            gen.generated_token_count || 0;
          acc.tokenUsage.input_token_count += gen.input_token_count || 0;

          return acc;
        },
        {
          tokenUsage: {
            generated_token_count: 0,
            input_token_count: 0,
          },
        },
      );
  }

  _llmType(): string {
    return 'GenAIChat';
  }

  _modelType(): string {
    return this.#model._modelType();
  }
}
