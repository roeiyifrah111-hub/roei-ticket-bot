'use strict';
const { randomBytes } = require('node:crypto');
const { readURL } = require('./ai-web');
// Deployment smoke tests contain synthetic text only. Never log response bodies or credentials.
async function probeAI(api,model,store,health) {
  if(store.settings().smokeVersion==='gemini-v1'){health.smoke='previously_passed';return;}
  const signal=AbortSignal.timeout(240000);let conversation,lastCall=0;
  // Do not burst five synthetic requests into a new account's low per-minute quota.
  const create=async params=>{const wait=Math.max(0,31000-(Date.now()-lastCall));if(wait)await require('node:timers/promises').setTimeout(wait,undefined,{signal});lastCall=Date.now();return api.responses.create(params,{signal});};
  try {
    conversation=(await api.conversations.create({}, {signal})).id;
    const code=randomBytes(4).toString('hex');
    await create({model,conversation,max_output_tokens:512,input:`Remember this temporary test code: ${code}. Reply only OK.`});
    const memory=await create({model,conversation,max_output_tokens:512,input:'מה הקוד שביקשתי לזכור? השב רק את הקוד.'});
    if(!memory.output_text?.includes(code))throw new Error('MEMORY_PROBE');
    health.api='responses_conversations_ok';console.log('Roei AI smoke: Gemini + persistent conversation OK');
    const tool=await create({model,conversation,max_output_tokens:512,tools:[{type:'function',name:'deployment_probe',description:'Returns the synthetic deployment test status.',parameters:{type:'object',properties:{},required:[],additionalProperties:false}},{type:'web_search'}],input:'Call deployment_probe now to read the synthetic test status. Do not search the web.'});
    const call=tool.output?.find(o=>o.type==='function_call'&&o.name==='deployment_probe');if(!call)throw new Error('FUNCTION_PROBE');
    const followed=await create({model,conversation,max_output_tokens:512,input:[{type:'function_call_output',call_id:call.call_id,output:'{"status":"synthetic_ok"}'}]});
    if(!followed.output_text)throw new Error('FUNCTION_RESULT_PROBE');health.tools='ok';console.log('Roei AI smoke: Gemini function round trip OK');
    const web=await create({model,store:false,max_output_tokens:1200,max_tool_calls:1,tools:[{type:'web_search',search_context_size:'low'}],tool_choice:{type:'web_search'},input:'Search for the official Discord Gateway documentation about Message Content Intent. Answer in one sentence and cite the official source.'});
    const searched=web.output?.some(o=>o.type==='web_search_call'), cited=web.output?.some(o=>o.content?.some(c=>c.annotations?.some(a=>a.type==='url_citation')));
    if(!searched || !cited){console.error(`Roei AI search probe: searched=${!!searched} cited=${!!cited} status=${web.status} incomplete=${web.incomplete_details?.reason||'none'}`);throw new Error('WEB_PROBE');}
    health.web='search_citations_ok';console.log('Roei AI smoke: live Google Search + citations OK');
    const page=await readURL('https://example.com',signal);if(!page.text.length)throw new Error('URL_PROBE');
    health.url='ok';health.smoke='passed';store.settings({smokeVersion:'gemini-v1'});console.log('Roei AI smoke: public URL reader OK');
  }catch(e){health.smoke=`failed_${Number(e.status)||'network_or_validation'}`;health.quota=e.quota||[];const code=e.code||e.message;console.error(`Roei AI smoke failed: status=${Number(e.status)||0} code=${/^[a-zA-Z0-9_]{1,60}$/.test(code||'')?code:'unavailable'} quota=${JSON.stringify(e.quota||[])}`);}
  finally {
    if(conversation)try{const page=await api.conversations.items.list(conversation,{limit:100});for(const item of page.data)await api.conversations.items.delete(item.id,{conversation_id:conversation});await api.conversations.delete(conversation);}catch{console.error('Roei AI synthetic probe cleanup pending');}
  }
}
module.exports={probeAI};
