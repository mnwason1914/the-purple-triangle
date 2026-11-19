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
  fs.cpSync('dist', dir, { recursive: true });
  if (fs.existsSync('dist-godot')) fs.cpSync('dist-godot', path.join(dir, 'godot'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.nojekyll'), '');
  await git.init({ fs, dir, defaultBranch: 'gh-pages' });
  await stageAll(dir);
  await git.commit({ fs, dir, author, message: `Deploy ${new Date().toISOString()}` });
  await git.push({ fs, http, dir, url: URL, ref: 'gh-pages', remoteRef: 'gh-pages', force: true, onAuth });
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('Deployed: https://mnwason1914.github.io/the-purple-triangle/');
} else console.log('usage: commit "msg" | pages');
