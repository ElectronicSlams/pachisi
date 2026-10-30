import { execFileSync } from 'node:child_process';
import { mkdir, writeFile, symlink, rm, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
const root=process.cwd();const fixture=resolve('artifacts/consumer');
await rm(fixture,{recursive:true,force:true});
const modules=resolve(fixture,'node_modules');const target=resolve(modules,'@electronicslams/pachisi');await mkdir(target,{recursive:true});
execFileSync('tar',['-xzf',resolve('artifacts/pachisi-0.2.0.tgz'),'-C',target,'--strip-components=1']);
for(const name of ['react','react-dom','next','@types/react','@types/react-dom','@types/node']){
 const path=resolve(modules,name);await mkdir(dirname(path),{recursive:true});await symlink(resolve(root,'node_modules',name),path,'dir');
}
await writeFile(resolve(fixture,'package.json'),JSON.stringify({private:true,type:'module'}));
await writeFile(resolve(fixture,'consumer.mjs'),`import assert from 'node:assert/strict';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {Button,ModelChip} from '@electronicslams/pachisi';import {Board} from '@electronicslams/pachisi/game/board';import {Field} from '@electronicslams/pachisi/client';const html=renderToStaticMarkup(React.createElement(React.Fragment,null,React.createElement(Button,null,'Play'),React.createElement(Field,{label:'Name'}),React.createElement(Board,{frame:{kind:'placeholder',family:'square_board',label:'Pending board'},label:'Pending board'})));assert.match(html,/Play/);assert.match(html,/Name/);assert.match(html,/Pending board/);console.log('Packed ESM consumer rendered without application aliases or Next core imports.');`);
execFileSync(process.execPath,[resolve(fixture,'consumer.mjs')],{stdio:'inherit'});
await writeFile(resolve(fixture,'consumer.tsx'),`import {Button,type ModelIdentity} from '@electronicslams/pachisi';import {Field} from '@electronicslams/pachisi/client';import {Board} from '@electronicslams/pachisi/game/board';const model:ModelIdentity={id:'sample/test',name:'Test',providerSlug:'sample',providerName:'Sample',markUrl:null};export function Example(){return <><Button href='/arena'>{model.name}</Button><Field label='Name'/><Board frame={{kind:'placeholder',family:'square_board',label:'Pending board'}}/></>}`);
await writeFile(resolve(fixture,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',module:'NodeNext',moduleResolution:'NodeNext',jsx:'react-jsx',strict:true,noEmit:true,skipLibCheck:false},include:['consumer.tsx']}));
execFileSync(process.execPath,[resolve('node_modules/typescript/bin/tsc'),'-p',resolve(fixture,'tsconfig.json')],{stdio:'inherit'});
await writeFile('artifacts/consumer-result.json',JSON.stringify({archive:'pachisi-0.2.0.tgz',esmRender:true,nodeNextTypes:true},null,2)+'\n');
console.log('Packed NodeNext TypeScript consumer passed.');

// NodeNext declaration validation above remains strict. Next's own fixture uses its standard bundler config.
await writeFile(resolve(fixture,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',module:'ESNext',moduleResolution:'Bundler',jsx:'preserve',strict:true,noEmit:true,skipLibCheck:true,esModuleInterop:true,resolveJsonModule:true,isolatedModules:true},include:['app/**/*.tsx','.next/types/**/*.ts'],exclude:['node_modules']}));
await mkdir(resolve(fixture,'app'),{recursive:true});
await writeFile(resolve(fixture,'app/layout.tsx'),`import '@electronicslams/pachisi/styles.css';import type {ReactNode} from 'react';export default function Layout({children}:{children:ReactNode}){return <html lang="en"><body>{children}</body></html>}`);
await writeFile(resolve(fixture,'app/page.tsx'),`import {Button} from '@electronicslams/pachisi/next';import {ModelChip} from '@electronicslams/pachisi';import {Field} from '@electronicslams/pachisi/client';export default function Page(){return <main><h1>Pachisi consumer</h1><Button href="/arena">Play</Button><Field label="Name"/><ModelChip identity={{id:'sample/test',name:'Example',providerSlug:'sample',providerName:'Sample',markUrl:null}}/></main>}`);
await writeFile(resolve(fixture,'next.config.mjs'),`export default {output:'export',experimental:{cpus:1}};`);
const env={...process.env,NEXT_TELEMETRY_DISABLED:'1'};
execFileSync(process.execPath,[resolve('node_modules/next/dist/bin/next'),'build','--webpack'],{cwd:fixture,env,stdio:'inherit'});
const html=await readFile(resolve(fixture,'out/index.html'),'utf8');
if(!html.includes('Pachisi consumer')||!html.includes('href="/arena"'))throw Error('Next consumer output missing expected markup');
await writeFile('artifacts/consumer-result.json',JSON.stringify({archive:'pachisi-0.2.0.tgz',esmRender:true,nodeNextTypes:true,nextRscBuild:true},null,2)+'\n');
console.log('Packed Next server/client boundary and optional router adapter build passed.');
