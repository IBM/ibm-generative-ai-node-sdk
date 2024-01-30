import { BaseService } from '../BaseService.js';
import { ApiClient } from '../../api/client.js';
import { SteamingApiClient } from '../../api/streaming-client.js';

import { TextGenerationService } from './TextGenerationService.js';

export class TextService extends BaseService {
  public readonly generation: TextGenerationService;

  constructor(client: ApiClient, streamingClient: SteamingApiClient) {
    super(client, streamingClient);
    this.generation = new TextGenerationService(client, streamingClient);
  }
}
