import { GenerateService } from '../services/GenerateService.js';
import { HttpHandlerOptions } from './types.js';
import { TokenizerService } from '../services/TokenizerService.js';
import { FetchService } from '../services/FetchService.js';
import { RETRY_ATTEMPTS_DEFAULT } from '../constants.js';
import { setupCache } from 'axios-cache-interceptor';
import axios from 'axios';
import http from 'node:http';
import https from 'node:https';
import { lookupApiKey, lookupEndpoint } from '../helpers/config.js';
import { InvalidInputError } from '../errors.js';
import { version } from '../buildInfo.js';
import { ModelService } from '../services/ModelService.js';
import { TuneService } from '../services/TuneService.js';
import { PromptTemplatesService } from '../services/PromptTemplatesService.js';
import { FileService } from '../services/FileService.js';
import { HistoryService } from '../services/HistoryService.js';

type Constructor<K, P extends any[]> = { new (...args: P): K };
type AnyConstructor<P = any> = abstract new (...args: any) => P;
type InheritedConstructor<T, P extends AnyConstructor> = Constructor<
  T,
  ConstructorParameters<P>
>;

interface ClientServices<A, B, C, D, E, F, G> {
  generate: InheritedConstructor<A, typeof GenerateService>;
  tokenizer: InheritedConstructor<B, typeof TokenizerService>;
  models: InheritedConstructor<C, typeof ModelService>;
  tunes: InheritedConstructor<D, typeof TuneService>;
  promptTemplates: InheritedConstructor<E, typeof PromptTemplatesService>;
  files: InheritedConstructor<F, typeof FileService>;
  history: InheritedConstructor<G, typeof HistoryService>;
}

export type RawHeaders = Record<string, string>;

export interface Configuration {
  apiKey?: string;
  endpoint?: string;
  headers?: RawHeaders;
  retries?: HttpHandlerOptions['retries'];
}

const BaseServices: ClientServices<
  GenerateService,
  TokenizerService,
  ModelService,
  TuneService,
  PromptTemplatesService,
  FileService,
  HistoryService
> = {
  generate: GenerateService,
  tokenizer: TokenizerService,
  models: ModelService,
  tunes: TuneService,
  promptTemplates: PromptTemplatesService,
  files: FileService,
  history: HistoryService,
} as const;

export class Client<
  A extends GenerateService = GenerateService,
  B extends TokenizerService = TokenizerService,
  C extends ModelService = ModelService,
  D extends TuneService = TuneService,
  E extends PromptTemplatesService = PromptTemplatesService,
  F extends FileService = FileService,
  G extends HistoryService = HistoryService,
> {
  public readonly generate: A;
  public readonly tokenizer: B;
  public readonly models: C;
  public readonly tunes: D;
  public readonly promptTemplates: E;
  public readonly files: F;
  public readonly history: G;

  constructor({
    services,
    config = {},
  }: {
    config?: Configuration;
    services?: Partial<ClientServices<A, B, C, D, E, F, G>>;
  }) {
    const initFetcher = () => {
      const endpoint = config.endpoint ?? lookupEndpoint();
      if (!endpoint) {
        throw new InvalidInputError('Configuration endpoint is missing!');
      }

      const apiKey = config.apiKey ?? lookupApiKey();
      if (!apiKey) {
        throw new InvalidInputError('Configuration API key is missing!');
      }

      const agent = version ? `node-sdk/${version}` : 'node-sdk';
      const options = {
        endpoint,
        apiKey,
        headers: {
          'User-Agent': agent,
          'X-Request-Origin': agent,
          ...config.headers,
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        retries: config.retries ?? RETRY_ATTEMPTS_DEFAULT,
      };

      return new FetchService(
        setupCache(
          axios.create({
            baseURL: endpoint,
            headers: options.headers,
            httpAgent: new http.Agent({ keepAlive: true }),
            httpsAgent: new https.Agent({ keepAlive: true }),
            maxRedirects: 0,
            transitional: {
              clarifyTimeoutError: true,
            },
          }),
        ),
        options,
      );
    };
    const fetcher = initFetcher();

    type Services = ClientServices<A, B, C, D, E, F, G>;
    const locateService = <T extends keyof Services>(name: T): Services[T] => {
      if (services?.[name]) {
        return services[name] as Services[T];
      }
      return BaseServices[name] as Services[T];
    };

    this.generate = new (locateService('generate'))(fetcher);
    this.tokenizer = new (locateService('tokenizer'))(fetcher);
    this.models = new (locateService('models'))(fetcher);
    this.tunes = new (locateService('tunes'))(fetcher);
    this.promptTemplates = new (locateService('promptTemplates'))(fetcher);
    this.files = new (locateService('files'))(fetcher);
    this.history = new (locateService('history'))(fetcher);
  }
}
