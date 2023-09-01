import {
  Callback,
  HttpHandlerOptions,
  TokenizeInput,
  TokenizeOutput,
} from '../client/types.js';
import { handle } from '../helpers/common.js';
import * as ApiTypes from '../api-types.js';
import { InvalidInputError } from '../errors.js';
import { BaseService } from './BaseService.js';

export class TokenizerService extends BaseService {
  tokenize(
    input: TokenizeInput,
    options?: HttpHandlerOptions,
  ): Promise<TokenizeOutput>;
  tokenize(
    input: TokenizeInput,
    options: HttpHandlerOptions,
    callback: Callback<TokenizeOutput>,
  ): void;
  tokenize(input: TokenizeInput, callback: Callback<TokenizeOutput>): void;
  tokenize(
    { input, ...restInput }: TokenizeInput,
    optionsOrCallback?: HttpHandlerOptions | Callback<TokenizeOutput>,
    callback?: Callback<TokenizeOutput>,
  ): Promise<TokenizeOutput> | void {
    return handle(
      {
        optionsOrCallback,
        callback,
      },
      async ({ options }) => {
        const { results } = await this.fetcher.fetch<
          ApiTypes.TokenizeOutput,
          ApiTypes.TokenizeInput
        >({
          ...options,
          method: 'POST',
          url: '/v1/tokenize',
          data: {
            ...restInput,
            use_default: true,
            inputs: [input],
          },
          stream: false,
        });

        if (results.length !== 1) {
          throw new InvalidInputError('Unexpected number of results');
        }

        return results[0];
      },
    );
  }
}
