import { FetchService } from './FetchService.js';

export abstract class BaseService {
  protected readonly fetcher: FetchService;

  constructor(fetcher: FetchService) {
    this.fetcher = fetcher;
  }
}
