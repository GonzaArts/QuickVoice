import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const root=new URL('../../src/i18n/',import.meta.url);
function load(file, imports={}) {
 const mod={exports:{}};
 const source=readFileSync(new URL(file,root),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{
 module:mod,exports:mod.exports,Intl,require(name){
 if(name in imports)return imports[name];
 if(name.endsWith('.json'))return JSON.parse(readFileSync(new URL(name,root),'utf8'));
 throw new Error(`Unexpected import: ${name}`);
 }});
 return mod.exports;
}
export const i18n=load('config.ts');
export const i18nErrors=load('errors.ts',{'./config':i18n});
