import { expect, it } from 'vitest';
import { readResume } from '../src/lib/resume';
it('reads uploaded text and rejects unsupported, oversized, empty and overlong résumés', async () => {
  const file = (name, text, size = text.length) => ({ name, size, text: async () => text });
  await expect(readResume(file('resume.txt', 'Software engineer with React experience'))).resolves.toContain('React');
  await expect(readResume(file('resume.docx', 'content'))).rejects.toThrow('PDF or .txt');
  await expect(readResume(file('resume.pdf', '', 6 * 1024 * 1024))).rejects.toThrow('5 MB');
  await expect(readResume(file('resume.txt', '   '))).rejects.toThrow('No readable text');
  await expect(readResume(file('resume.txt', 'a'.repeat(16001)))).rejects.toThrow('16,000');
});
