import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const required = [
  "index.html", "app.js", "styles.css", "config.js", "service-worker.js",
  "admin/index.html", "register.html", "reset.html", "update-password.html",
  "lecture.html", "student.html"
];
const failures = [];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Missing required file: ${file}`);
}
for (const file of ["app.js", "config.js", "service-worker.js"]) {
  if (!fs.existsSync(file)) continue;
  try { new vm.Script(fs.readFileSync(file, "utf8"), { filename: file }); }
  catch (e) { failures.push(`JavaScript syntax error in ${file}: ${e.message}`); }
}
for (const file of required.filter(x => x.endsWith(".html"))) {
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, "utf8");
  const tags = html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi);
  let i = 0;
  for (const match of tags) {
    i++;
    if (/\bsrc\s*=/.test(match[1]) || /\btype\s*=\s*["']application\/(?:json|ld\+json)["']/i.test(match[1])) continue;
    const code = match[2].trim();
    if (!code) continue;
    try { new vm.Script(code, { filename: `${file} inline script #${i}` }); }
    catch (e) { failures.push(`JavaScript syntax error in ${file} inline script #${i}: ${e.message}`); }
  }
}
const app = fs.existsSync("app.js") ? fs.readFileSync("app.js", "utf8") : "";
for (const feature of ["doLogin", "doRegister", "studentPage", "coursePage", "lecturePage", "lecturerPage", "profilePage", "adminPage", "saveRecord", "logout"]) {
  if (!app.includes(`function ${feature}(`) && !app.includes(`async function ${feature}(`)) failures.push(`Expected platform flow is missing: ${feature}`);
}
const admin = fs.existsSync("admin/index.html") ? fs.readFileSync("admin/index.html", "utf8") : "";
for (const feature of ["verifyAdmin", "uploadLectureAsset", "saveSiteSettings", "deleteAuthAccount", "adminStudents"]) {
  if (!admin.includes(`function ${feature}(`) && !admin.includes(`async function ${feature}(`)) failures.push(`Expected admin flow is missing: ${feature}`);
}
if (failures.length) {
  console.error("Future Center smoke tests FAILED");
  for (const f of failures) console.error(" - " + f);
  process.exit(1);
}
console.log(`Future Center smoke tests passed: ${required.length} required files, JavaScript syntax, and core student/admin flows checked.`);
