const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');
function harness(){
 const calls=[],windows=[],intervals=new Map(),timeouts=new Map();let tick=Date.now(),id=0;
 const storage=new Map();const store={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 const chain=new Proxy({},{get:()=>()=>chain});const $=()=>chain;$.trim=v=>String(v||'');
 class Clock extends Date{static now(){return tick;}}
 const c=vm.createContext({localStorage:store,sessionStorage:store,document:{addEventListener(){}},window:{location:{protocol:'https:',hostname:'medichile.cl'},cordova:{}},$,URL,URLSearchParams,Date:Clock,AbortController,
  console:{warn(){},error(){},log(){}},msg(){},setInterval:fn=>{const n=++id;intervals.set(n,fn);return n;},clearInterval:n=>intervals.delete(n),setTimeout:fn=>{const n=++id;timeouts.set(n,fn);return n;},clearTimeout:n=>timeouts.delete(n)});
 const data={jwt:'aaa.bbb.ccc',domain:'8x8.vc',app_id:'vpaas-magic-cookie-testapp',room:'Consulta.prueba',expires_at:Math.floor(tick/1000)+120,session_end:Math.floor(tick/1000)+600,bridge_url:'/videollamada/app'};
 c.cordova={InAppBrowser:{open:(url,target,options)=>{const events={},scripts=[];const ref={url,target,options,events,scripts,closed:false,shown:false,addEventListener:(n,fn)=>events[n]=fn,show(){this.shown=true;},close(){this.closed=true;},executeScript:(value,done)=>{scripts.push(value.code);done([true]);}};windows.push(ref);return ref;}}};
 c.fetch=async(url,options)=>{calls.push({url,options});return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(url.endsWith('/vigencia')?{vigente:true,session_end:data.session_end}:data))};};
 const run=code=>vm.runInContext(code,c);for(const f of ['api/api.js','video/acceso-seguro.js'])run(fs.readFileSync(path.join(root,'www/src/js',f),'utf8'));run("medsdiSetAuthToken('API_SECRETO')");
 return {c,run,calls,windows,data,intervals,timeouts,advance:n=>tick+=n,join:()=>run("medsdiOpenVideoCall('/api/agenda/videollamada/501/paciente/acceso')")};
}
test('autorización se pide por POST y el navegador no recibe el token API en el URL',async()=>{
 const h=harness();await h.join();assert.equal(h.calls[0].options.method,'POST');assert.equal(h.calls[0].options.headers.Authorization,'Bearer API_SECRETO');assert.equal(h.calls[0].options.redirect,'error');assert.equal(h.windows[0].url,'https://medichile.cl/videollamada/app');assert.equal(h.windows[0].url.includes('SECRETO'),false);assert.equal(h.windows[0].url.includes('aaa.bbb'),false);
});
test('el acceso de sala se transfiere solo al puente verificado',async()=>{
 const h=harness();await h.join();const ref=h.windows[0];ref.events.loadstop({url:ref.url});assert.equal(ref.scripts.length,1);assert.ok(ref.scripts[0].includes('aaa.bbb.ccc'));assert.ok(!ref.scripts[0].includes('API_SECRETO'));assert.equal(ref.shown,true);
});
test('un cambio de origen cierra la ventana sin inyectar credenciales',async()=>{
 const h=harness();await h.join();const ref=h.windows[0];ref.events.loadstop({url:'https://ajeno.invalid'});assert.equal(ref.scripts.length,0);ref.events.loadstart({url:'https://ajeno.invalid'});assert.equal(ref.closed,true);
});
test('rechaza rutas, firmas antiguas y proveedores no autorizados antes de abrir',async()=>{
 const h=harness();for(const url of ['https://ajeno.invalid/api/agenda/videollamada/1/paciente/acceso','/api/agenda/videollamada/1/paciente?signature=vieja','javascript:alert(1)'])assert.throws(()=>h.run('medsdiVideoEndpoint('+JSON.stringify(url)+')'),/permitido/);
 h.data.bridge_url='https://ajeno.invalid/videollamada/app';await h.join();assert.equal(h.windows.length,0);
});
test('sin token o sin plugin no abre una llamada pública alternativa',async()=>{
 const h=harness();h.run('medsdiClearAuthToken()');await h.join();assert.equal(h.windows.length,0);assert.equal(h.calls.length,0);h.run("medsdiSetAuthToken('prueba')");delete h.c.cordova.InAppBrowser;await h.join();assert.equal(h.calls.length,0);
});
test('cerrar sesión y cambiar cuenta cierran la llamada y sus temporizadores',async()=>{
 const h=harness();await h.join();const ref=h.windows[0];h.run("medsdiSetAuthToken('otra_cuenta')");assert.equal(ref.closed,true);assert.equal(h.intervals.size,0);assert.equal(h.timeouts.size,0);
});
test('la comprobación periódica cierra una cita revocada',async()=>{
 const h=harness();await h.join();const ref=h.windows[0];h.c.fetch=async()=>({ok:false,status:403});await [...h.intervals.values()][0]();assert.equal(ref.closed,true);
});
test('dos fallos de red cierran la llamada sin conservar un acceso indefinido',async()=>{
 const h=harness();await h.join();const ref=h.windows[0],check=[...h.intervals.values()][0];h.c.fetch=async()=>{throw new Error('red');};await check();assert.equal(ref.closed,false);await check();assert.equal(ref.closed,true);
});
test('una respuesta explícita no vigente cierra la llamada',async()=>{
 const h=harness();await h.join();const ref=h.windows[0];h.c.fetch=async()=>({ok:true,status:200,json:async()=>({vigente:false,session_end:h.data.session_end})});await [...h.intervals.values()][0]();assert.equal(ref.closed,true);
});
test('una respuesta tardía tras cerrar sesión no abre ventanas',async()=>{
 const h=harness();h.c.fetch=async()=>{h.run('medsdiClearAuthToken()');return {ok:true,status:200,json:async()=>h.data};};await h.join();assert.equal(h.windows.length,0);
});
test('credencial vencida mientras carga el puente no se inyecta',async()=>{
 const h=harness();await h.join();const ref=h.windows[0];h.advance(121000);ref.events.loadstop({url:ref.url});assert.equal(ref.scripts.length,0);assert.equal(ref.closed,true);
});
test('el cierre de la página puente libera la ventana de llamada',async()=>{
 const h=harness();await h.join();const ref=h.windows[0];ref.events.message({data:{action:'close-video'}});assert.equal(ref.closed,true);
});
test('los botones de agenda ya no concatenan enlaces en onclick',()=>{
 const source=fs.readFileSync(path.join(root,'www/src/js/home/modulo.js'),'utf8');assert.ok(!/onclick=[^\n]*abrirVideollamadaApp/.test(source));assert.ok(source.includes('data-video-endpoint="${escaparTextoConsentimiento(hora.video_url)}"'));assert.ok(source.includes("escaparTextoConsentimiento(hora.video_url) + '\">Iniciar videollamada"));
});

test('una solicitud que excede el plazo se aborta sin abrir navegador',async()=>{
 const h=harness();h.c.fetch=(url,options)=>new Promise((resolve,reject)=>{options.signal.addEventListener('abort',()=>reject(new Error('timeout')));});
 const pending=h.join();assert.equal(h.timeouts.size,1);[...h.timeouts.values()][0]();await pending;assert.equal(h.windows.length,0);
});
