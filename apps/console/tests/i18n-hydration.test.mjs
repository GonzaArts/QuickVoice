import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import {renderToString} from 'react-dom/server';

test('a preloaded client auth session still renders the server snapshot during hydration', () => {
 const source=readFileSync(new URL('../src/hooks/use-console-session.ts',import.meta.url),'utf8');
 const mod={exports:{}};
 const imports={react:React,'@/src/lib/auth-client':{authClient:{useSession:()=>({data:{session:{activeOrganizationId:'org-1'}},isPending:false,error:null})}}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:mod,exports:mod.exports,require:name=>imports[name]});
 let state;
 function Probe(){state=mod.exports.useConsoleSession();return React.createElement('span',null,state.isPending?'pending':state.data?.session.activeOrganizationId);}
 assert.equal(renderToString(React.createElement(Probe)), '<span>pending</span>');
 assert.equal(state.data,undefined);
});

test('cached organization data waits for the first client hydration pass',()=>{
 const source=readFileSync(new URL('../src/hooks/use-console-session.ts',import.meta.url),'utf8');
 const mod={exports:{}};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:mod,exports:mod.exports,require:name=>name==='react'?React:{authClient:{}}});
 function Probe(){return React.createElement('span',null,mod.exports.useIsHydrated()?'Cached organization':'Loading organization');}
 assert.equal(renderToString(React.createElement(Probe)),'<span>Loading organization</span>');
});
