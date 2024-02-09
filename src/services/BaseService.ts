import { ApiClient } from '../api/client.js';
import { SteamingApiClient } from '../api/streaming-client.js';

export class BaseService {
  constructor(
    protected readonly _client: ApiClient,
    protected readonly _streamingClient: SteamingApiClient,
  ) {}
}
