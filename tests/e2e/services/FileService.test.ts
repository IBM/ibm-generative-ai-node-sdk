import { FileService } from '../../../src/services/FileService.js';
import { Client } from '../../../src/client.js';

describe('FileService', () => {
  let fileService: FileService;
  beforeAll(() => {
    fileService = new Client({
      endpoint: process.env.ENDPOINT,
      apiKey: process.env.API_KEY,
    }).file;
  });

  test('should upload, download and delete a file', async () => {
    const content = JSON.stringify('foobar');
    const filename = 'foobar.json';
    const type = 'application/json';
    const file = await fileService.create({
      purpose: 'template',
      file: {
        content: new Blob([content], { type }),
        name: filename,
      },
    });
    expect(file.result.file_name).toEqual(filename);
    const blob = await fileService.read({ id: file.result.id });
    expect(await blob.text()).toEqual(content);
    await expect(fileService.delete({ id: file.result.id })).toResolve();
  });
});
