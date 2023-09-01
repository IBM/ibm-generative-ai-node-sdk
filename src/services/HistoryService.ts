import { BaseService } from './BaseService.js';
import {
  Callback,
  HistoryInput,
  HistoryOptions,
  HistoryOutput,
} from '../client/types.js';
import { handleGenerator, paginator } from '../helpers/common.js';
import * as ApiTypes from '../api-types.js';

export class HistoryService extends BaseService {
  list(callback: Callback<HistoryOutput>): void;
  list(input: HistoryInput, callback: Callback<HistoryOutput>): void;
  list(
    input: HistoryInput,
    options: HistoryOptions,
    callback: Callback<HistoryOutput>,
  ): void;
  list(
    input?: HistoryInput,
    options?: HistoryOptions,
  ): AsyncGenerator<HistoryOutput>;
  list(
    inputOrCallback?: HistoryInput | Callback<HistoryOutput>,
    optionsOrCallback?: HistoryOptions | Callback<HistoryOutput>,
    callback?: Callback<HistoryOutput>,
  ): AsyncGenerator<HistoryOutput> | void {
    return handleGenerator<
      HistoryInput | Callback<HistoryOutput>,
      HistoryOptions | Callback<HistoryOutput>,
      Callback<HistoryOutput>,
      HistoryOutput
    >(
      {
        inputOrOptionsOrCallback: inputOrCallback,
        optionsOrCallback,
        callback,
      },
      ({ input, options }) => {
        const params = new URLSearchParams();
        if (input?.status) params.set('status', input.status);
        if (input?.origin) params.set('origin', input.origin);

        return paginator(
          (paginatorParams) =>
            this.fetcher.fetch(
              {
                ...options,
                method: 'GET',
                url: `/v1/requests?${paginatorParams.toString()}`,
                cache: false,
              },
              ApiTypes.HistoryOutputSchema,
            ),
          {
            offset: input?.offset ?? undefined,
            count: input?.count ?? undefined,
            params,
          },
        );
      },
    );
  }
}
