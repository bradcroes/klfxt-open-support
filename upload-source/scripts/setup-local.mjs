import { randomBytes } from 'node:crypto';
import { writeFile, access } from 'node:fs/promises';
const file = new URL('../.dev.vars', import.meta.url);
try {
  await access(file);
  console.log('Existing .dev.vars retained. No secrets overwritten.');
} catch {
  const secret = () => randomBytes(32).toString('base64url');
  await writeFile(
    file,
    `APP_ORIGIN=http://localhost:8787\nDEV_MODE=true\nBUSINESS_NAME="Example Service Desk"\nDEFAULT_LANGUAGE=nl\nSUPPORT_EMAIL=support@example.com\nRETENTION_DAYS=90\nADMIN_ACCESS_KEY=${secret()}\nRATE_LIMIT_SECRET=${secret()}\nMAIL_MODE=disabled\nBOOKING_URL=\nPAYMENT_URL=\n`,
    { mode: 0o600, flag: 'wx' },
  );
  console.log(
    'Created ignored .dev.vars with fresh local-only keys. Open it locally to obtain ADMIN_ACCESS_KEY; never commit it.',
  );
}
