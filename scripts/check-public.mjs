import { execFileSync } from 'node:child_process';
import { readFileSync, lstatSync } from 'node:fs';
const files = [
  ...new Set(
    execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
      encoding: 'utf8',
    })
      .split('\0')
      .filter(Boolean),
  ),
].sort();
const problems = [];
for (const file of files) {
  if (!lstatSync(file).isFile()) {
    problems.push({ file, reason: 'Only regular files may be published' });
    continue;
  }
  if (
    /(^|\/)(?:\.dev\.vars(?:\..+)?|\.env(?:\..+)?|wrangler\.production\.jsonc)$/.test(file) &&
    !file.endsWith('.example')
  )
    problems.push({ file, reason: 'private configuration' });
  if (
    /\.(?:sqlite(?:-wal|-shm)?|db|log|pem|key)$/i.test(file) ||
    file.startsWith('docs/research/') ||
    file.startsWith('docs/superpowers/')
  )
    problems.push({ file, reason: 'private/runtime material' });
  const text = readFileSync(file, 'utf8');
  const patterns = [
    ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    ['live API credential', /\b(?:sk_live_|rk_live_|ghp_|github_pat_|AKIA)[A-Za-z0-9_]{16,}/],
    ['local filesystem path', /\/Users\/[A-Za-z0-9._-]+\//],
    ['literal admin secret', /ADMIN_ACCESS_KEY\s*[=:]\s*["']?[A-Za-z0-9_-]{43}(?![A-Za-z0-9_-])/],
    [
      'old business deployment',
      /database_name["']?\s*:\s*["']klikgefixt-db|https:\/\/klikgefixt\.bradcroes\.workers\.dev/,
    ],
  ];
  for (const [reason, re] of patterns) if (re.test(text)) problems.push({ file, reason });
}
console.log(JSON.stringify({ publicFileCount: files.length, findings: problems }, null, 2));
if (problems.length) process.exitCode = 1;
