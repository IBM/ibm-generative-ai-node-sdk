import { HumanMessage, SystemMessage } from '@langchain/core/messages';

import { GenAIChatModel } from '../../../src/langchain/index.js';

// Remove once some chat models will be supported in target env
describe('LangChain Chat', () => {
  const makeClient = (stream?: boolean) =>
    new GenAIChatModel({
      modelId: 'meta-llama/llama-2-70b-chat',
      stream,
      configuration: {
        endpoint: process.env.ENDPOINT,
        apiKey: process.env.API_KEY,
      },
      parameters: {
        decoding_method: 'greedy',
        min_new_tokens: 1,
        max_new_tokens: 25,
        repetition_penalty: 2,
      },
      rolesMapping: {
        human: {
          stopSequence: '<human>:',
        },
        system: {
          stopSequence: '<bot>:',
        },
      },
    });

  const expectIsNonEmptyString = (value?: unknown) => {
    expect(value).toBeString();
    expect(value).toBeTruthy();
  };

  describe('generate', () => {
    const SYSTEM_MESSAGE = [
      `You are a reliable English-to-French translation assistant.`,
      `Your task is to accurately translate English text into French.`,
      `Focus solely on providing the translation without including any additional information or content.`,
    ].join(' ');

    test('should handle single question', async () => {
      const chat = makeClient();

      const response = await chat.invoke([
        new HumanMessage(
          'What is a good name for a company that makes colorful socks?',
        ),
      ]);
      expectIsNonEmptyString(response.content);
    });

    test('should handle question with additional hint', async () => {
      const chat = makeClient();

      const response = await chat.invoke([
        new SystemMessage(SYSTEM_MESSAGE),
        new HumanMessage('I love programming.'),
      ]);
      expectIsNonEmptyString(response.content);
    });

    test('should handle multiple questions', async () => {
      const chat = makeClient();

      const response = await chat.generate([
        [
          new SystemMessage(SYSTEM_MESSAGE),
          new HumanMessage('I love programming.'),
        ],
        [
          new SystemMessage(SYSTEM_MESSAGE),
          new HumanMessage('I love artificial intelligence.'),
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

      const output = await chat.invoke([new HumanMessage('Tell me a joke.')], {
        callbacks: [{ handleLLMNewToken: handleNewToken }],
      });

      expect(handleNewToken).toHaveBeenCalled();
      expectIsNonEmptyString(output.content);
      expect(tokens.join('')).toStrictEqual(output.content);
    });
  });
});
