import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('android', 'app', 'src', 'main', 'java');
async function findMainActivity(dir) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); }
  catch { return null; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = await findMainActivity(full);
      if (found) return found;
    } else if (entry.name === 'MainActivity.java' || entry.name === 'MainActivity.kt') {
      return full;
    }
  }
  return null;
}

const file = await findMainActivity(root);
if (!file) throw new Error('MainActivity not found. Run npx cap add android first.');
let source = await readFile(file, 'utf8');
if (source.includes('FLAG_SECURE')) {
  console.log('FLAG_SECURE is already enabled.');
  process.exit(0);
}
if (file.endsWith('.java')) {
  source = source.replace(/(package [^;]+;\s*)/, '$1\nimport android.view.WindowManager;\n');
  source = source.replace(/(super\.onCreate\([^;]*\);)/, '$1\n        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);');
} else {
  source = source.replace(/(package [^\n]+\n)/, '$1\nimport android.view.WindowManager\n');
  source = source.replace(/(super\.onCreate\([^\n]*\))/m, '$1\n        window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)');
}
if (!source.includes('FLAG_SECURE')) throw new Error('Could not safely patch MainActivity.');
await writeFile(file, source);
console.log('Enabled Android FLAG_SECURE on the whole app window.');
