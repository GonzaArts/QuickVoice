import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {i18n,i18nErrors} from './helpers/i18n.mjs';

test('Stripe UI follows the console locale and reuses each locale instance',()=>{
 let locale='es';const calls=[];const mod={exports:{}};
 const source=readFileSync(new URL('../src/components/billing/StripeBillingDialogs.tsx',import.meta.url),'utf8');
 const imports={react:{useMemo:fn=>fn(),useState:initial=>[initial,()=>{}]},'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},'@/src/i18n/provider':{useLocale:()=>({locale,t:(key,vars)=>i18n.translate(locale,key,vars)}),useT:()=>key=>i18n.translate(locale,key)},'@/src/i18n/config':i18n,'@/src/i18n/errors':i18nErrors,'@stripe/stripe-js':{loadStripe:(key,options)=>{calls.push({key,options});return Promise.resolve({});}}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{module:mod,exports:mod.exports,Intl,process:{env:{NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:'pk_test_fixture_only'}},require:name=>imports[name]??{}});
 const props={clientSecret:'fixture_client_secret',amountCents:1000,onClose(){},onComplete(){}};
 mod.exports.TopUpCheckoutDialog(props);mod.exports.PaymentMethodSetupDialog(props);
 locale='en';mod.exports.TopUpCheckoutDialog(props);mod.exports.PaymentMethodSetupDialog(props);
 assert.deepEqual(calls.map(call=>call.options?.locale),['es','en']);
 assert.ok(calls.every(call=>call.key==='pk_test_fixture_only'));
});
