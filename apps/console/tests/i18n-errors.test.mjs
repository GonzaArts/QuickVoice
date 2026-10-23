import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const dir = new URL('../src/i18n/', import.meta.url);
function load(file, imports = {}) {
  const code = ts.transpileModule(readFileSync(new URL(file, dir), 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true},
  }).outputText;
  const mod = {exports:{}};
  vm.runInNewContext(code, {exports:mod.exports,module:mod,Intl,require(name) {
    if (name in imports) return imports[name];
    if (name.endsWith('.json')) return JSON.parse(readFileSync(new URL(name,dir),'utf8'));
    throw new Error(name);
  }});
  return mod.exports;
}

test('known validation errors use natural Spanish and unknown Zod output has a localized fallback', () => {
  const config = load('config.ts');
  const {localizeValidationMessage} = load('errors.ts', {'./config': config});
  const t = (key, vars) => config.translate('es', key, vars);
  assert.equal(localizeValidationMessage(t, 'Passwords do not match'), 'Las contraseñas no coinciden');
  assert.equal(localizeValidationMessage(t, 'Invalid input: expected number, received NaN'), 'Revisa el valor de este campo.');
  assert.equal(localizeValidationMessage(t, 'Too small: expected number to be >=10'), 'Revisa el valor de este campo.');
});

test('API error presentation translates codes and known text without changing original diagnostics', () => {
  const config = load('config.ts');
  const {localizeError} = load('errors.ts', {'./config': config});
  const t = (key, vars) => config.translate('es', key, vars);
  const error = {code:'INSUFFICIENT_CREDIT', message:'provider trace that must stay in diagnostics'};
  assert.equal(localizeError(t,error), 'No tienes saldo suficiente. Añade saldo para continuar.');
  assert.equal(error.message, 'provider trace that must stay in diagnostics');
  assert.equal(localizeError(t,{message:'Invalid email or password'}), 'El correo electrónico o la contraseña no son correctos.');
  assert.equal(localizeError(t,new Error('opaque provider failure'),'Could not create agent'), 'No se ha podido crear el agente');
  assert.equal(localizeError((key,vars)=>config.translate('en',key,vars), {message:'Invalid email or password'}), 'Invalid email or password');
});

test('locale codes normalize case and surrounding whitespace', () => {
  const {normalizeLocale} = load('config.ts');
  assert.equal(normalizeLocale(' EN-gb '),'en');
  assert.equal(normalizeLocale('en'),'en');
  assert.equal(normalizeLocale('es-ES'),'es');
  assert.equal(normalizeLocale('unsupported'),'es');
});

test('resource error templates localize complete sentences and interpolated resources', () => {
 const config=load('config.ts');
 const source=readFileSync(new URL('../lib/api-error-state.ts',dir),'utf8');
 const mod={exports:{}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:mod,exports:mod.exports});
 const result=mod.exports.getApiErrorStateCopy({status:401},{resourceName:'dashboard',t:(key,vars)=>config.translate('es',key,vars)});
 assert.equal(result.title,'Inicia sesión para cargar el panel de control');
 assert.match(result.description,/Tu sesión de QuickVoice/);
});

test('unknown keys matching object prototype names remain safe interface text',()=>{
 const {translate}=load('config.ts');
 for(const key of ['constructor','toString','__proto__']) assert.equal(translate('es',key),key);
});

test('unknown backend codes cannot resolve inherited object properties',()=>{
 const config=load('config.ts');
 const {localizeError}=load('errors.ts',{'./config':config});
 for(const code of ['constructor','toString','__proto__']) assert.equal(localizeError((key,vars)=>config.translate('es',key,vars),{code}),'Se ha producido un error.');
});

test('already localized validation messages keep their specific guidance and can switch language',()=>{
 const config=load('config.ts');
 const {localizeValidationMessage,localizeError}=load('errors.ts',{'./config':config});
 const message=config.translate('es','Choose a voice for this model and language.');
 assert.equal(localizeValidationMessage((key,vars)=>config.translate('es',key,vars),message),message);
 assert.equal(localizeValidationMessage((key,vars)=>config.translate('en',key,vars),message),'Choose a voice for this model and language.');
 assert.equal(localizeError((key,vars)=>config.translate('en',key,vars),message),'Choose a voice for this model and language.');
});

test('language names follow interface locale and unknown provider identifiers stay intact',()=>{
 const {formatLanguage}=load('config.ts');
 assert.equal(formatLanguage('es','en','English'),'Inglés');
 assert.equal(formatLanguage('en','es','Spanish'),'Spanish');
 assert.equal(formatLanguage('es','provider/custom','Vendor language'),'Vendor language');
});
