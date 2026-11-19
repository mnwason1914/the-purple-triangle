// Git without the system git binary (used when Xcode's command-line tools are unavailable).
//   node scripts/jsgit.mjs commit "message"   stage all changes on main, commit, push
//   node scripts/jsgit.mjs pages              push dist/ to the gh-pages branch
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node/index.js';

const URL = 'https://github.com/mnwason1914/the-purple-triangle.git';
const token = execSync('gh auth token').toString().trim();
const onAuth = () => ({ username: 'x-access-token', password: token });
const gcfg = ['.git/config', path.join(os.homedir(), '.gitconfig')].map((f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '')).join('\n');
const author = { name: gcfg.match(/^\s*name\s*=\s*(.+)$/m)?.[1].trim() ?? 'mnwason1914', email: gcfg.match(/^\s*email\s*=\s*(.+)$/m)?.[1].trim() ?? 'mnwason1914@users.noreply.github.com' };
const [cmd, msg] = process.argv.slice(2);

async function stageAll(dir) {
  const status = await git.statusMatrix({ fs, dir });
  for (const [file, head, work] of status) {
    if (work === 0) await git.remove({ fs, dir, filepath: file });
    else if (head !== work || work === 2) await git.add({ fs, dir, filepath: file });
  }
}

if (cmd === 'commit') {
  const dir = process.cwd();
  await stageAll(dir);
  const sha = await git.commit({ fs, dir, author, message: msg + '\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n' });
  await git.push({ fs, http, dir, url: URL, ref: 'main', remoteRef: 'main', onAuth });
  console.log('committed and pushed', sha.slice(0, 7));
} else if (cmd === 'pages') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pt-pages-'));
  // Godot build is the main game; the older TypeScript build stays reachable under /classic/.
  fs.cpSync('dist-godot', dir, { recursive: true });
  fs.cpSync('dist', path.join(dir, 'classic'), { recursive: true });
  // Phones that opened the old site have its service worker installed at the root. Replace it with
  // one that clears the old caches and removes itself, so they load the Godot build fresh.
  fs.writeFileSync(path.join(dir, 'sw.js'), "self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.map(n=>caches.delete(n)))).then(()=>self.registration.unregister()).then(()=>self.clients.matchAll()).then(cs=>cs.forEach(c=>c.navigate(c.url)))));\n");
  fs.writeFileSync(path.join(dir, '.nojekyll'), '');
  await git.init({ fs, dir, defaultBranch: 'gh-pages' });
  await stageAll(dir);
  await git.commit({ fs, dir, author, message: `Deploy ${new Date().toISOString()}` });
  await git.push({ fs, http, dir, url: URL, ref: 'gh-pages', remoteRef: 'gh-pages', force: true, onAuth });
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('Deployed: https://mnwason1914.github.io/the-purple-triangle/');
} else console.log('usage: commit "msg" | pages');
