import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {seal,unlock,rebind,reset} from '../src/vault.mjs';
import {homeFields,normalizeHome,renderHome} from '../src/home-content.mjs';

test('renewal preserves the existing password and recovery code without an age limit',async()=>{
 const scope='https://example.test|owner/repo',password='existing-test-password';
 const {record,recoveryCode}=await seal('expired-test-key',password,scope);record.createdAt='2000-01-01T00:00:00.000Z';
 const updated=await rebind(record,password,'replacement-test-key',scope);
 assert.deepEqual(updated.password,record.password);assert.deepEqual(updated.recovery,record.recovery);
 assert.equal(await unlock(updated,password,scope),'replacement-test-key');
 const recovered=await reset(updated,recoveryCode,'another-test-password',scope);
 assert.equal(await unlock(recovered.record,'another-test-password',scope),'replacement-test-key');
 assert.equal(await unlock(record,password,scope),'expired-test-key');
 await assert.rejects(rebind(record,'incorrect-password','replacement-test-key',scope));
 await assert.rejects(rebind(record,password,'replacement-test-key','https://other.test|owner/repo'));
});
test('homepage values survive rendering as text and preserve layout and links',async()=>{
 const html=await readFile(new URL('../src/index.html',import.meta.url),'utf8');
 const values=Object.fromEntries(homeFields.map(([key])=>[key,'Мәтін <script>alert(1)</script> & $&']));
 const output=renderHome(html,values);
 for(const [key] of homeFields)assert.ok(output.includes('data-home-text="'+key+'"'));
 assert.equal((output.match(/Мәтін &lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; \$&/g)||[]).length,homeFields.length);
 assert.ok(output.includes('href="#materials"'));assert.ok(output.includes('id="profile-photo"'));
 assert.equal(renderHome(html,{}),html);
 assert.throws(()=>normalizeHome({name:' '}));assert.throws(()=>normalizeHome({intro:'a'.repeat(3001)}));
 assert.deepEqual(normalizeHome({name:'  Айкерім  ',unknown:'ignored'}),{name:'Айкерім'});
});
