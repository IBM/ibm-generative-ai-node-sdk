import { HumanChatMessage, SystemChatMessage } from 'langchain/schema';
import { GenAIChatModel } from '../../../langchain/index.js';

describe('LangChain Chat', () => {
  const makeClient = (stream?: boolean) =>
    new GenAIChatModel({
      modelId: 'sambanovasystems/bloomchat-176b-v1',
      stream,
      configuration: {
        endpoint: process.env.ENDPOINT,
        apiKey: process.env.API_KEY,
      },
      parameters: {
        decoding_method: 'greedy',
        min_new_tokens: 1,
        max_new_tokens: 25,
        repetition_penalty: 1.5,
      },
      rolesMapping: {
        human: {
          name: 'human',
          stopSequence: '<human>:',
        },
        system: {
          name: 'bot',
          stopSequence: '<bot>:',
        },
      },
    });

  const expectIsNonEmptyString = (value?: unknown) => {
    expect(value).toBeString();
    expect(value).toBeTruthy();
  };

  describe('generate', () => {
    test('should handle single question', async () => {
      const chat = makeClient();

      const response = await chat.call([
        new HumanChatMessage(
          'What is a good name for a company that makes colorful socks?',
        ),
      ]);
      expectIsNonEmptyString(response.text);
    });

    test('should handle question with additional hint', async () => {
      const chat = makeClient();

      const response = await chat.call([
        new SystemChatMessage(
          'You are a helpful assistant that translates English to French.',
        ),
        new HumanChatMessage('Translate: I love programming.'),
      ]);
      expectIsNonEmptyString(response.text);
    });

    test('should handle multiple questions', async () => {
      const chat = makeClient();

      const response = await chat.generate([
        [
          new SystemChatMessage(
            'You are a helpful assistant that translates English to French.',
          ),
          new HumanChatMessage(
            'Translate this sentence from English to French. I love programming.',
          ),
        ],
        [
          new SystemChatMessage(
            'You are a helpful assistant that translates English to French.',
          ),
          new HumanChatMessage(
            'Translate this sentence from English to French. I love artificial intelligence.',
          ),
        ],
      ]);

      expect(response).toBeDefined();
      expect(response.generations).toHaveLength(2);
      expect(response.generations[0]).toHaveLength(1);
      expectIsNonEmptyString(response.generations[0][0].text);
      expect(response.generations[1]).toHaveLength(1);
      expectIsNonEmptyString(response.generations[1][0].text);
    });

    test('should handle streaming', async () => {
      const chat = makeClient(true);

      const tokens: string[] = [];
      const handleNewToken = vi.fn((token: string) => {
        tokens.push(token);
      });

      const output = await chat.call(
        [new HumanChatMessage('Tell me a joke.')],
        undefined,
        [
          {
            handleLLMNewToken: handleNewToken,
          },
        ],
      );

      expect(handleNewToken).toHaveBeenCalled();
      expectIsNonEmptyString(output.text);
      expect(tokens.join('')).toStrictEqual(output.text);
    });
  });
});
