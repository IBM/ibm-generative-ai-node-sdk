import fetchRetry from 'fetch-retry';
import fetch from 'cross-fetch';

import { InvalidInputError } from './errors.js';
import { version } from './buildInfo.js';
import { lookupApiKey, lookupEndpoint } from './helpers/config.js';
import { createApiClient } from './api/client.js';
import { createStreamingApiClient } from './api/streaming-client.js';
import { TextService } from './services/text/TextService.js';
import { ModelService } from './services/ModelService.js';
import { PromptService } from './services/PromptService.js';
import { RequestService } from './services/RequestService.js';
import { TuneService } from './services/TuneService.js';
import { UserService } from './services/UserService.js';
import { FileService } from './services/FileService.js';
import { SystemPromptService } from './services/SystemPromptService.js';

export interface Configuration {
  apiKey?: string;
  endpoint?: string;
  headers?: Headers;
}

export type Options = { signal?: AbortSignal };

export class Client {
  public readonly text: TextService;
  public readonly model: ModelService;
  public readonly request: RequestService;
  public readonly prompt: PromptService;
  public readonly tune: TuneService;
  public readonly user: UserService;
  public readonly file: FileService;
  public readonly systemPrompt: SystemPromptService;

  constructor(config: Configuration = {}) {
    const endpoint = config.endpoint ?? lookupEndpoint();
    if (!endpoint) {
      throw new InvalidInputError('Configuration endpoint is missing!');
    }

    const apiKey = config.apiKey ?? lookupApiKey();
    if (!apiKey) {
      throw new InvalidInputError('Configuration API key is missing!');
    }

    const agent = version ? `node-sdk/${version}` : 'node-sdk';

    const headers = new Headers(config.headers);
    headers.set('user-agent', agent);
    headers.set('x-request-origin', agent);
    headers.set('authorization', `Bearer ${apiKey}`);

    const _client = createApiClient({
      baseUrl: endpoint,
      headers,
      fetch: fetchRetry(fetch) as any, // https://github.com/jonbern/fetch-retry/issues/89
    });
    const _streamingClient = createStreamingApiClient({
      baseUrl: endpoint,
      headers,
    });

    this.text = new TextService(_client, _streamingClient);
    this.model = new ModelService(_client, _streamingClient);
    this.request = new RequestService(_client, _streamingClient);
    this.prompt = new PromptService(_client, _streamingClient);
    this.tune = new TuneService(_client, _streamingClient);
    this.user = new UserService(_client, _streamingClient);
    this.file = new FileService(_client, _streamingClient);
    this.systemPrompt = new SystemPromptService(_client, _streamingClient);
  }
}
