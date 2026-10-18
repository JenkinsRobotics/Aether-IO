import { createProject } from './model';
/** The same project constructor used by IO's editor and template browser. */
export function createDocument(name: string, blank = true): File {
  const base = name.trim().replace(/\.aetherio$/i, '').trim();
  if (!base) throw new Error('Enter a circuit name.');
  return new File([JSON.stringify(createProject(base, blank))], `${base}.aetherio`, { type: 'application/json' });
}
