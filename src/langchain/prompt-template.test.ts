import { PromptTemplate } from 'langchain/prompts';

import { InvalidInputError } from '../errors.js';

import { GenAIPromptTemplate } from './prompt-template.js';

describe('Prompt Templates', () => {
  it('throws when unknown template type passed', () => {
    expect(() => {
      const template = PromptTemplate.fromTemplate(`Hello {name}`);
      (template.templateFormat as string) = 'unknown';
      GenAIPromptTemplate.fromLangChain(template);
    }).toThrow(InvalidInputError);
  });

  it('converts LangChain Prompt Template (f-string) to GenAI Prompt Template', () => {
    const result = GenAIPromptTemplate.fromLangChain(
      PromptTemplate.fromTemplate(
        `Tell me a {adjective} joke about {content}.`,
      ),
    );
    expect(result).toMatchInlineSnapshot(
      '"Tell me a {{adjective}} joke about {{content}}."',
    );
  });

  it('converts GenAI Prompt Template to GenAI Prompt Template', () => {
    const result = GenAIPromptTemplate.toLangChain(
      `Tell me a {{adjective}} joke about {{content}}.`,
    );
    expect(result.template).toMatchInlineSnapshot(
      '"Tell me a {adjective} joke about {content}."',
    );
  });
});
