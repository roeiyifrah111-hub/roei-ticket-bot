'use strict';
const {randomUUID}=require('node:crypto');
const ROOT='https://generativelanguage.googleapis.com/v1beta/models/';
const fail=(status,code)=>Object.assign(new Error(code),{status,code});
function migrateGemini(store) {
  const db=store.db;
  db.exec('BEGIN IMMEDIATE');
  try {
    for(const row of db.prepare('SELECT data FROM ai_profiles').all()) {
      const p=JSON.parse(row.data);if(p.provider==='gemini')continue;
      p.legacyOpenAIConversationIds=[...new Set([...(p.legacyOpenAIConversationIds||[]),p.conversationId,p.privateConversationId,...(p.cleanup||[])].filter(Boolean))];
      p.conversationId=null;p.privateConversationId=null;p.cleanup=[];p.turns=0;p.privateTurns=0;p.provider='gemini';store.save(p);
    }
    db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
}
function createGeminiAPI({apiKey,db,fetchImpl=fetch}) {
  db.exec('CREATE TABLE IF NOT EXISTS ai_gemini_conversations(id TEXT PRIMARY KEY,data TEXT NOT NULL)');
  const load=id=>{const row=db.prepare('SELECT data FROM ai_gemini_conversations WHERE id=?').get(id);if(!row)throw Object.assign(fail(404,'CONVERSATION_MISSING'),{param:'conversation'});return JSON.parse(row.data);};
  const save=(id,data)=>db.prepare('INSERT INTO ai_gemini_conversations VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(id,JSON.stringify(data));
  async function request(model,body,signal) {
    if(!/^gemini-[a-zA-Z0-9.-]+$/.test(model))throw fail(400,'GEMINI_MODEL');
    const response=await fetchImpl(ROOT+model+(body?':generateContent':''),{method:body?'POST':'GET',headers:{'x-goog-api-key':apiKey,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(45000)]):AbortSignal.timeout(45000)});
    const json=await response.json();
    // Never propagate provider messages: they may contain input or credentials.
    if(!response.ok){
      const error=fail(response.status,/^[A-Z_]{1,60}$/.test(json.error?.status||'')?json.error.status:'GEMINI_REQUEST_FAILED');
      error.quota=(json.error?.details||[]).flatMap(d=>d.violations||[]).slice(0,4).map(v=>({metric:String(v.quotaMetric||'').replace(/[^a-zA-Z0-9_./-]/g,'').slice(0,160),id:String(v.quotaId||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,160),value:/^\d+$/.test(String(v.quotaValue))?String(v.quotaValue):undefined}));
      throw error;
    }
    return json;
  }
  function parts(content) {
    if(typeof content==='string')return [{text:content}];
    return (content||[]).map(p=>{
      if(p.type==='input_text'||p.type==='output_text')return {text:p.text};
      const data=p.image_url||p.file_data,match=typeof data==='string' && data.match(/^data:(image\/(?:png|jpeg|webp)|application\/pdf);base64,([A-Za-z0-9+/=]+)$/);
      if(match)return {inlineData:{mimeType:match[1],data:match[2]}};
      throw fail(400,'ATTACHMENT_TYPE');
    });
  }
  function inputContents(input,history) {
    if(typeof input==='string')return [{role:'user',parts:[{text:input}]}];
    const result=[],hasNative=input.some(i=>i.type==='gemini_content');
    for(const item of input) {
      if(item.type==='gemini_content'){result.push(item.content);continue;}
      if(item.type==='function_call_output') {
        const prior=[...history,...result].flatMap(c=>c.parts||[]).findLast(p=>p.functionCall?.id===item.call_id);
        if(!prior)throw fail(400,'TOOL_CONTEXT');
        const part={functionResponse:{id:item.call_id,name:prior.functionCall.name,response:{result:item.output}}};
        if(result.at(-1)?.role==='user' && result.at(-1).parts.every(p=>p.functionResponse))result.at(-1).parts.push(part);else result.push({role:'user',parts:[part]});
      }else if(item.role)result.push({role:item.role==='assistant'?'model':'user',parts:parts(item.content)});
      else if(!hasNative && item.type==='function_call')throw fail(400,'TOOL_CONTEXT');
    }
    return result;
  }
  const scrub=contents=>contents.map(c=>({...c,parts:c.parts.map(p=>p.inlineData?{text:'[Previously attached file; attach again to inspect its content.]'}:p)}));
  return {
    provider:'gemini',models:{retrieve:model=>request(model)},
    conversations:{
      create:async()=>{const id='gemini_'+randomUUID();save(id,[]);return {id};},
      items:{list:async id=>({data:load(id).flatMap((c,n)=>c?[{id:String(n)}]:[])}),delete:async(item,{conversation_id})=>{const data=load(conversation_id);data[Number(item)]=null;save(conversation_id,data);}},
      delete:async id=>{db.prepare('DELETE FROM ai_gemini_conversations WHERE id=?').run(id);return {};}
    },
    responses:{create:async(params,{signal}={})=>{
      const history=params.conversation?load(params.conversation):[],contents=[...history,...inputContents(params.input,history)];
      const search=params.tools?.some(t=>t.type==='web_search'),forced=params.tool_choice?.type==='web_search';
      const functions=forced?[]:(params.tools||[]).filter(t=>t.type==='function').map(t=>({name:t.name,description:t.description,parametersJsonSchema:t.parameters}));
      const tools=[...(functions.length?[{functionDeclarations:functions}]:[]),...(search?[{googleSearch:{}}]:[])];
      const result=await request(params.model,{contents,systemInstruction:{parts:[{text:(params.instructions||'')+(forced?'\nSearch Google now. Use actual search results and cite the sources.':'')}]},generationConfig:{maxOutputTokens:params.max_output_tokens||1800,thinkingConfig:{thinkingLevel:'low'}},...(tools.length?{tools}:{})},signal);
      const candidate=result.candidates?.[0],native=candidate?.content;
      if(!native?.parts?.length)throw fail(400,'GEMINI_EMPTY_OR_BLOCKED');
      // Retain opaque thought signatures exactly as returned for subsequent tool turns.
      for(const p of native.parts)if(p.functionCall&&!p.functionCall.id)p.functionCall.id=randomUUID();
      const metadata=candidate.groundingMetadata||{},annotations=(metadata.groundingChunks||[]).filter(c=>/^https?:\/\//.test(c.web?.uri||'')).map(c=>({type:'url_citation',url:c.web.uri,title:c.web.title||c.web.uri}));
      const text=native.parts.filter(p=>p.text&&!p.thought).map(p=>p.text).join('\n');
      const output=[{type:'gemini_content',content:native},...native.parts.filter(p=>p.functionCall).map(p=>({type:'function_call',name:p.functionCall.name,arguments:JSON.stringify(p.functionCall.args||{}),call_id:p.functionCall.id})),{type:'message',content:[{type:'output_text',text,annotations}]}];
      if(metadata.webSearchQueries?.length)output.push({type:'web_search_call'});
      if(params.conversation)save(params.conversation,scrub([...contents,native]));
      return {output_text:text,output,usage:{total_tokens:result.usageMetadata?.totalTokenCount||0},status:candidate.finishReason==='MAX_TOKENS'?'incomplete':'completed'};
    }}
  };
}
module.exports={createGeminiAPI,migrateGemini};
