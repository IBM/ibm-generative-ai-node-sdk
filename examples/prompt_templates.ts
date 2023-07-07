import { Client } from '../src/index.js';

const client = new Client({
  apiKey: process.env.GENAI_API_KEY,
});

{
  // List all prompt templates
  for await (const promptTemplate of client.promptTemplates()) {
    console.log(promptTemplate);
  }
}

{
  // List all prompt templates via callback approach
  client.promptTemplates((err, promptTemplate) => {
    if (err) console.error(err);
    console.log(promptTemplate);
  });
}

{
  // Create a new prompt template
  const newTemplate = await client.promptTemplate({
    name: 'greeting template',
    value: 'Hello {{name}}!',
  });
  console.log(newTemplate);

  // Show details of the prompt template
  const promptTemplate = await client.promptTemplate({ id: newTemplate.id });
  console.log(promptTemplate);

  // Update the prompt template
  const updatedTemplate = await client.promptTemplate({
    id: newTemplate.id,
    name: 'My greeting template',
  });
  console.log(updatedTemplate);

  // Delete the prompt template
  await client.promptTemplate({ id: promptTemplate.id }, { delete: true });
}

{
  // Output prompt template
  const results = await client.promptTemplateExecute({
    inputs: ['1+1', '2+2', '3+3'],
    template: {
      value: 'Hello {{name}}, how much is {{input}}?',
      data: {
        name: 'GENAI',
      },
    },
  });
  console.log(results);
}
