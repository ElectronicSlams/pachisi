import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";
import { execFileSync } from "node:child_process";
const root = fileURLToPath(new URL("../", import.meta.url));
await rm(join(root,"dist"), {recursive:true,force:true});
async function walk(dir) {
 for (const entry of await readdir(dir,{withFileTypes:true})) {
  const path=join(dir,entry.name);
  if(entry.isDirectory()) {await walk(path); continue;}
  const rel=relative(join(root,"src"),path); const target=join(root,"dist",rel.replace(/\.tsx?$/u,".js"));
  await mkdir(join(target,".."),{recursive:true});
  const source=await readFile(path,"utf8");
  if(path.endsWith(".json")) {await writeFile(target,source);await writeFile(target+".js","export default "+source+";\n");continue;}
  if(!/\.tsx?$/u.test(path)) continue;
  const result=await transform(source,{loader:extname(path)===".tsx"?"tsx":"ts",jsx:"automatic",target:"es2022",format:"esm",sourcefile:rel});
  const code=result.code.replace(/(from\s*["']|import\s*["'])(\.[^"']+)(["'])/gu,(_,pre,spec,post)=>pre+(spec.endsWith(".json")?spec+".js":/\.[a-z]+$/u.test(spec)?spec:spec+".js")+post);
  await writeFile(target,code);
 }
}
await walk(join(root,"src"));
execFileSync(process.execPath,[join(root,"node_modules/typescript/bin/tsc"),"-p","tsconfig.build.json"],{cwd:root,stdio:"inherit"});
async function fixDeclarations(dir) {
 for(const entry of await readdir(dir,{withFileTypes:true})) {
  const path=join(dir,entry.name);
  if(entry.isDirectory()){await fixDeclarations(path);continue;}
  if(!path.endsWith(".d.ts"))continue;
  const code=await readFile(path,"utf8");
  await writeFile(path,code.replace(/(from\s*["']|import\(["'])(\.[^"']+)(["'])/gu,(_,pre,spec,post)=>pre+(/\.[a-z]+$/u.test(spec)?spec:spec+".js")+post));
 }
}
await fixDeclarations(join(root,"dist"));
console.log("Built portable ESM modules and TypeScript declarations; client directives preserved.");
