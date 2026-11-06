import { execFileSync } from 'node:child_process';
import { mkdir, writeFile, symlink, rm, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
const root=process.cwd();const fixture=resolve('artifacts/consumer');
const archiveFiles=execFileSync('tar',['-tzf',resolve('artifacts/pachisi-0.2.0.tgz')],{encoding:'utf8'}).split('\n');
if(archiveFiles.some(path=>/^package\/(reference|design-archive|scripts)\//.test(path)))throw Error('Reference source leaked into the package');
await rm(fixture,{recursive:true,force:true});
const modules=resolve(fixture,'node_modules');const target=resolve(modules,'@electronicslams/pachisi');await mkdir(target,{recursive:true});
execFileSync('tar',['-xzf',resolve('artifacts/pachisi-0.2.0.tgz'),'-C',target,'--strip-components=1']);
for(const name of ['react','react-dom','next','@types/react','@types/react-dom','@types/node']){
 const path=resolve(modules,name);await mkdir(dirname(path),{recursive:true});await symlink(resolve(root,'node_modules',name),path,'dir');
}
await writeFile(resolve(fixture,'package.json'),JSON.stringify({private:true,type:'module'}));
if(!archiveFiles.includes('package/styles/connect-four-designs.css')) throw Error('Connect Four materials missing from package');
await writeFile(resolve(fixture,'connect-four.mjs'), `
import React from 'react';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {GameAnimation,GameReplay} from '@electronicslams/pachisi/game/demo';
import {resolveConnectFourVariant} from '@electronicslams/pachisi/game/connect-four-designs';
const variant=resolveConnectFourVariant('design-2','arena');
assert.equal(variant.id,'connect-four-design-2-variant-arena');
for (const component of [GameAnimation,GameReplay]) {
 const html=renderToStaticMarkup(React.createElement(component,{game:'connect-four',gameName:'Connect Four',design:variant.design.id,presentation:variant.presentation}));
 assert.match(html,/data-c4-design="design-2"/);
}
`);
execFileSync(process.execPath,[resolve(fixture,'connect-four.mjs')],{stdio:'inherit'});
for(const file of ['styles/game-editions.css','assets/go-stones-shudan/stone_1.svg','assets/go-stones-shudan/stone_-1.svg','assets/go-stones-shudan/LICENSE']){
 if(!archiveFiles.includes('package/'+file)) throw Error('Packed design dependency missing: '+file);
}
await writeFile(resolve(fixture,'edition.mjs'),`
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Board} from '@electronicslams/pachisi/game/board';
import {resolveGameVariant} from '@electronicslams/pachisi/game/designs';
import {demonstrationFor} from '@electronicslams/pachisi/game/demos';
import {LegalDemonstration} from '@electronicslams/pachisi/game/scene';
for(const game of ['pentago','goofspiel','car-racing']){
 const trace=demonstrationFor(game);
 assert.equal(trace.frames.at(-1).terminal,true);
 const frame=trace.frames[1];
 const selected=resolveGameVariant(game,game==='pentago'?'design-4':'design-2','arena');
 assert.ok(selected.inputs.includes('spectator-replay'));
 const scene=renderToStaticMarkup(React.createElement(LegalDemonstration,{game,frame,design:selected.design.id,previous:trace.frames[0]}));
 assert.match(scene,game==='pentago'?/st-porcelain-marble/:game==='goofspiel'?/Committed/:/data-road-camera/);
}
const selected=resolveGameVariant('go','design-4','arena');
assert.equal(selected.id,'go-design-4-variant-arena');
const frame={kind:'cells',family:'go_board',rows:2,cols:2,cells:['B','W','.','.']};
const html=renderToStaticMarkup(React.createElement(Board,{frame,design:selected.design.id}));
assert.match(html,/stone_1.svg/);assert.match(html,/stone_-1.svg/);
`);
execFileSync(process.execPath,[resolve(fixture,'edition.mjs')],{stdio:'inherit'});


await writeFile(resolve(fixture,'consumer.mjs'),`import assert from 'node:assert/strict';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {Button,ModelChip} from '@electronicslams/pachisi';import {Board} from '@electronicslams/pachisi/game/board';import {Field} from '@electronicslams/pachisi/client';import {GameReplay} from '@electronicslams/pachisi/game/demo';const html=renderToStaticMarkup(React.createElement(React.Fragment,null,React.createElement(Button,null,'Play'),React.createElement(Field,{label:'Name'}),React.createElement(GameReplay,{game:'chess',gameName:'Chess'}),React.createElement(Board,{frame:{kind:'placeholder',family:'square_board',label:'Pending board'},label:'Pending board'})));assert.match(html,/Play/);assert.match(html,/Name/);assert.match(html,/Pending board/);assert.match(html,/data-replay-game="chess"/);console.log('Packed ESM consumer rendered without application aliases or Next core imports.');`);
execFileSync(process.execPath,[resolve(fixture,'consumer.mjs')],{stdio:'inherit'});
await writeFile(resolve(fixture,'consumer.tsx'),`import {Button,type ModelIdentity} from '@electronicslams/pachisi';import {Field} from '@electronicslams/pachisi/client';import {GameReplay} from '@electronicslams/pachisi/game/demo';import {Board} from '@electronicslams/pachisi/game/board';const model:ModelIdentity={id:'sample/test',name:'Test',providerSlug:'sample',providerName:'Sample',markUrl:null};export function Example(){return <><Button href='/arena'>{model.name}</Button><Field label='Name'/><GameReplay game='chess' gameName='Chess'/><Board frame={{kind:'placeholder',family:'square_board',label:'Pending board'}}/></>}`);
await writeFile(resolve(fixture,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',module:'NodeNext',moduleResolution:'NodeNext',jsx:'react-jsx',strict:true,noEmit:true,skipLibCheck:false},include:['consumer.tsx']}));
execFileSync(process.execPath,[resolve('node_modules/typescript/bin/tsc'),'-p',resolve(fixture,'tsconfig.json')],{stdio:'inherit'});
await writeFile('artifacts/consumer-result.json',JSON.stringify({archive:'pachisi-0.2.0.tgz',esmRender:true,nodeNextTypes:true},null,2)+'\n');
console.log('Packed NodeNext TypeScript consumer passed.');

// NodeNext declaration validation above remains strict. Next's own fixture uses its standard bundler config.
await writeFile(resolve(fixture,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',module:'ESNext',moduleResolution:'Bundler',jsx:'preserve',strict:true,noEmit:true,skipLibCheck:true,esModuleInterop:true,resolveJsonModule:true,isolatedModules:true},include:['app/**/*.tsx','.next/types/**/*.ts'],exclude:['node_modules']}));
await mkdir(resolve(fixture,'app'),{recursive:true});
await writeFile(resolve(fixture,'app/layout.tsx'),`import '@electronicslams/pachisi/styles.css';import type {ReactNode} from 'react';export default function Layout({children}:{children:ReactNode}){return <html lang="en"><body>{children}</body></html>}`);
await writeFile(resolve(fixture,'app/page.tsx'),`import {Button} from '@electronicslams/pachisi/next';import {ModelChip} from '@electronicslams/pachisi';import {Field} from '@electronicslams/pachisi/client';import {GameReplay} from '@electronicslams/pachisi/game/demo';export default function Page(){return <main><h1>Pachisi consumer</h1><Button href="/arena">Play</Button><Field label="Name"/><GameReplay game="chess" gameName="Chess"/><ModelChip identity={{id:'sample/test',name:'Example',providerSlug:'sample',providerName:'Sample',markUrl:null}}/></main>}`);
await writeFile(resolve(fixture,'next.config.mjs'),`export default {output:'export',experimental:{cpus:1}};`);
const env={...process.env,NEXT_TELEMETRY_DISABLED:'1'};
execFileSync(process.execPath,[resolve('node_modules/next/dist/bin/next'),'build','--webpack'],{cwd:fixture,env,stdio:'inherit'});
const html=await readFile(resolve(fixture,'out/index.html'),'utf8');
if(!html.includes('Pachisi consumer')||!html.includes('href="/arena"'))throw Error('Next consumer output missing expected markup');
await writeFile('artifacts/consumer-result.json',JSON.stringify({archive:'pachisi-0.2.0.tgz',esmRender:true,nodeNextTypes:true,nextRscBuild:true,gameReplay:true,connectFourDesign:true,sharedWebEditions:true,referenceSourcesExcluded:true},null,2)+'\n');
console.log('Packed Next server/client boundary and optional router adapter build passed.');
