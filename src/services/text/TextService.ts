import { BaseService } from '../BaseService.js';
import { ApiClient } from '../../api/client.js';
import { SteamingApiClient } from '../../api/streaming-client.js';
import { ConcurrencyLimiter } from '../../utils/concurrency.js';
import { clientErrorWrapper } from '../../utils/errors.js';

import { TextGenerationService } from './TextGenerationService.js';
import { TextTokenizationService } from './TextTokenizationService.js';
import { TextEmbeddingService } from './TextEmbeddingService.js';
import { TextChatService } from './TextChatService.js';
import { TextSentenceSimilarityService } from './TextSentenceSimilarityService.js';

export class TextService extends BaseService {
  public readonly generation: TextGenerationService;
  public readonly tokenization: TextTokenizationService;
  public readonly embedding: TextEmbeddingService;
  public readonly chat: TextChatService;
  public readonly experimental: {
    sentenceSimilarity: TextSentenceSimilarityService;
  };

  constructor(client: ApiClient, streamingClient: SteamingApiClient) {
    super(client, streamingClient);

    const generationLimiter = new ConcurrencyLimiter(async () => {
      const {
        result: { concurrency },
      } = await clientErrorWrapper(
        this._client.GET('/v2/text/generation/limits', {
          params: { query: { version: '2023-11-22' } },
        }),
      );
      return concurrency;
    });
    const embeddingLimiter = new ConcurrencyLimiter(async () => {
      const {
        result: { concurrency },
      } = await clientErrorWrapper(
        this._client.GET('/v2/text/embeddings/limits', {
          params: { query: { version: '2023-11-22' } },
        }),
      );
      return concurrency;
    });

    this.generation = new TextGenerationService(
      client,
      streamingClient,
      generationLimiter,
    );
    this.tokenization = new TextTokenizationService(client, streamingClient);
    this.embedding = new TextEmbeddingService(
      client,
      streamingClient,
      embeddingLimiter,
    );
    this.chat = new TextChatService(client, streamingClient, generationLimiter);
    this.experimental = {
      sentenceSimilarity: new TextSentenceSimilarityService(
        client,
        streamingClient,
        embeddingLimiter,
      ),
    };
  }
}
