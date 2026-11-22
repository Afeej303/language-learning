import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';

test('model response creates drafts and a malformed batch rolls back',t=>{
 const dir=mkdtempSync(join(tmpdir(),'dhic-draft-'));
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const mock=join(dir,'mock.mjs'),file=join(dir,'db');
 writeFileSync(mock,`globalThis.fetch=async()=>{
  const item={skill:'reading',difficulty:1,body:{type:'choice',prompt:'Read',ml:'വായിക്കുക',cue:'بَ',options:['ba','bi'],answers:['ba']}};
  const items=[item,item,item,process.env.INVALID?{}:item];
  return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({items})}}]})};
 };`);
 for(const invalid of ['', '1']){
  const child=spawnSync(process.execPath,['--import',mock,'scripts/draft.js','letters','A1'],{env:{...process.env,DB_FILE:file,OPENAI_API_KEY:'local-test',INVALID:invalid}});
  assert.equal(child.status,invalid?1:0);
  const db=new DatabaseSync(file);
  assert.equal(db.prepare("SELECT count(*) n FROM questions WHERE status='draft'").get().n,4);
  db.close();
 }
});
