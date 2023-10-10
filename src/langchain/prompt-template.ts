import { PromptTemplate as LangChainPromptTemplate } from 'langchain/prompts';

import type { PromptTemplateOutput as PromptTemplate } from '../client/types.js';
import { InvalidInputError } from '../errors.js';

export class GenAIPromptTemplate {
  static toLangChain(
    template: PromptTemplate | PromptTemplate['value'],
  ): LangChainPromptTemplate {
    const body = typeof template === 'string' ? template : template.value;
    const fString = body.replace(
      GenAIPromptTemplate.getTemplateMatcher('mustache'),
      '{$1}',
    );
    return LangChainPromptTemplate.fromTemplate(fString, {
      templateFormat: 'f-string',
      validateTemplate: true,
    });
  }

  static fromLangChain(
    template: LangChainPromptTemplate,
  ): PromptTemplate['value'] {
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
