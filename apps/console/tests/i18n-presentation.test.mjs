import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function helpers(file,names){const source=readFileSync(new URL('../src/'+file,import.meta.url),'utf8');const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const parts=sf.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>n.getText(sf));return vm.runInNewContext(ts.transpileModule(parts.join('\n')+'\n;({'+names.join(',')+'});',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText);}
const es={...JSON.parse(readFileSync(new URL('../src/i18n/messages/es.json',import.meta.url))),...JSON.parse(readFileSync(new URL('../src/i18n/messages/extended.es.json',import.meta.url)))};
const t=key=>es[key]??key;
test('recent call placeholders translate without changing actual caller and agent names',()=>{
 const {callParties,resolveAgentLabel,formatDuration}=helpers('components/dashboard/RecentCallsTable.tsx',['metadataText','callParties','resolveAgentLabel','formatDuration']);
 const call={metadata:{},agentId:null,callerId:null,direction:'inbound'};
 assert.equal(callParties(call,t).caller,t('Unknown caller'));
 assert.notEqual(callParties(call,t).caller,'Unknown caller');
 assert.equal(resolveAgentLabel({call,agentsLoading:false,agentsError:false},t),t('Unassigned'));
 assert.equal(formatDuration(null,t),t('Unknown'));
 assert.equal(callParties({...call,callerId:'Customer Support'},t).caller,'Customer Support');
 assert.equal(resolveAgentLabel({call:{agentId:'a'},agents:[{agentId:'a',name:'Sales Agent'}],agentsLoading:false,agentsError:false},t),'Sales Agent');
});
for(const file of ['components/calls/CallMetadataSheet.tsx','components/calls/ExtractedDataPanel.tsx'])test(`${file} formats boolean values while preserving strings and structured data`,()=>{
 const {displayValue}=helpers(file,['displayValue']);
 assert.equal(displayValue(true,t),t('Yes'));
 assert.equal(displayValue(false,t),t('No'));
 assert.equal(displayValue('Yes',t),'Yes');
 assert.equal(displayValue({enabled:true},t),'{"enabled":true}');
});
