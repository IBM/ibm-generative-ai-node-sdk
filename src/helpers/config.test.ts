import fs from 'fs';
import path from 'path';
import os from 'os';

import { lookupApiKey, lookupEndpoint } from './config.js';

vi.mock('fs');

describe('Helpers', () => {
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  describe('endpointLookup', () => {
    const EXPECTED_ENDPOINT = 'https://foobar';

    afterEach(() => {
      vi.stubEnv('GENAI_ENDPOINT', '');
    });

    test('should read endpoint from the env variable', () => {
      process.env.GENAI_ENDPOINT = EXPECTED_ENDPOINT;
      const endpoint = lookupEndpoint();
      expect(endpoint).toEqual(EXPECTED_ENDPOINT);
    });

    test('should use default endpoint', () => {
      const endpoint = lookupEndpoint();
      expect(endpoint).toEqual(process.env.GENAI_DEFAULT_ENDPOINT);
    });
  });

  describe('apiKeyLookup', () => {
    const EXPECTED_API_KEY = 'foobar';

    afterEach(() => {
      vi.stubEnv('GENAI_API_KEY', '');
    });

    test('should read apiKey from the env variable', () => {
      process.env.GENAI_API_KEY = EXPECTED_API_KEY;
      const apiKey = lookupApiKey();
      expect(apiKey).toEqual(EXPECTED_API_KEY);
    });

    test('should read apiKey from the user configuration', () => {
      delete process.env.GENAI_API_KEY;
      const expectedPath = path.join(os.homedir(), '.genai', 'credentials.yml');
      vi.spyOn(fs, 'existsSync').mockReturnValueOnce(true);
      const spy = vi
        .spyOn(fs, 'readFileSync')
        .mockReturnValueOnce(`apiKey: ${EXPECTED_API_KEY}`);
      const apiKey = lookupApiKey();
      expect(spy).toBeCalledWith(expectedPath, 'utf8');
      expect(apiKey).toEqual(EXPECTED_API_KEY);
    });

    test('should not read anything', () => {
      const apiKey = lookupApiKey();
      expect(apiKey).toEqual(null);
    });
  });
});
