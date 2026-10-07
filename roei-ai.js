'use strict';
const OpenAI = require('openai');
const { randomUUID } = require('node:crypto');
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits: P } = require('discord.js');
const { AIStore, cleanName } = require('./ai-store');
const { createRegistry, visible } = require('./ai-tools');
const { AIService, wantsWeb } = require('./ai-service');
const { attachmentInput } = require('./ai-web');
const { probeAI } = require('./ai-probe');
const { RANKS } = require('./coins-store');
const CHANNEL_ID='1556887709568737360', OWNER_ID='1243097719262941224';
const safe={allowedMentions:{parse:[],repliedUser:false}};
const btn=(id,label,style=ButtonStyle.Secondary)=>new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style);
function describeAction(c) {
  const a=c.args;
  return ({daily:'קבלת הפרס היומי שלך',pay:`העברת ${a.amount} Coins ל־<@${a.recipient}>`,buy_rank:`רכישת ${RANKS[a.rank]?.name} במחיר ${RANKS[a.rank]?.price} Coins. אפשר לקנות רק את הדרגה הבאה; אין החזר על דרגה קודמת.`,open_ticket:`פתיחת טיקט מסוג ${{report:'דיווח',technical:'תמיכה טכנית',general:'כללי'}[a.type]}`,suggestion:`שליחת הצעה: ${a.text}`,music_action:`פעולת מוזיקה: ${{play:'ניגון',pause:'השהיה',resume:'המשך',skip:'דילוג',stop:'עצירה'}[a.action]} ${a.query||''}`,playlist_action:`פלייליסט ${a.name}: ${{create:'יצירה',add:'הוספת שיר',play:'ניגון'}[a.action]} ${a.song||''}`,create_poll:`יצירת סקר: ${a.question}\n${a.first} / ${a.second}`,arcade:`פתיחת משחק ${a.game==='bomba'?'בומבה':'המתחזה'}`})[c.name] || 'פעולה';
}
const row=(...buttons)=>new ActionRowBuilder().addComponents(...buttons);
const string=(name,description,required=true,max=100)=>o=>o.setName(name).setDescription(description).setRequired(required).setMaxLength(max);
const ai=new SlashCommandBuilder().setName('ai').setDescription('Roei AI — שיחה, זיכרון והגדרות');
ai.addSubcommand(s=>s.setName('name').setDescription('שם אישי ל־AI שלך').addStringOption(string('name','2–24 תווים',true,24)));
for(const [name,description] of Object.entries({reset:'התחלת שיחה חדשה לאחר אישור',memory:'הצגת הזיכרון האישי שלך',forget:'מחיקת זיכרון לאחר אישור',private:'פתיחת שיחה בשרשור פרטי',status:'בעלים: מצב המערכת',help:'הסבר ופקודות'}))ai.addSubcommand(s=>s.setName(name).setDescription(description));
ai.addSubcommand(s=>s.setName('settings').setDescription('העדפות אישיות').addStringOption(string('language','שפה או auto',false,30)).addStringOption(o=>o.setName('style').setDescription('סגנון התשובה').addChoices(...['רגיל','קצר','מפורט','מצחיק','מקצועי'].map(value=>({name:value,value})))).addStringOption(string('interests','תחומי עניין שברצונך לשמור',false,400)));
ai.addSubcommand(s=>s.setName('config').setDescription('בעלים: יכולות ומגבלות').addStringOption(o=>o.setName('setting').setDescription('הגדרה').setRequired(true).addChoices(...['enabled','web','memory','actions','vision','files','maxOutputTokens','dailyRequests','dailyTokens','dailyWeb','concurrent'].map(value=>({name:value,value})))).addStringOption(string('value','true / false או מספר',true,12)));
ai.addSubcommand(s=>s.setName('knowledge').setDescription('בעלים: הוספה או הסרה של חדר ידע ציבורי').addChannelOption(o=>o.setName('channel').setDescription('חדר חוקים/מידע').setRequired(true).addChannelTypes(ChannelType.GuildText)).addBooleanOption(o=>o.setName('enabled').setDescription('להוסיף כמקור ידע').setRequired(true)));
const commands=[ai,new SlashCommandBuilder().setName('ai-name').setDescription('שם אישי ל־Roei AI').addStringOption(string('name','2–24 תווים',true,24)),...['reset','profile','help'].map(name=>new SlashCommandBuilder().setName(`ai-${name}`).setDescription({reset:'איפוס השיחה האישית',profile:'פרופיל ה־AI שלך',help:'עזרה ל־Roei AI'}[name]))];
const HELP='🤖 **Roei AI**\nלחצו על **פתיחת השיחה הפרטית שלי** או השתמשו ב־`/ai private`. דברו עם ה־AI בתוך השרשור האישי: שאלות, קוד, תמונות, PDF וחיפוש באינטרנט.\n`/ai name` שם אישי · `/ai settings` שפה וסגנון · `/ai memory` זיכרון · `/ai reset` שיחה חדשה · `/ai forget` מחיקת זיכרון.\nפעולות שמשנות דברים דורשות אישור אישי. החדר הראשי הוא חדר כניסה; ה־AI אינו עונה בו לשיחות. הודעות ישנות בחדר הראשי נשארות גלויות.\nמנהלים בעלי הרשאה מתאימה עשויים לראות שרשורים פרטיים. תוכן השיחה נשלח ל־OpenAI לצורך מענה.';
function friendly(e) {
  const texts={BUSY:'⏳ בקשה קודמת שלך עדיין פועלת. אפשר לעצור אותה בכפתור.',CAPACITY:'⏳ המערכת עמוסה כרגע. נסה שוב בעוד רגע.',COOLDOWN:'⏳ המתן 3 שניות בין בקשות.',BUDGET:'הגעת למגבלת השימוש היומית. המגבלה מתחדשת בחצות UTC.',WEB_BUDGET:'החיפוש ברשת כבוי או שמכסת החיפוש היומית הסתיימה.',WEB_UNAVAILABLE:'החיפוש ברשת אינו זמין כרגע. לא הצגתי תוצאות שלא בדקתי.',DISABLED:'מערכת ה־AI כבויה כרגע.',NAME:'השם צריך להכיל 2–24 תווים, ללא תיוגים או עיצוב.',STALE:'האישור פג תוקף או שייך למשתמש אחר.',PERMISSION:'אין הרשאה לפעולה הזאת.',ATTACHMENT_SIZE:'הקובץ גדול מדי. עד 4 MB לתמונה/PDF ועד 64 KB לקובץ טקסט.',ATTACHMENT_TYPE:'סוג הקובץ אינו נתמך או שהיכולת כבויה.',CLEANUP_PENDING:'הזיכרון המקומי נותק ונמחק. מחיקת עותק השיחה אצל הספק עדיין לא הושלמה; הפעל שוב /ai forget כדי לנסות שוב.'};
  if(e.name==='AbortError' || e.name==='APIUserAbortError')return 'הבקשה נעצרה או הגיעה למגבלת הזמן.';
  if(e.status===401 || e.status===403)return 'חיבור ה־AI נדחה. בעל השרת צריך לבדוק את מפתח ה־API והרשאותיו.';
  if(e.status===429 && (e.type==='insufficient_quota' || ['insufficient_quota','credit_balance_exhausted','organization_spend_limit_exceeded','project_spend_limit_exceeded','organization_usage_limit_exceeded'].includes(e.code)))return 'אין כרגע מכסה זמינה בחשבון OpenAI של הבוט. בעל השרת צריך לבדוק יתרה וחיוב ב־OpenAI; זו לא מגבלת ההודעות שלך בבוט.';
  if(e.status===429)return 'OpenAI מגביל כרגע את קצב הבקשות. זו לא מגבלת ההודעות היומית שלך בבוט. נסה שוב בעוד דקה.';
  return texts[e.message] || 'לא הצלחתי להשלים את הבקשה. אפשר לנסות שוב; שאר מערכות הבוט ממשיכות לעבוד.';
}
function payload(text) { return text.length<=1900?{content:text,...safe}:{content:'התשובה המלאה מצורפת כדי לשמור על הטקסט והקוד ללא חיתוך.',files:[{attachment:Buffer.from(text,'utf8'),name:'Roei-AI-answer.txt'}],...safe}; }
function createAISystem({client,guildId,coins,adapters,env=process.env,api:provided}) {
  let store,service,ready=false;const destructive=new Map(),lastMessages=new Map(),opening=new Map();
  const report=e=>console.error(`Roei AI error: ${Number(e.status)||'local'} code=${/^[a-zA-Z0-9_]{2,60}$/.test(e.code||'')?e.code:/^[A-Z_]{2,40}$/.test(e.message)?e.message:'request_failed'}`);
  async function start() {
    if(ready)return;
    if(!env.OPENAI_API_KEY && !provided){console.log('Roei AI disabled: OPENAI_API_KEY is missing');return;}
    if(!coins.store){console.log('Roei AI waiting for persistent storage');const retry=setTimeout(()=>void start(),15000);retry.unref?.();return;}
    try {
      store=new AIStore(coins.store.db);
      const api=provided || new OpenAI({apiKey:env.OPENAI_API_KEY,maxRetries:0,timeout:45000});
      const registry=createRegistry({client,guildId,coins,adapters,store});service=new AIService({api,store,registry,model:env.AI_MODEL||'gpt-6-luna',env});ready=true;
      console.log('Roei AI ready: persistent memory, Responses/Conversations, web search');
      // Read-only connectivity probe: no prompt, token or credential is logged.
      try {await api.models.retrieve(service.model);service.health.api='model_access_ok';console.log('Roei AI model access: OK');void probeAI(api,service.model,store,service.health);}catch(e){service.health.api=`error_${Number(e.status)||'connection'}`;report(e);}
      const guild=await client.guilds.fetch(guildId),channel=await guild.channels.fetch(CHANNEL_ID);
      // Scope permission changes to the AI entrance, never other server channels.
      const me=await guild.members.fetchMe();
      await channel.permissionOverwrites.edit(me.id,{SendMessages:true,SendMessagesInThreads:true,CreatePrivateThreads:true});
      await channel.permissionOverwrites.edit(guild.roles.everyone.id,{SendMessages:false,SendMessagesInThreads:true,CreatePublicThreads:false,CreatePrivateThreads:false});
      console.log('Roei AI private entrance: configured; public AI replies disabled');
      const settings=store.settings();let panel=settings.panelId?await channel.messages.fetch(settings.panelId).catch(e=>{if(e.code!==10008)throw e;}):null;
      if(!panel){let before;for(let page=0;page<20 && !panel;page++){const batch=await channel.messages.fetch({limit:100,...(before?{before}:{})});panel=batch.find(m=>m.author.id===client.user.id && m.embeds[0]?.footer?.text==='roei-ai:panel:v1');if(batch.size<100)break;before=batch.last().id;}}
      const data={components:[row(btn('ai:private','פתיחת השיחה הפרטית שלי',ButtonStyle.Primary))],embeds:[{title:'🤖 Roei AI',description:HELP,color:0x5865f2,footer:{text:'roei-ai:panel:v1'}}],...safe};
      if(panel)await panel.edit(data);else panel=await channel.send(data);store.settings({panelId:panel.id});
    }catch(e){report(e);}
  }
  async function privateThread(i) {
    const userId=i.user.id;
    if(opening.has(userId))return opening.get(userId);
    const pending=(async()=>{
      const channel=await i.guild.channels.fetch(CHANNEL_ID),member=await i.guild.members.fetch({user:userId,force:true}),me=await i.guild.members.fetchMe();
      if(member.communicationDisabledUntilTimestamp>Date.now() || !await visible(channel,member,me) || !channel.permissionsFor(member).has(P.SendMessagesInThreads) || !channel.permissionsFor(me).has([P.CreatePrivateThreads,P.SendMessagesInThreads]))throw new Error('PERMISSION');
      const p=store.get(userId);
      let thread=p.privateThreadId?await i.guild.channels.fetch(p.privateThreadId).catch(e=>{if(e.code!==10003)throw e;return null;}):null;
      if(thread && (thread.type!==ChannelType.PrivateThread || thread.parentId!==CHANNEL_ID || thread.ownerId!==me.id))throw new Error('PERMISSION');
      if(thread?.archived)await thread.setArchived(false);
      if(thread?.invitable)await thread.setInvitable(false);
      if(!thread){thread=await channel.threads.create({name:`Roei AI ${userId.slice(-5)}`,type:ChannelType.PrivateThread,invitable:false,autoArchiveDuration:1440});const fresh=store.get(userId);fresh.privateThreadId=thread.id;store.save(fresh);}
      await thread.members.add(userId);
      return `השיחה הפרטית שלך: <#${thread.id}>. כתוב שם כדי לדבר עם ה־AI. מנהלים בעלי הרשאה מתאימה עשויים לראות את השרשור.`;
    })();
    opening.set(userId,pending);
    try{return await pending;}finally{opening.delete(userId);}
  }
  async function onMessage(message,{regenerate=false}={}) {
    if(!ready || message.guildId!==guildId || message.author.bot || message.webhookId || message.system)return;
    // Fail closed even if a staff overwrite still permits posting in the entrance.
    if(message.channelId===CHANNEL_ID || message.channel?.parentId!==CHANNEL_ID || message.channel.type!==ChannelType.PrivateThread)return;
    const profile=store.get(message.author.id),privateMode=message.channelId!==CHANNEL_ID && profile.privateThreadId===message.channelId;
    if(message.channelId!==CHANNEL_ID && !privateMode)return;
    if(!service.settings().enabled)return;
    const text=message.content || '';
    if(text.length>6000 || message.attachments.size>2){await message.reply({content:'עד 6,000 תווים ושני קבצים בכל בקשה.',...safe});return;}
    if(!text.trim() && !message.attachments.size)return;
    let status,timer;
    try {
      const member=await message.guild.members.fetch({user:message.author.id,force:true}),me=await message.guild.members.fetchMe();
      if(!await visible(message.channel,member,me))throw new Error('PERMISSION');
      status=await message.reply({content:wantsWeb(text)?'🌐 בודק ברשת…':'🤖 חושב…',components:[row(btn(`ai:stop:${message.author.id}`,'עצור',ButtonStyle.Danger))],...safe});
      await message.channel.sendTyping();timer=setInterval(()=>message.channel.sendTyping().catch(()=>{}),8000);timer.unref?.();
      const ctx={userId:message.author.id,guildId,channelId:message.channelId,private:privateMode,regenerate,external:message.attachments.size>0 || !!message.reference};
      const result=await service.run(ctx,async signal=>{
        const content=[{type:'input_text',text:regenerate?`ענה מחדש לבקשה הזו, בלי לחזור על פעולות שכבר בוצעו: ${text}`:text||'תאר את הקובץ המצורף.'}];
        if(message.reference?.messageId) {
          const ref=await message.channel.messages.fetch(message.reference.messageId).catch(()=>null);
          // Only the user's own text or their own tracked AI reply can add reply context.
          if(ref && (ref.author.id===message.author.id || ref.id===profile.lastAnswerId))content.push({type:'input_text',text:`Untrusted quoted reply: ${ref.content.slice(0,3000)}`});
        }
        for(const a of message.attachments.values())content.push(await attachmentInput(a,service.settings(),signal));
        return content;
      },text);
      const components=[row(btn(`ai:regen:${message.author.id}:${message.id}`,'ענה מחדש'))];
      await status.edit({...payload(`**${result.name}**\n${result.text}`),components});
      const fresh=store.get(message.author.id);fresh.lastAnswerId=status.id;store.save(fresh);
      lastMessages.set(message.author.id,message);if(lastMessages.size>200)lastMessages.delete(lastMessages.keys().next().value);
      for(const c of result.confirmations)await message.reply({content:`⚠️ **אישור פעולה**\n${describeAction(c).slice(0,1500)}\nהאישור אישי ותקף לדקה.`,components:[row(btn(`ai:confirm:${c.nonce}`,'אישור',ButtonStyle.Success),btn(`ai:cancel:${c.nonce}`,'ביטול',ButtonStyle.Danger))],...safe});
    }catch(e){report(e);if(status)await status.edit({content:friendly(e),components:[],...safe}).catch(()=>{});else await message.reply({content:friendly(e),...safe}).catch(()=>{});}finally{if(timer)clearInterval(timer);}
  }
  async function handle(i) {
    const slash=i.isChatInputCommand?.() && commands.some(c=>c.name===i.commandName),component=i.isButton?.() && i.customId.startsWith('ai:');
    if(!slash && !component)return false;
    try {
      await i.deferReply({ephemeral:true});
      if(!ready){await i.editReply({content:'Roei AI עדיין לא מחובר. בעל השרת צריך לבדוק את הגדרות ה־API והאחסון.',...safe});return true;}
      if(i.guildId!==guildId || i.user.bot)throw new Error('PERMISSION');
      const ctx={userId:i.user.id,guildId,channelId:i.channelId},p=store.get(i.user.id);
      const send=text=>i.editReply(payload(text));
      if(component) {
        const [,action,id,messageId]=i.customId.split(':');
        if(action==='private'){await send(await privateThread(i));return true;}
        if(['stop','regen'].includes(action)) {
          if(id!==i.user.id)throw new Error('PERMISSION');
          if(action==='stop')return await send(service.stop(id)?'עוצר את הבקשה…':'אין בקשה פעילה.'),true;
          const m=lastMessages.get(id);if(!m || m.id!==messageId || m.channelId!==i.channelId)throw new Error('STALE');
          await send('מכין תשובה חדשה.');void onMessage(m,{regenerate:true});return true;
        }
        if(['confirm','cancel'].includes(action)) {const result=await service.confirm(id,ctx,action==='cancel');await i.message.edit({components:[]}).catch(()=>{});await send(result.cancelled?'בוטל.':typeof result.content==='string'?result.content:JSON.stringify(result,null,2));return true;}
        if(action==='reset' || action==='forget') {
          const c=destructive.get(id);if(!c || c.userId!==i.user.id || c.expires<Date.now() || c.action!==action)throw new Error('STALE');destructive.delete(id);
          await service.forget(i.user.id,action==='reset'?'conversation':'all');await i.message.edit({components:[]}).catch(()=>{});await send(action==='reset'?'השיחה אופסה. השם וההעדפות נשמרו.':'היסטוריית השיחות, הסיכומים ותחומי העניין נמחקו.');return true;
        }
        throw new Error('STALE');
      }
      const action=i.commandName==='ai'?i.options.getSubcommand():i.commandName.slice(3);
      if(action==='help'){await send(HELP);return true;}
      if(action==='status') {if(i.user.id!==OWNER_ID)throw new Error('PERMISSION');await send(JSON.stringify({model:service.model,health:service.health,persistentStorage:'SQLite /data',active:service.active,lockedUsers:service.running.size,settings:service.settings()},null,2));return true;}
      if(action==='config' || action==='knowledge') {
        if(i.user.id!==OWNER_ID)throw new Error('PERMISSION');
        if(action==='knowledge'){const c=i.options.getChannel('channel'),enabled=i.options.getBoolean('enabled');const ids=new Set(store.settings().knowledgeChannels);if(enabled){if(!c.permissionsFor(i.guild.roles.everyone)?.has([P.ViewChannel,P.ReadMessageHistory]))throw new Error('PERMISSION');ids.add(c.id);}else ids.delete(c.id);if(ids.size>5)throw new Error('LIMIT');store.settings({knowledgeChannels:[...ids]});}
        else {const key=i.options.getString('setting'),raw=i.options.getString('value'),ranges={maxOutputTokens:[300,4000],dailyRequests:[1,500],dailyTokens:[1000,1000000],dailyWeb:[0,100],concurrent:[1,6]};let value;if(ranges[key]){value=Number(raw);if(!Number.isInteger(value)||value<ranges[key][0]||value>ranges[key][1])throw new Error('LIMIT');}else{if(!['true','false'].includes(raw))throw new Error('LIMIT');value=raw==='true';}store.settings({[key]:value});}
        await send('ההגדרה נשמרה.');return true;
      }
      if(['reset','forget'].includes(action)) {
        for(const [key,c] of destructive)if(c.expires<Date.now())destructive.delete(key);
        const id=randomUUID();destructive.set(id,{userId:i.user.id,action,expires:Date.now()+60000});
        await i.editReply({content:action==='reset'?'לאפס את כל הקשר השיחות שלך (ציבורי ופרטי), תוך שמירת שם והעדפות?':'למחוק את היסטוריית השיחות, הסיכומים ותחומי העניין שלך?',components:[row(btn(`ai:${action}:${id}`,'אישור מחיקה',ButtonStyle.Danger))],...safe});return true;
      }
      if(service.running.has(i.user.id))throw new Error('BUSY');
      if(action==='name'){p.assistantName=cleanName(i.options.getString('name'));store.save(p);await send(`השם האישי שלך: **${p.assistantName}**`);return true;}
      if(action==='settings'){p.preferredLanguage=i.options.getString('language')||p.preferredLanguage;p.responseStyle=i.options.getString('style')||p.responseStyle;p.preferences=i.options.getString('interests')??p.preferences;store.save(p);await send('ההעדפות נשמרו.');return true;}
      if(action==='memory' || action==='profile'){await send(`שם: ${p.assistantName}\nשפה: ${p.preferredLanguage}\nסגנון: ${p.responseStyle}\nתחומי עניין: ${p.preferences||'לא הוגדרו'}\nסיכום ציבורי: ${p.memorySummary||'עדיין אין סיכום'}\nסיכום פרטי: ${p.privateSummary||'עדיין אין סיכום'}\nהודעות אחרונות:\n${[...(p.recentMessages||[]),...(p.privateRecent||[])].map(m=>`${m.role}: ${m.text}`).join('\n').slice(0,14000)}`);return true;}
      if(action==='private'){await send(await privateThread(i));return true;}
    }catch(e){report(e);await i.editReply({content:friendly(e),...safe}).catch(()=>{});}
    return true;
  }
  return {start,onMessage,handle,commands,get ready(){return ready;},get service(){return service;}};
}
module.exports={createAISystem,commands,CHANNEL_ID,payload,friendly};
