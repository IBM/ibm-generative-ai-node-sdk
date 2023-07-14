import { GenAIPromptTemplate } from '../../src/langchain/index.js';
import { PromptTemplate } from 'langchain/prompts';

{
  // Converting the LangChain Prompt Template (f-string) to GenAI Prompt Template'
  const result = GenAIPromptTemplate.fromLangChain(
    PromptTemplate.fromTemplate(`Tell me a {adjective} joke about {content}.`),
  );
  console.log(result); // "Tell me a {{adjective}} joke about {{content}}."
}

{
  // Converting the GenAI Prompt Template to LangChain Prompt Template
  const result = GenAIPromptTemplate.toLangChain(
    `Tell me a {{adjective}} joke about {{content}}.`,
  );
  console.log(result); // "Tell me a {adjective} joke about {content}."
}
