import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

import YAML from 'yaml';

export function lookupEndpoint(): string | null {
  return (
    process.env.GENAI_ENDPOINT || process.env.GENAI_DEFAULT_ENDPOINT || null
  );
}

export function lookupApiKey(): string | null {
  if (process.env.GENAI_API_KEY) {
    return process.env.GENAI_API_KEY;
  }

  const credentialsPath = path.join(os.homedir(), '.genai', 'credentials.yml');
  if (fs.existsSync(credentialsPath)) {
    try {
      const fileContent = fs.readFileSync(credentialsPath, 'utf8');
      return YAML.parse(fileContent).apiKey;
    } catch (err) {
      console.warn('Failed to read credentials');
    }
  }

  return null;
}
