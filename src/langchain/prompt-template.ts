import { PromptTemplate as LangChainPromptTemplate } from '@langchain/core/prompts';

import { InvalidInputError } from '../errors.js';

export class GenAIPromptTemplate {
  static toLangChain(body: string): LangChainPromptTemplate {
    const fString = body.replace(
      GenAIPromptTemplate.getTemplateMatcher('mustache'),
      '{$1}',
    );
    return LangChainPromptTemplate.fromTemplate(fString, {
      templateFormat: 'f-string',
      validateTemplate: true,
    });
  }

  static fromLangChain(template: LangChainPromptTemplate): string {
    if (typeof template.template !== 'string')
      throw new Error('Unsupported template type');

    return template.template.replace(
      GenAIPromptTemplate.getTemplateMatcher(template.templateFormat),
      '{{$1}}',
    );
  }

  private static getTemplateMatcher(name: string) {
    switch (name) {
      case 'mustache':
        return /\{\{([^}]+)\}\}/g;
      case 'jinja2':
        return /\{\{\s*(.*?)\s*\}\}/g;
      case 'fstring':
      case 'f-string':
        return /\{([^}]+)\}/g;
      default: {
        throw new InvalidInputError(`Unknown template format "${name}".`);
      }
    }
  }
}
