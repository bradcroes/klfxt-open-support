import { readFile, writeFile, copyFile, mkdir, cp } from 'node:fs/promises';
import path from 'node:path';
import MarkdownIt from 'markdown-it';
const files = [
  'README.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'CHANGELOG.md',
  'SECURITY.md',
  'THIRD_PARTY_NOTICES.md',
  'LICENSE',
  'NOTICE',
  'docs/installation.md',
  'docs/deployment.md',
  'docs/development.md',
  'docs/privacy.md',
  'docs/api-contract.md',
  'docs/roadmap.md',
  'docs/release-checklist.md',
  'docs/verification.md',
];
const targets = new Map(files.map((f) => [f, path.basename(f).replace(/\.md$/, '') + '.html']));
await mkdir('dist/docs', { recursive: true });
const escape = (s) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
for (const file of files) {
  const md = new MarkdownIt({ html: false, linkify: false });
  const defaultImage = md.renderer.rules.image;
  md.renderer.rules.image = (tokens, i, options, env, self) => {
    const src = tokens[i].attrGet('src') || '';
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), src));
    if (target.startsWith('docs/images/')) tokens[i].attrSet('src', '/' + target);
    return defaultImage(tokens, i, options, env, self);
  };
  const defaultLink =
    md.renderer.rules.link_open ||
    ((tokens, i, options, env, self) => self.renderToken(tokens, i, options));
  md.renderer.rules.link_open = (tokens, i, options, env, self) => {
    const href = tokens[i].attrGet('href');
    if (href && !/^(?:[a-z]+:|#|\/)/i.test(href)) {
      const [relative, hash] = href.split('#');
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), relative));
      if (targets.has(target))
        tokens[i].attrSet('href', targets.get(target) + (hash ? '#' + hash : ''));
    }
    return defaultLink(tokens, i, options, env, self);
  };
  const ids = new Map();
  md.renderer.rules.heading_open = (tokens, i, options, env, self) => {
    const heading = tokens[i + 1]?.content || '';
    const slug = heading
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-');
    const count = ids.get(slug) || 0;
    ids.set(slug, count + 1);
    tokens[i].attrSet('id', slug + (count ? '-' + count : ''));
    return self.renderToken(tokens, i, options);
  };
  const text = await readFile(file, 'utf8');
  const body = file.endsWith('.md') ? md.render(text) : '<pre>' + escape(text) + '</pre>';
  const title = file.split('/').at(-1);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)} · Open Support docs</title><link rel="stylesheet" href="/docs/docs.css"></head><body><header><a href="/about">KLFXT <span>Open Support</span></a><nav aria-label="Documentation"><a href="/docs/README.html">Overview</a><a href="/docs/installation.html">Install</a><a href="/docs/development.html">Develop</a><a href="/docs/CONTRIBUTING.html">Contribute</a></nav></header><main>${body}</main><footer>v0.1 alpha · Apache-2.0 · No hosted service is implied.</footer></body></html>`;
  await writeFile('dist/docs/' + targets.get(file), html);
  await copyFile(file, 'dist/docs/' + path.basename(file));
}
await writeFile(
  'dist/docs/docs.css',
  `*{box-sizing:border-box}body{font:16px/1.75 system-ui,sans-serif;color:#21312f;background:#fbfaf7;margin:0}header,main,footer{max-width:900px;margin:auto;padding:28px}header{border-bottom:1px solid #d9dfd8}header>a{font-weight:800;text-decoration:none;color:#123c36}header span{font-weight:400}nav{display:flex;gap:22px;flex-wrap:wrap;margin-top:18px;font-size:14px}a{color:#125e54;text-underline-offset:3px}a:focus-visible{outline:3px solid #a85e21;outline-offset:4px}h1,h2,h3{line-height:1.25;letter-spacing:-.03em;color:#153c34}h1{font-size:38px}h2{font-size:27px;margin-top:42px}pre{overflow:auto;padding:18px;background:#eef0eb;border-radius:9px;font-size:13px}code{font-size:.9em}p,li{overflow-wrap:anywhere}img{max-width:100%;height:auto;border:1px solid #d9dfd8;border-radius:8px}table{display:block;overflow:auto;border-collapse:collapse;font-size:14px}th,td{padding:10px;border:1px solid #d9dfd8}blockquote{border-left:3px solid #a6beb0;padding-left:20px}footer{border-top:1px solid #d9dfd8;font-size:12px;color:#5b6b61}@media(max-width:500px){header,main,footer{padding:20px}h1{font-size:31px}}`,
);
console.log('Built static, script-free documentation pages.');

await cp('docs/images', 'dist/docs/images', { recursive: true });
