import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import {renderToString} from 'react-dom/server';

const root=fileURLToPath(new URL('../src/',import.meta.url));
const require=createRequire(import.meta.url);
const modules=new Map();
let refreshes=0;
const document={cookie:'',documentElement:{lang:'es-ES'}};
function load(file){
 file=resolve(root,file);
 for(const extension of ['','.ts','.tsx','.json'])if(existsSync(file+extension)){file+=extension;break;}
 if(modules.has(file))return modules.get(file).exports;
 const mod={exports:{}};modules.set(file,mod);
 if(file.endsWith('.json'))return mod.exports=JSON.parse(readFileSync(file,'utf8'));
 const output=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 vm.runInNewContext(output,{module:mod,exports:mod.exports,document,Intl,require(name){
  if(name==='next/navigation')return {useRouter:()=>({refresh(){refreshes++;}})};
  if(name.startsWith('@/src/'))return load(name.slice(6));
  if(name.startsWith('.'))return load(resolve(dirname(file),name));
  return require(name);
 }});
 return mod.exports;
}
const {I18nProvider,useLocale}=load('i18n/provider.tsx');
const {PageHeader}=load('components/common/PageHeader.tsx');
const {StatCard}=load('components/common/StatCard.tsx');
const {normalizeLocale}=load('i18n/config.ts');

for(const locale of ['es','en'])test(`common components render translated headers and statistics in ${locale}`,()=>{
 const html=renderToString(React.createElement(I18nProvider,{initialLocale:locale},React.createElement(React.Fragment,null,
 React.createElement(PageHeader,{title:'Agents',description:'Knowledge base'}),React.createElement(StatCard,{label:'Calls',value:'12'}))));
 assert.ok(html.includes(locale==='es'?'Agentes':'Agents'));
 assert.ok(html.includes(locale==='es'?'Base de conocimiento':'Knowledge base'));
 assert.ok(html.includes(locale==='es'?'Llamadas':'Calls'));
 assert.doesNotMatch(html,/__unknown|\{count\}/);
});

test('language switch writes the shared cookie, updates html lang and refreshes server routes',()=>{
 let state;
 function Probe({capture}){capture(useLocale());return null;}
 renderToString(React.createElement(I18nProvider,{initialLocale:'es'},React.createElement(Probe,{capture:value=>{state=value;}})));
 state.setLocale('en');
 assert.match(document.cookie,/^qv_locale=en; Path=\/; Max-Age=31536000; SameSite=Lax$/);
 assert.equal(document.documentElement.lang,'en-US');
 assert.equal(refreshes,1);
 const persisted=normalizeLocale(document.cookie.split(';')[0].split('=')[1]);
 const html=renderToString(React.createElement(I18nProvider,{initialLocale:persisted},React.createElement(PageHeader,{title:'Agents'})));
 assert.ok(html.includes('Agents'));
 state.setLocale('es');
 assert.equal(document.documentElement.lang,'es-ES');
 assert.match(document.cookie,/qv_locale=es/);
});
