import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'www');
await mkdir(out, { recursive: true });

const files = [
  'index.html', 'login.html', 'register.html', 'reset.html',
  'update-password.html', 'student.html', 'lecture.html',
  'admin.html', 'app.js', 'config.js', 'styles.css', 'auth.css',
  'manifest.json'
];
for (const file of files) {
  try {
    await cp(path.join(root, file), path.join(out, file));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
for (const dir of ['icons', 'admin']) {
  try {
    await cp(path.join(root, dir), path.join(out, dir), { recursive: true });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

// The web app uses relative URLs; ensure mobile app loads the local bundled files.
const indexPath = path.join(out, 'index.html');
let html = await readFile(indexPath, 'utf8');
html = html.replace(/<base\b[^>]*>/gi, '');
await writeFile(indexPath, html);
console.log('Prepared Future Center web assets in www/.');
