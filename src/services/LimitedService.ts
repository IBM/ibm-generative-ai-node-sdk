import { ApiClient } from '../api/client.js';
import { SteamingApiClient } from '../api/streaming-client.js';
import { ConcurrencyLimiter } from '../utils/concurrency.js';

import { BaseService } from './BaseService.js';

export abstract class LimitedService extends BaseService {
  constructor(
    protected readonly _client: ApiClient,
    protected readonly _streamingClient: SteamingApiClient,
    protected readonly _limiter: ConcurrencyLimiter,
  ) {
    super(_client, _streamingClient);
  }
}
