'use strict';
const { randomBytes } = require('node:crypto');
const { readURL } = require('./ai-web');
// Deployment smoke tests contain synthetic text only. Never log response bodies or credentials.
async function probeAI(api,model,store,health) {
  if(store.settings().smokeVersion==='v2'){health.smoke='previously_passed';return;}
  const signal=AbortSignal.timeout(75000);let conversation;
  try {
    conversation=(await api.conversations.create({}, {signal})).id;
    const code=randomBytes(4).toString('hex');
    await api.responses.create({model,conversation,max_output_tokens:100,input:`Remember this temporary test code: ${code}. Reply only OK.`},{signal});
    const memory=await api.responses.create({model,conversation,max_output_tokens:100,input:'מה הקוד שביקשתי לזכור? השב רק את הקוד.'},{signal});
    if(!memory.output_text?.includes(code))throw new Error('MEMORY_PROBE');
    health.api='responses_conversations_ok';console.log('Roei AI smoke: Responses + Conversations OK');
    const web=await api.responses.create({model,store:false,max_output_tokens:1200,max_tool_calls:1,tools:[{type:'web_search',search_context_size:'low'}],tool_choice:{type:'web_search'},input:'Search for the official Discord Gateway documentation about Message Content Intent. Answer in one sentence and cite the official source.'},{signal});
    const searched=web.output?.some(o=>o.type==='web_search_call'), cited=web.output?.some(o=>o.content?.some(c=>c.annotations?.some(a=>a.type==='url_citation')));
    if(!searched || !cited){console.error(`Roei AI search probe: searched=${!!searched} cited=${!!cited} status=${web.status} incomplete=${web.incomplete_details?.reason||'none'}`);throw new Error('WEB_PROBE');}
    health.web='search_citations_ok';console.log('Roei AI smoke: live Web Search + citations OK');
    const page=await readURL('https://example.com',signal);if(!page.text.length)throw new Error('URL_PROBE');
    health.url='ok';health.smoke='passed';store.settings({smokeVersion:'v2'});console.log('Roei AI smoke: public URL reader OK');
  }catch(e){health.smoke=`failed_${Number(e.status)||'network_or_validation'}`;const code=e.code||e.message;console.error(`Roei AI smoke failed: status=${Number(e.status)||0} code=${/^[a-zA-Z0-9_]{1,60}$/.test(code||'')?code:'unavailable'}`);}
  finally {
    if(conversation)try{const page=await api.conversations.items.list(conversation,{limit:100});for(const item of page.data)await api.conversations.items.delete(item.id,{conversation_id:conversation});await api.conversations.delete(conversation);}catch{console.error('Roei AI synthetic probe cleanup pending');}
  }
}
module.exports={probeAI};
