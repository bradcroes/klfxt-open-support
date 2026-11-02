import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const tree = JSON.parse(
  execFileSync('npm', ['ls', '--omit=dev', '--all', '--json'], { encoding: 'utf8' }),
);
const names = new Set();
function walk(node) {
  for (const [name, dep] of Object.entries(node.dependencies || {})) {
    names.add(name);
    walk(dep);
  }
}
walk(tree);
let text =
  '# Third-party runtime notices\n\nGenerated from installed, locked runtime dependencies. Project license does not replace these licenses.\n\n';
for (const name of [...names].sort()) {
  const dir = 'node_modules/' + name;
  const info = JSON.parse(await readFile(dir + '/package.json', 'utf8'));
  let license = '';
  for (const file of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license'])
    try {
      license = await readFile(dir + '/' + file, 'utf8');
      break;
    } catch {}
  if (!license) throw new Error('Missing license text for ' + name);
  text += `## ${name} ${info.version}\n\nLicense: ${info.license}\n\n\`\`\`text\n${license.trim()}\n\`\`\`\n\n`;
}
await writeFile('THIRD_PARTY_NOTICES.md', text);
console.log(`Runtime notices generated for ${names.size} packages.`);
