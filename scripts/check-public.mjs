import { execFileSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
const tracked=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const failures=[];
const prohibited=[/(?:^|\/)\.env(?:\.|$)/,/(?:^|\/)(?:node_modules|\.next|\.open-next|\.release-private|runs|artifacts)(?:\/|$)/,/\.(?:sqlite|db|pem|key|tgz)$/];
const secrets=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\bAKIA[A-Z0-9]{16}\b/,/\bgh[pousr]_[A-Za-z0-9]{30,}\b/,/\bsk-(?:proj-|ant-)[A-Za-z0-9_-]{20,}\b/,/GOCSPX-[A-Za-z0-9_-]{20,}/,/\/Users\/[^/\s]+\//,/\.eslams-private\//];
for(const path of tracked){
 if(prohibited.some(r=>r.test(path)))failures.push(`Excluded path: ${path}`);
 const info=await stat(path);if(!info.isFile())continue;
 const bytes=await readFile(path);if(bytes.includes(0))continue;
 const text=bytes.toString('utf8');
 if(secrets.some(r=>r.test(text)))failures.push(`Sensitive content: ${path}`);
 if(path.startsWith('src/')&&/(?:from\s*["'](?:@\/|@eslams\/|@opennextjs\/)|fetch\s*\(|getCloudflareContext|useSiteSession)/.test(text))failures.push(`App dependency: ${path}`);
}
if(failures.length)throw Error(failures.join('\n'));
console.log(`Public payload check passed for ${tracked.length} files: no credentials, local paths, runtime data or app-only dependencies.`);
