import fs from 'node:fs';

import openapiTS from 'openapi-typescript';

// https://openapi-ts.pages.dev/6.x/node#example-blob-types
const contents = await openapiTS(
  new URL(process.env.SCHEMA_URL, import.meta.url),
  {
    transform(schemaObject, metadata) {
      if ('format' in schemaObject && schemaObject.format === 'binary') {
        return schemaObject.nullable ? 'Blob | null' : 'Blob';
      }
    },
  },
);

// (optional) write to file
fs.writeFileSync('./src/api/schema.d.ts', contents);
