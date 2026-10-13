import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import {vibes} from '../src/profiles.js';

const env={BREVO_API_KEY:'mock-only',BREVO_LIST_ID:'3',BREVO_SENDER_EMAIL:'invite@unpredictme.com',BREVO_SENDER_NAME:'Annie @UnPredictMe',ALLOWED_ORIGINS:'https://unpredictme.com',SIGNUP_RATE_LIMITER:{limit:async()=>({success:true})},EMAIL_RATE_LIMITER:{limit:async()=>({success:true})}};
const request=(body={},origin='https://unpredictme.com')=>new Request('https://example.test/api/signup',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify({email:'test@example.com',website:'',marketingConsent:false,readingRequested:true,...body})});
test('all prediction profiles are available',()=>assert.equal(vibes.length,3));
test('signup validation, mapping, sender and failure behavior',async()=>{
 const original=globalThis.fetch;let calls=[];let failContact=false,failMail=false;
 globalThis.fetch=async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return new Response('{}',{status:url.endsWith('/contacts')?(failContact?500:201):(failMail?500:201)});};
 try{
  assert.equal((await worker.fetch(request({},'https://evil.test'),env)).status,403);
  assert.equal((await worker.fetch(request({email:'bad'}),env)).status,400);
  assert.equal((await worker.fetch(request({website:'bot'}),env)).status,400);
  assert.equal((await worker.fetch(request({readingRequested:false}),env)).status,400);
  assert.equal((await worker.fetch(request(),{...env,BREVO_API_KEY:''})).status,503);
  assert.equal((await worker.fetch(request(),{...env,SIGNUP_RATE_LIMITER:{limit:async()=>({success:false})}})).status,429);
  assert.equal(calls.length,0);
  const response=await worker.fetch(request({marketingConsent:true}),env);assert.equal(response.status,200);assert.equal((await response.json()).emailSent,true);
  assert.deepEqual(calls[0].body.listIds,[3]);assert.equal(calls[0].body.updateEnabled,true);assert.equal(calls[0].body.attributes.UPM_MARKETING_CONSENT,true);assert.equal(calls[0].body.email,'test@example.com');assert.equal('emailBlacklisted' in calls[0].body,false);
  assert.deepEqual(calls[1].body.sender,{email:'invite@unpredictme.com',name:'Annie @UnPredictMe'});
  calls=[];failContact=true;assert.equal((await worker.fetch(request(),env)).status,502);assert.equal(calls.length,1);
  failContact=false;failMail=true;const partial=await worker.fetch(request(),env);assert.equal(partial.status,200);assert.equal((await partial.json()).emailSent,false);
 }finally{globalThis.fetch=original;}
});
