import {vibes} from './profiles.js';
const validEmail=v=>typeof v==='string'&&v.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
function profile(email){let hash=0;for(const c of email.toLowerCase())hash=(Math.imul(hash,31)+c.charCodeAt(0))|0;return vibes[Math.abs(hash)%vibes.length];}
const escapeHtml=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin');
  const allowed=(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
  const cors=origin&&allowed.includes(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{};
  const reply=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...cors,...extra}});
  const path=new URL(request.url).pathname;
  if(path==='/health'&&request.method==='GET')return reply({ok:true,service:'unpredict-me-signup'});
  if(path!=='/api/signup')return reply({error:'Not found.'},404);
  if(!origin||!allowed.includes(origin))return reply({error:'This website is not allowed.'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});
  if(request.method!=='POST')return reply({error:'Use POST.'},405,{Allow:'POST, OPTIONS'});
  if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))return reply({error:'Send JSON.'},415);
  const list=Number(env.BREVO_LIST_ID);
  if(!env.BREVO_API_KEY||!Number.isSafeInteger(list)||list<=0||!validEmail(env.BREVO_SENDER_EMAIL)||!env.BREVO_SENDER_NAME||!env.SIGNUP_RATE_LIMITER||!env.EMAIL_RATE_LIMITER)return reply({error:'Signup is not configured yet.'},503);
  try{
   const ip=request.headers.get('CF-Connecting-IP');
   if(!ip)return reply({error:'Unable to verify this request.'},403);
   if(!(await env.SIGNUP_RATE_LIMITER.limit({key:'ip:'+ip})).success)return reply({error:'A little cosmic pause. Try again in a minute.'},429,{'Retry-After':'60'});
   const reader=request.body?.getReader();if(!reader)return reply({error:'Missing form data.'},400);
   const chunks=[];let size=0;
   while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();return reply({error:'Form data is too large.'},413);}chunks.push(value);}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
   let data;try{data=JSON.parse(new TextDecoder().decode(bytes));}catch{return reply({error:'Invalid form data.'},400);}
   if(!data||Array.isArray(data)||typeof data!=='object')return reply({error:'Invalid form data.'},400);
   if(typeof data.website!=='string'||data.website.trim())return reply({error:'Unable to accept this signup.'},400);
   if(typeof data.email!=='string'||!validEmail(data.email.trim())||typeof data.marketingConsent!=='boolean'||data.readingRequested!==true)return reply({error:'Enter a valid email and request your reading.'},400);
   const email=data.email.trim();
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(email.toLowerCase()));
   const emailKey=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
   if(!(await env.EMAIL_RATE_LIMITER?.limit({key:emailKey}))?.success)return reply({error:'Please wait a minute before requesting another reading.'},429,{'Retry-After':'60'});
   const vibe=profile(email);
   // Only affirmative marketing consent is written. A reading request never re-enables a blocklisted contact.
   const attributes={UPM_VIBE:vibe.name,UPM_LAST_REQUEST_MARKETING:data.marketingConsent,UPM_READING_REQUESTED:true};if(data.marketingConsent)attributes.UPM_MARKETING_CONSENT=true;
   const call=(url,body)=>fetch(url,{method:'POST',headers:{'api-key':env.BREVO_API_KEY,'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
   const contact=await call('https://api.brevo.com/v3/contacts',{email,attributes,listIds:[list],updateEnabled:true});
   if(!contact.ok)return reply({error:'We couldn’t save your signup. Please try again later.'},502);
   let emailSent=false;
   try{const sent=await call('https://api.brevo.com/v3/smtp/email',{sender:{email:env.BREVO_SENDER_EMAIL,name:env.BREVO_SENDER_NAME},to:[{email}],subject:'Molly has a hunch: '+vibe.name,textContent:`Molly’s playful reading\n\n${vibe.name}\n${vibe.prediction}\n\nYour traits: ${vibe.traits.join(', ')}\n\nJust for fun. This is a fictional reading, not a factual assessment.\nhttps://unpredictme.com`,htmlContent:`<html><body style="background:#fff9ef;color:#211533;font-family:Arial,sans-serif;padding:32px"><p>MOLLY THE PREDICTOR</p><h1>${escapeHtml(vibe.name)}</h1><p>${escapeHtml(vibe.prediction)}</p><p>${escapeHtml(vibe.traits.join(' · '))}</p><p><small>Just for fun. A fictional reading, not a factual assessment.</small></p><a href="https://unpredictme.com">Explore your cosmic vibe</a></body></html>`});emailSent=sent.ok;}catch{/* Contact is saved; report partial success without encouraging automatic resend. */}
   return reply({ok:true,vibe:vibe.name,emailSent});
  }catch{return reply({error:'Molly’s connection fizzled. Please try again later.'},502);}
 }
};
