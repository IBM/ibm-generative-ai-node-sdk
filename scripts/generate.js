import fs from 'node:fs';

import openapiTS from 'openapi-typescript';

const contents = await openapiTS(
  new URL(process.env.SCHEMA_URL, import.meta.url),
  {
    transform(schemaObject, metadata) {
      if ('format' in schemaObject && schemaObject.format === 'binary') {
        return schemaObject.nullable ? 'Readable | null' : 'Readable';
      }
    },
  },
);

// (optional) write to file
fs.writeFileSync('./src/api/schema.d.ts', contents);
