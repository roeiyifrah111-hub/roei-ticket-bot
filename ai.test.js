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

test('Gemini migration retains memories and thread IDs without mixing provider conversation IDs',()=>{
  const {migrateGemini}=require('./ai-gemini'),f=fixture();const p=f.store.get('1');Object.assign(p,{provider:'openai',conversationId:'openai-a',privateConversationId:'openai-b',privateThreadId:'123',privateSummary:'remember',privateRecent:[{role:'user',text:'old'}]});f.store.save(p);
  migrateGemini(f.store);const moved=f.store.get('1');assert.equal(moved.privateThreadId,'123');assert.equal(moved.privateSummary,'remember');assert.equal(moved.privateRecent[0].text,'old');assert.equal(moved.privateConversationId,null);assert.deepEqual(moved.legacyOpenAIConversationIds,['openai-a','openai-b']);moved.privateConversationId='gemini_new';f.store.save(moved);migrateGemini(f.store);assert.equal(f.store.get('1').privateConversationId,'gemini_new');f.db.close();
});
test('Gemini stores local history, preserves signed tool parts, isolates users and deletes history',async()=>{
  const {createGeminiAPI}=require('./ai-gemini'),f=fixture(),requests=[];
  const mock=async(url,opts)=>{assert.ok(url.startsWith('https://generativelanguage.googleapis.com/'));assert.equal(opts.headers['x-goog-api-key'],'test');requests.push(JSON.parse(opts.body));return {ok:true,json:async()=>({candidates:[{content:{role:'model',parts:requests.length===1?[{thoughtSignature:'opaque',functionCall:{id:'call1',name:'my_profile',args:{}}}]:[{text:'done'}]}}],usageMetadata:{totalTokenCount:12}})};};
  let api=createGeminiAPI({apiKey:'test',db:f.db,fetchImpl:mock});const a=await api.conversations.create(),b=await api.conversations.create();
  const first=await api.responses.create({model:'gemini-3.8-flash',conversation:a.id,input:[{role:'user',content}],tools:[{type:'function',name:'my_profile',description:'profile',parameters:{type:'object',properties:{}}}]});assert.equal(first.output.find(o=>o.type==='function_call').call_id,'call1');
  api=createGeminiAPI({apiKey:'test',db:f.db,fetchImpl:mock});await api.responses.create({model:'gemini-3.8-flash',conversation:a.id,input:[{type:'function_call_output',call_id:'call1',output:'{"ok":true}'}]});assert.equal(requests[1].contents[1].parts[0].thoughtSignature,'opaque');assert.equal(requests[1].contents[2].parts[0].functionResponse.name,'my_profile');
  await api.responses.create({model:'gemini-3.8-flash',conversation:b.id,input:'other user'});assert.equal(requests[2].contents.length,1);
  for(const item of (await api.conversations.items.list(a.id)).data)await api.conversations.items.delete(item.id,{conversation_id:a.id});assert.equal((await api.conversations.items.list(a.id)).data.length,0);await api.conversations.delete(a.id);assert.equal(f.db.prepare('SELECT count(*) n FROM ai_gemini_conversations').get().n,1);f.db.close();
});
test('Gemini grounding uses real metadata and converts attachments without persisting their bytes',async()=>{
  const {createGeminiAPI}=require('./ai-gemini'),f=fixture();let body;
  const api=createGeminiAPI({apiKey:'test',db:f.db,fetchImpl:async(_,o)=>{body=JSON.parse(o.body);return {ok:true,json:async()=>({candidates:[{content:{role:'model',parts:[{text:'answer'}]},groundingMetadata:{webSearchQueries:['query'],groundingChunks:[{web:{uri:'https://example.com',title:'source'}}]}}]})};}});
  const c=await api.conversations.create();const r=await api.responses.create({model:'gemini-3.8-flash',conversation:c.id,input:[{role:'user',content:[{type:'input_file',file_data:'data:application/pdf;base64,YQ=='}]}],tools:[{type:'web_search'},{type:'function',name:'pay'}],tool_choice:{type:'web_search'}});
  assert.deepEqual(body.tools,[{googleSearch:{}}]);assert.equal(body.contents[0].parts[0].inlineData.mimeType,'application/pdf');assert.ok(r.output.some(o=>o.type==='web_search_call'));assert.equal(r.output.find(o=>o.type==='message').content[0].annotations[0].url,'https://example.com');assert.ok(!f.db.prepare('SELECT data FROM ai_gemini_conversations').get().data.includes('YQ=='));f.db.close();
});
test('Gemini provider errors never expose raw error text and aborted requests propagate signals',async()=>{
  const {createGeminiAPI}=require('./ai-gemini'),f=fixture();const api=createGeminiAPI({apiKey:'secret',db:f.db,fetchImpl:async(_,o)=>{assert.ok(o.signal);return {ok:false,status:429,json:async()=>({error:{status:'RESOURCE_EXHAUSTED',message:'secret raw'}})};}});
  await assert.rejects(api.responses.create({model:'gemini-3.8-flash',input:'hi'}),e=>e.status===429&&e.code==='RESOURCE_EXHAUSTED'&&!e.message.includes('secret'));f.db.close();
});
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
test('missing API key disables only AI and still exposes command handlers',async()=>{const logs=[],old=console.log;console.log=s=>logs.push(s);try{const ai=createAISystem({client:{},guildId:'1',coins:{},adapters:{},env:{}});await ai.start();assert.equal(ai.ready,false);assert.ok(ai.commands.length);assert.ok(logs.includes('Roei AI disabled: GEMINI_API_KEY is missing'));}finally{console.log=old;}});
test('Discord routing answers only the owner inside a private thread, never the public entrance',async()=>{
  const {Collection}=require('discord.js'),f=fixture();let sent=0;
  f.api.models={retrieve:async()=>{throw Object.assign(new Error('test_model_probe_disabled'),{status:403});}};
  const overwrites=[];
  const channel={id:CHANNEL_ID,permissionOverwrites:{edit:async(id,p)=>overwrites.push([id,p])},messages:{fetch:async()=>new Collection()},permissionsFor:()=>({has:()=>true}),send:async()=>({id:'panel'}),sendTyping:async()=>{}};
  const guild={roles:{everyone:{id:'everyone'}},members:{fetch:async({user})=>({id:user,user:{bot:false}}),fetchMe:async()=>({id:'bot'})},channels:{fetch:async()=>channel}};
  const client={user:{id:'bot'},guilds:{fetch:async()=>guild}};
  const system=createAISystem({client,guildId:'10',coins:{store:{db:f.db}},adapters:{},env:{},api:f.api});await system.start();
  const message=(id,overrides={})=>({id:'m'+id,guildId:'10',guild,channelId:CHANNEL_ID,channel,author:{id,bot:false},content:'שלום',attachments:new Map(),reply:async()=>{sent++;return {id:'answer',edit:async()=>{}};},...overrides});
  await system.onMessage(message('1',{channelId:'elsewhere'}));await system.onMessage(message('1',{author:{id:'1',bot:true}}));await system.onMessage(message('1',{webhookId:'hook'}));await system.onMessage(message('1',{channelId:'private-other',channel:{parentId:CHANNEL_ID}}));
  await system.onMessage(message('1'));assert.equal(sent,0);assert.equal(f.calls.length,0);
  assert.equal(overwrites.find(([id])=>id==='everyone')[1].SendMessages,false);
  const p=f.store.get('1');p.privateThreadId='private-own';f.store.save(p);
  const thread={...channel,id:'private-own',parentId:CHANNEL_ID,type:12,members:{fetch:async()=>new Map([['1',{}],['bot',{}]])}};
  await system.onMessage(message('2',{channelId:thread.id,channel:thread}));assert.equal(sent,0);
  await system.onMessage(message('1',{channelId:thread.id,channel:thread}));assert.equal(sent,1);assert.equal(f.calls.length,1);assert.match(f.store.get('1').privateRecent[0].text,/שלום/);assert.deepEqual(f.store.get('1').recentMessages,[]);f.db.close();
});

test('provider 429 before output preserves conversation and refunds unused local allowances',async()=>{
  const f=fixture();const p=f.store.get('1');p.conversationId='existing';f.store.save(p);
  f.api.responses.create=async()=>{throw Object.assign(new Error('quota'),{status:429,code:'credit_balance_exhausted'});};
  await assert.rejects(f.service.run(ctx('1'),content,'hello'),{status:429});
  assert.equal(f.store.get('1').conversationId,'existing');assert.equal(f.store.usage('1').requests,0);assert.equal(f.store.usage('1').web,0);f.db.close();
});
test('provider 429 after a tool call detaches incomplete conversation',async()=>{
  const f=fixture(()=>({output:[{type:'function_call',name:'pay',arguments:'{"amount":5}',call_id:'c'}]}));
  const create=f.api.responses.create;let count=0;f.api.responses.create=async p=>{if(++count===2)throw Object.assign(new Error('rate'),{status:429});return create(p);};
  await assert.rejects(f.service.run(ctx('1'),content,'pay'),{status:429});assert.equal(f.store.get('1').conversationId,null);assert.equal(f.store.get('1').cleanup.length,1);assert.equal(f.service.pending.size,0);f.db.close();
});
test('billing errors are distinct from temporary rate limits',()=>{
  const {friendly}=require('./roei-ai');
  for(const code of ['insufficient_quota','credit_balance_exhausted','project_spend_limit_exceeded'])assert.match(friendly({status:429,code}),/יתרה וחיוב/);
  assert.match(friendly({status:429,type:'insufficient_quota'}),/יתרה וחיוב/);assert.match(friendly({status:429,code:'rate_limit_exceeded'}),/קצב הבקשות/);
});

test('private entrance button serializes creation, restores membership and refuses public replacements',async()=>{
  const {Collection}=require('discord.js'),f=fixture();let creates=0,adds=0,reopened=0,createdOptions;
  f.api.models={retrieve:async()=>{throw Object.assign(new Error('probe disabled'),{status:403});}};
  const thread={id:'555',parentId:CHANNEL_ID,type:12,ownerId:'bot',archived:false,members:{add:async()=>{adds++;}},setArchived:async()=>{reopened++;thread.archived=false;}};
  const channel={id:CHANNEL_ID,permissionOverwrites:{edit:async()=>{}},messages:{fetch:async()=>new Collection()},permissionsFor:()=>({has:()=>true}),send:async()=>({id:'panel'}),threads:{create:async options=>{creates++;createdOptions=options;return thread;}}};
  const guild={roles:{everyone:{id:'everyone'}},members:{fetch:async({user})=>({id:user}),fetchMe:async()=>({id:'bot'})},channels:{fetch:async id=>id===CHANNEL_ID?channel:thread}};
  const system=createAISystem({client:{user:{id:'bot'},guilds:{fetch:async()=>guild}},guildId:'10',coins:{store:{db:f.db}},adapters:{},env:{},api:f.api});await system.start();
  const replies=[];const interaction=()=>({isButton:()=>true,customId:'ai:private',guildId:'10',guild,user:{id:'1'},channelId:CHANNEL_ID,deferReply:async options=>assert.equal(options.ephemeral,true),editReply:async data=>replies.push(data.content)});
  await Promise.all([system.handle(interaction()),system.handle(interaction())]);assert.equal(creates,1);assert.equal(adds,1);assert.equal(createdOptions.type,12);assert.equal(createdOptions.invitable,false);assert.equal(f.store.get('1').privateThreadId,'555');assert.ok(replies.every(s=>s.includes('<#555>')));
  thread.archived=true;await system.handle(interaction());assert.equal(creates,1);assert.equal(reopened,1);assert.equal(adds,2);
  thread.type=11;await system.handle(interaction());assert.equal(adds,2);assert.match(replies.at(-1),/אין הרשאה/);assert.equal(f.calls.length,0);f.db.close();
});
