// npm run i18n:check [-- --locale es,ar] [-- --verbose] [-- --json]
// Checks every translation against English (see src/i18n/check.ts) and prints what's left.
// Exit code 1 when there are errors. Runs on plain Node 24 (TypeScript types are stripped).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { checkTranslations, formatReport } from '../src/i18n/check.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => {
  const i = args.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (i < 0) return undefined;
  return args[i]!.includes('=') ? args[i]!.split('=')[1] : args[i + 1];
};
const only = value('locale')?.split(',').filter(Boolean);

const res = await checkTranslations(root, only);
if (flag('json')) console.log(JSON.stringify(res, null, 2));
else console.log(formatReport(res, { verbose: flag('verbose') }));
process.exitCode = res.issues.some((i) => i.level === 'error') ? 1 : 0;
