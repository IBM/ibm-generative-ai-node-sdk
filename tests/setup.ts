import { server } from './mocks/server.js';
import { resetStores } from './mocks/handlers.js';

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterAll(() => server.close());
afterEach(() => {
  resetStores();
  server.resetHandlers();
});
