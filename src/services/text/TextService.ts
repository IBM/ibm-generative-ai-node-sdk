import { BaseService } from '../BaseService.js';
import { ApiClient } from '../../api/client.js';
import { SteamingApiClient } from '../../api/streaming-client.js';

import { TextGenerationService } from './TextGenerationService.js';
import { TextTokenizationService } from './TextTokenizationService.js';
import { TextEmbeddingService } from './TextEmbeddingService.js';
import { TextChatService } from './TextChatService.js';

export class TextService extends BaseService {
  public readonly generation: TextGenerationService;
  public readonly tokenization: TextTokenizationService;
  public readonly embedding: TextEmbeddingService;
  public readonly chat: TextChatService;

  constructor(client: ApiClient, streamingClient: SteamingApiClient) {
    super(client, streamingClient);
    this.generation = new TextGenerationService(client, streamingClient);
    this.tokenization = new TextTokenizationService(client, streamingClient);
    this.embedding = new TextEmbeddingService(client, streamingClient);
    this.chat = new TextChatService(client, streamingClient);
  }
}
