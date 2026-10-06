'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {AIStore,cleanName}=require('./ai-store');
const {publicIP,publicURL,download}=require('./ai-web');
const {AIService}=require('./ai-service');
const {validate,createRegistry,visible}=require('./ai-tools');
const {commands,payload,createAISystem,CHANNEL_ID}=require('./roei-ai');
function fixture(output) {
  const db=new DatabaseSync(':memory:'),store=new AIStore(db),calls=[];let n=0,executed=0;
  const api={conversations:{create:async()=>({id:`conversation_${++n}`}),items:{list:async()=>({data:[]})},delete:async()=>({})},responses:{create:async p=>{calls.push(p);return typeof output==='function'?output(p,calls.length):{output_text:'שלום',output:[],usage:{total_tokens:20}};}}};
  const registry={registry:new Map([['pay',{needsConfirmation:true,parameters:{type:'object',properties:{amount:{type:'integer',minimum:1,maximum:100}},required:['amount']}}]]),schemas:()=>[],execute:async()=>{executed++;return {ok:true};}};
  const service=new AIService({api,store,registry,env:{}});
  return {db,store,api,service,calls,get executed(){return executed;}};
}
const ctx=id=>({userId:id,guildId:'10',channelId:'20'}),content=[{type:'input_text',text:'שלום'}];
test('persistent profiles, names, settings and separated users survive reopening',()=>{
  const dir=mkdtempSync(join(tmpdir(),'roei-ai-')),file=join(dir,'data.sqlite');let db=new DatabaseSync(file),store=new AIStore(db);
  const a=store.get('1');a.assistantName=cleanName('Jarvis');a.conversationId='a';a.memorySummary='private A';store.save(a);store.get('2');store.settings({web:false});db.close();
  db=new DatabaseSync(file);store=new AIStore(db);assert.equal(store.get('1').assistantName,'Jarvis');assert.equal(store.get('2').memorySummary,'');assert.equal(store.settings().web,false);db.close();rmSync(dir,{recursive:true});
});
test('names strip mentions and markdown and enforce length',()=>{assert.equal(cleanName('@everyone **Jarvis**'),'everyone Jarvis');assert.throws(()=>cleanName('x'));assert.throws(()=>cleanName('a'.repeat(25)));});
test('SSRF blocks private, loopback, mapped IPv6, reserved and internal URLs',()=>{
  for(const ip of ['127.0.0.1','10.1.2.3','172.16.1.2','192.168.1.1','169.254.169.254','0.0.0.0','100.64.0.1','::1','::ffff:127.0.0.1','fc00::1','fe80::1','224.0.0.1'])assert.equal(publicIP(ip),false,ip);
  for(const url of ['file:///etc/passwd','ftp://example.com','http://127.1','http://2130706433','http://[::1]','https://redis.railway.internal','http://localhost','https://user:pass@example.com','https://example.com:8000'])assert.throws(()=>publicURL(url),undefined,url);
  assert.equal(publicIP('8.8.8.8'),true);assert.equal(publicIP('2606:4700:4700::1111'),true);assert.equal(publicURL('https://example.com').hostname,'example.com');
});
test('DNS results checked before connecting, including mixed public/private rebinding',async()=>{
  await assert.rejects(download('https://example.com',{lookup:async()=>[{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}]}),/URL_BLOCKED/);
});
test('tool argument validation blocks additional identity fields and invalid amounts',()=>{
  const schema={type:'object',properties:{amount:{type:'integer',minimum:1,maximum:100}},required:['amount']};
  for(const data of [{amount:-1},{amount:1.5},{amount:2,userId:'victim'},{},null])assert.throws(()=>validate(schema,data));validate(schema,{amount:50});
});
test('conversation IDs are isolated across users and public/private contexts',async()=>{
  const f=fixture();await f.service.run(ctx('1'),content,'hi');await f.service.run(ctx('2'),content,'hello');f.service.last.clear();await f.service.run({...ctx('1'),private:true},content,'secret');
  assert.equal(new Set(f.calls.map(c=>c.conversation)).size,3);assert.equal(f.store.get('1').recentMessages.some(m=>m.text==='secret'),false);f.db.close();
});
test('memory off does not send a stored conversation or retain new messages',async()=>{
  const f=fixture();f.store.settings({memory:false});await f.service.run(ctx('1'),content,'no history');assert.equal(f.calls[0].store,false);assert.equal(f.calls[0].conversation,undefined);assert.deepEqual(f.store.get('1').recentMessages,[]);f.db.close();
});
test('explicit search forces actual web tool and includes real citations',async()=>{
  const f=fixture(()=>({output_text:'מצאתי',output:[{type:'web_search_call'},{type:'message',content:[{annotations:[{type:'url_citation',url:'https://example.com/article',title:'Source'}]}]}],usage:{total_tokens:10}}));
  const result=await f.service.run(ctx('1'),content,'תחפש באינטרנט חדשות');assert.deepEqual(f.calls[0].tool_choice,{type:'web_search'});assert.match(result.text,/https:\/\/example.com\/article/);assert.equal(f.store.usage('1').web,1);f.db.close();
});
test('explicit search never claims success without a web call',async()=>{const f=fixture();await assert.rejects(f.service.run(ctx('1'),content,'search internet'),/WEB_UNAVAILABLE/);f.db.close();});
test('regular answer does not spend a web call',async()=>{const f=fixture();await f.service.run(ctx('1'),content,'hello');assert.equal(f.store.usage('1').web,0);f.db.close();});
test('mutation waits for owner-bound confirmation; another user cannot consume it',async()=>{
  const f=fixture((_,n)=>n===1?{output:[{type:'function_call',name:'pay',arguments:'{"amount":5}',call_id:'c'}]}:{output_text:'ממתין לאישור',output:[]});
  const r=await f.service.run(ctx('1'),content,'pay 5');assert.equal(f.executed,0);const id=r.confirmations[0].nonce;
  await assert.rejects(f.service.confirm(id,ctx('2')),/STALE/);assert.equal(f.executed,0);await f.service.confirm(id,ctx('1'));assert.equal(f.executed,1);await assert.rejects(f.service.confirm(id,ctx('1')),/STALE/);f.db.close();
});
test('expired, cross-channel and disabled action confirmations fail closed',async()=>{
  const f=fixture();f.service.pending.set('n',{...ctx('1'),name:'pay',args:{amount:1},expires:Date.now()+60000});await assert.rejects(f.service.confirm('n',{...ctx('1'),channelId:'bad'}),/STALE/);f.store.settings({actions:false});await assert.rejects(f.service.confirm('n',ctx('1')),/DISABLED/);assert.equal(f.executed,0);f.db.close();
});
test('external web content cannot trigger a mutation even if model requests one',async()=>{
  const f=fixture((_,n)=>n===1?{output:[{type:'web_search_call'},{type:'function_call',name:'pay',arguments:'{"amount":5}',call_id:'c'}]}:{output_text:'data only',output:[]});const r=await f.service.run(ctx('1'),content,'search');assert.equal(f.executed,0);assert.equal(r.confirmations.length,0);f.db.close();
});
test('regeneration cannot offer actions again',async()=>{
  const f=fixture((_,n)=>n===1?{output:[{type:'function_call',name:'pay',arguments:'{"amount":5}',call_id:'c'}]}:{output_text:'ok',output:[]});const r=await f.service.run({...ctx('1'),regenerate:true},content,'pay');assert.equal(r.confirmations.length,0);f.db.close();
});
test('busy lock and cancellation do not leak or overwrite another user',async()=>{
  const f=fixture();f.api.responses.create=(_,opts)=>new Promise((resolve,reject)=>{opts.signal.addEventListener('abort',()=>reject(Object.assign(new Error('stopped'),{name:'AbortError'})));});
  const first=f.service.run(ctx('1'),content,'hi');await new Promise(r=>setImmediate(r));await assert.rejects(f.service.run(ctx('1'),content,'again'));assert.equal(f.service.stop('2'),false);assert.equal(f.service.stop('1'),true);await assert.rejects(first);assert.equal(f.service.active,0);assert.equal(f.service.running.size,0);f.db.close();
});
test('reset clears both conversation scopes but only requester; preserves preferences',async()=>{
  const f=fixture();for(const id of ['1','2']){const p=f.store.get(id);p.conversationId=id;p.privateConversationId='private'+id;p.preferences='coding';p.memorySummary='secret';f.store.save(p);}await f.service.forget('1','conversation');assert.equal(f.store.get('1').memorySummary,'');assert.equal(f.store.get('1').preferences,'coding');assert.equal(f.store.get('2').memorySummary,'secret');f.db.close();
});
test('daily budgets prevent additional API calls',async()=>{const f=fixture();f.store.settings({dailyRequests:1});await f.service.run(ctx('1'),content,'hi');f.service.last.clear();await assert.rejects(f.service.run(ctx('1'),content,'more'),/BUDGET/);assert.equal(f.calls.length,1);f.db.close();});
test('registry excludes arbitrary code, admin and credential methods',()=>{const registry=createRegistry({store:{settings:()=>({})}});for(const name of ['eval','exec','ban','addcoins','setcoins','grant_admin','read_env'])assert.equal(registry.registry.has(name),false);for(const tool of registry.registry.values())assert.ok(tool.riskLevel && Array.isArray(tool.requiredPermissions));});
test('channel permissions require both user and bot and private thread membership',async()=>{const member={id:'1'},me={id:'2'},channel={permissionsFor:()=>({has:()=>false})};assert.equal(await visible(channel,member,me),false);channel.permissionsFor=()=>({has:()=>true});channel.type=12;channel.members={fetch:async()=>new Map([['2',{}]])};assert.equal(await visible(channel,member,me),false);});
test('all slash command schemas valid, distinct and long code preserved in attachment',()=>{const json=commands.map(c=>c.toJSON());assert.equal(new Set(json.map(c=>c.name)).size,json.length);const text='```js\n'+'x'.repeat(3000)+'\n```';assert.equal(payload(text).files[0].attachment.toString(),text);});
test('missing API key disables only AI and still exposes command handlers',async()=>{const logs=[],old=console.log;console.log=s=>logs.push(s);try{const ai=createAISystem({client:{},guildId:'1',coins:{},adapters:{},env:{}});await ai.start();assert.equal(ai.ready,false);assert.ok(ai.commands.length);assert.ok(logs.includes('Roei AI disabled: OPENAI_API_KEY is missing'));}finally{console.log=old;}});
test('Discord routing ignores other channels, bots, webhooks and unowned threads; replies to humans',async()=>{
  const {Collection}=require('discord.js'),f=fixture();let sent=0;
  f.api.models={retrieve:async()=>{throw Object.assign(new Error('test_model_probe_disabled'),{status:403});}};
  const channel={id:CHANNEL_ID,messages:{fetch:async()=>new Collection()},permissionsFor:()=>({has:()=>true}),send:async()=>({id:'panel'}),sendTyping:async()=>{}};
  const guild={members:{fetch:async({user})=>({id:user,user:{bot:false}}),fetchMe:async()=>({id:'bot'})},channels:{fetch:async()=>channel}};
  const client={user:{id:'bot'},guilds:{fetch:async()=>guild}};
  const system=createAISystem({client,guildId:'10',coins:{store:{db:f.db}},adapters:{},env:{},api:f.api});await system.start();
  const message=(id,overrides={})=>({id:'m'+id,guildId:'10',guild,channelId:CHANNEL_ID,channel,author:{id,bot:false},content:'שלום',attachments:new Map(),reply:async()=>{sent++;return {id:'answer',edit:async()=>{}};},...overrides});
  await system.onMessage(message('1',{channelId:'elsewhere'}));await system.onMessage(message('1',{author:{id:'1',bot:true}}));await system.onMessage(message('1',{webhookId:'hook'}));await system.onMessage(message('1',{channelId:'private-other',channel:{parentId:CHANNEL_ID}}));
  assert.equal(sent,0);assert.equal(f.calls.length,0);await system.onMessage(message('1'));assert.equal(sent,1);assert.equal(f.calls.length,1);assert.match(f.store.get('1').recentMessages[0].text,/שלום/);f.db.close();
});
