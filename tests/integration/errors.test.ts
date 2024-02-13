import fetch from 'cross-fetch';

import { createApiClient } from '../../src/api/client.js';
import { BaseError, HttpError, NetworkError } from '../../src/errors.js';
import { clientErrorWrapper } from '../../src/utils/errors.js';
import { MOCK_ENDPOINT } from '../mocks/handlers.js';

describe('errors', () => {
  test('should fail with network error', async () => {
    const client = createApiClient({ baseUrl: 'http://invalidhost', fetch });
    try {
      await clientErrorWrapper(
        client.GET('/v2/models', {
          params: { query: { limit: 100, offset: 0, version: '2023-11-22' } },
        }),
      );
    } catch (err) {
      console.log(err);
    }
    await expect(
      clientErrorWrapper(
        client.GET('/v2/models', {
          params: { query: { limit: 100, offset: 0, version: '2023-11-22' } },
        }),
      ),
    ).rejects.toBeInstanceOf(NetworkError);
  });

  test('should fail with http error', async () => {
    const client = createApiClient({ baseUrl: MOCK_ENDPOINT, fetch });
    await expect(
      clientErrorWrapper(
        client.GET('/error' as '/v2/models', {
          params: { query: { limit: 100, offset: 0, version: '2023-11-22' } },
        }),
      ),
    ).rejects.toBeInstanceOf(HttpError);
  });

  test('should fail with abort error', async () => {
    const client = createApiClient({ baseUrl: MOCK_ENDPOINT, fetch });
    const controller = new AbortController();
    controller.abort();

    const promise = clientErrorWrapper(
      client.GET('/v2/models', {
        params: { query: { limit: 100, offset: 0, version: '2023-11-22' } },
        signal: controller.signal,
      }),
    );

    await expect(promise).rejects.toThrowError('The user aborted a request.');
    await expect(promise).rejects.not.toBeInstanceOf(BaseError);
  });
});
