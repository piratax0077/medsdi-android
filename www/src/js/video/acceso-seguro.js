 'use strict';
var medsdiVideoState=null;
const medsdiVideoEndpoint=value=>{
 const base=new URL(MEDSDI_API_URL),target=new URL(value,base.origin),prefix=base.pathname.replace(/\/$/,'')+'/';
 if(base.protocol!=='https:' || target.origin!==base.origin || target.username || target.password || target.search || target.hash || !target.pathname.startsWith(prefix)
  || !/^agenda\/videollamada\/[1-9]\d*\/(paciente|profesional)\/acceso$/.test(target.pathname.slice(prefix.length)))throw new Error('Destino de videollamada no permitido.');
 return target.href;
};
const medsdiVideoBridge=value=>{
 const base=new URL(MEDSDI_API_URL),target=new URL(value,base.origin),path=base.pathname.replace(/\/api\/?$/,'')+'/videollamada/app';
 if(base.protocol!=='https:' || target.origin!==base.origin || target.pathname!==path || target.search || target.hash || target.username || target.password)throw new Error('Destino de videollamada no permitido.');
 return target.href;
};
const medsdiCloseVideoCall=()=>{
 const state=medsdiVideoState;medsdiVideoState=null;if(!state)return;
 state.controller.abort();if(state.heartbeat)clearInterval(state.heartbeat);if(state.deadline)clearTimeout(state.deadline);
 if(state.ref){try{state.ref.close();}catch(error){}}state.ref=null;
};
const medsdiVideoRequest=async(endpoint,state)=>{
 if(state!==medsdiVideoState || !state.token || state.token!==medsdiGetAuthToken())throw new Error('La sesión cambió.');
 const controller=new AbortController(),abort=()=>controller.abort();state.controller.signal.addEventListener('abort',abort,{once:true});
 const timeout=setTimeout(abort,10000);
 try{
  const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+state.token,Accept:'application/json'},credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal});
  if(!response.ok){const error=new Error('No fue posible autorizar la llamada.');error.denied=[401,403,404,409,410,422].includes(response.status);throw error;}
  const data=await response.json();if(state!==medsdiVideoState || state.token!==medsdiGetAuthToken())throw new Error('La sesión cambió.');return data;
 }finally{clearTimeout(timeout);state.controller.signal.removeEventListener('abort',abort);}
};
const medsdiOpenVideoCall=async value=>{
 let state;
 try{
  const endpoint=medsdiVideoEndpoint(value),token=medsdiGetAuthToken();if(!token)throw new Error('Inicia sesión para entrar.');
  if(!window.cordova || !cordova.InAppBrowser)throw new Error('Abre la llamada desde la app actualizada.');
  if(medsdiVideoState && medsdiVideoState.endpoint===endpoint){medsdiVideoState.ref?.show();return;}
  medsdiCloseVideoCall();state={endpoint,token,controller:new AbortController(),ref:null,heartbeat:null,deadline:null,initialized:false,failures:0};medsdiVideoState=state;
  const data=await medsdiVideoRequest(endpoint,state),bridge=medsdiVideoBridge(data.bridge_url),now=Date.now()/1000;
  if(data.domain!=='8x8.vc' || !/^vpaas-magic-cookie-[A-Za-z0-9]+$/.test(data.app_id) || !/^[A-Za-z0-9][A-Za-z0-9._-]{1,180}$/.test(data.room)
   || typeof data.jwt!=='string' || data.jwt.length>16384 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(data.jwt)
   || !Number.isSafeInteger(data.expires_at) || data.expires_at<=now || data.expires_at>now+305 || !Number.isSafeInteger(data.session_end) || data.session_end<=now)throw new Error('Acceso de llamada no válido.');
  const ref=cordova.InAppBrowser.open(bridge,'_blank','location=no,hidden=yes,clearcache=yes,clearsessioncache=yes,mediaPlaybackRequiresUserAction=no');state.ref=ref;
  const valid=()=>state===medsdiVideoState && state.token===medsdiGetAuthToken();
  ref.addEventListener('loadstart',event=>{if(event.url!==bridge && event.url!=='about:blank' && valid())medsdiCloseVideoCall();});
  ref.addEventListener('loadstop',event=>{
   if(!valid() || event.url!==bridge || state.initialized)return;
   if(data.expires_at<=Date.now()/1000){medsdiCloseVideoCall();return;}
   state.initialized=true;
   const payload={domain:data.domain,app_id:data.app_id,room:data.room,jwt:data.jwt,expires_at:data.expires_at};
   const code='(function(){if(location.href!=='+JSON.stringify(bridge)+')return false;if(typeof window.medichileStartVideo!=="function")return false;return window.medichileStartVideo('+JSON.stringify(payload).replace(/</g,'\\u003c')+');})()';
   ref.executeScript({code},result=>{if(!valid())return;if(!result || result[0]!==true){medsdiCloseVideoCall();return;}ref.show();});data.jwt='';payload.jwt='';
  });
  ref.addEventListener('loaderror',()=>{if(valid())medsdiCloseVideoCall();});
  ref.addEventListener('exit',()=>{if(valid()){state.ref=null;medsdiCloseVideoCall();}});
  ref.addEventListener('message',event=>{if(valid() && event.data?.action==='close-video')medsdiCloseVideoCall();});
  state.deadline=setTimeout(()=>{if(valid())medsdiCloseVideoCall();},Math.min(2147483647,(data.session_end-Date.now()/1000)*1000));
  state.heartbeat=setInterval(async()=>{
   if(!valid()){if(state===medsdiVideoState)medsdiCloseVideoCall();return;}
   if(state.checking)return;state.checking=true;
   try{const status=await medsdiVideoRequest(endpoint.replace(/\/acceso$/,'/vigencia'),state);if(status.vigente!==true || !Number.isSafeInteger(status.session_end) || status.session_end<=Date.now()/1000){medsdiCloseVideoCall();return;}state.failures=0;}
   catch(error){if(valid() && (error.denied || ++state.failures>=2))medsdiCloseVideoCall();}
   finally{state.checking=false;}
  },30000);
 }catch(error){if(state && state!==medsdiVideoState)return;medsdiCloseVideoCall();msg('Videollamada','No fue posible autorizar la llamada. Revisa tu sesión y el horario de la cita.','error');}
};
