const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');
function harness(options={}){
 const values=new Map(Object.entries({uuid:'equipo',biometria_login_uuid:'equipo',biometria_login_usuario:'prueba@example.invalid',biometria_login_habilitada:'1',...options.storage}));
 const store={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k),key:i=>[...values.keys()][i],get length(){return values.size;}};
 const nodes=new Map(),requests=[],events={},callbacks={};let login=true,prompts=0;
 function $(key){if(!nodes.has(key))nodes.set(key,{visible:true,value:'',text:''});const n=nodes.get(key);const chain=new Proxy({}, {get(_,name){
  if(name==='val')return (...v)=>v.length?(n.value=v[0],chain):n.value;
  if(name==='text')return (...v)=>v.length?(n.text=v[0],chain):n.text;
  if(name==='hasClass')return ()=>login;
  if(name==='show')return ()=>{n.visible=true;return chain;};if(name==='hide')return ()=>{n.visible=false;return chain;};if(name==='toggle')return v=>{n.visible=!!v;return chain;};
  if(name==='on')return (event,selector,fn)=>{events[event+'|'+selector]=fn;return chain;};if(name==='length')return 0;return ()=>chain;
 }});return chain;}
 $.trim=v=>String(v||'').trim();$.ajax=req=>{requests.push(req);return {abort(){}};};$.mobile={};
 const document={addEventListener:(name,fn)=>events[name]=fn};const c=vm.createContext({localStorage:store,sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},document,
 window:{cordova:{},location:{protocol:'https:',hostname:'medichile.cl'}},cordova:{platformId:'android'},$,URL,URLSearchParams,TextEncoder,TextDecoder,Uint8Array,
 console:{warn(){},error(){},log(){}},setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){},msg(){},cargando(){},vista(){login=false;},_SESSION:()=>1,obtenerUuidDispositivo:()=> 'equipo',inicializarNotificacionesPush(){},sesionUsuarioInit(){}});
 c.Fingerprint={isAvailable:ok=>options.unavailable?null:ok('finger'),loadBiometricSecret:(opts,ok,error)=>{prompts++;callbacks.ok=ok;callbacks.error=error;}};
 if(options.unavailable)c.Fingerprint.isAvailable=(ok,error)=>error({code:-1});
 if(options.noPlugin)delete c.Fingerprint;
 const run=s=>vm.runInContext(s,c);for(const f of ['api/api.js','login/modulo.js','autorizacion/modulo.js'])run(fs.readFileSync(path.join(root,'www/src/js',f),'utf8'));
 return {c,run,nodes,requests,events,callbacks,values,prompts:()=>prompts,leave:()=>login=false,secret:()=>Buffer.from(JSON.stringify({user:'prueba@example.invalid',pass:'CLAVE_FICTICIA',pin:'4826'})).toString('hex')};
}
test('huella activa oculta campos y solicita biometría directamente una sola vez',()=>{
 const h=harness();h.run('actualizarBotonLoginBiometricoApp();actualizarBotonLoginBiometricoApp();');assert.equal(h.nodes.get('#login_credenciales').visible,false);assert.equal(h.prompts(),1);assert.equal(h.requests.length,0);
});
test('cancelar muestra usuario y contraseña sin reintentar automáticamente',()=>{
 const h=harness();h.run('actualizarBotonLoginBiometricoApp()');h.callbacks.error({code:-108});assert.equal(h.nodes.get('#login_credenciales').visible,true);assert.equal(h.nodes.get('#pass').value,'');h.run('actualizarBotonLoginBiometricoApp()');assert.equal(h.prompts(),1);
});
test('sin biometría activada conserva ingreso manual',()=>{const h=harness({storage:{biometria_login_habilitada:'0'}});h.run('actualizarBotonLoginBiometricoApp()');assert.equal(h.nodes.get('#login_credenciales').visible,true);assert.equal(h.prompts(),0);});
test('otro dispositivo no dispara la huella ni usa sus credenciales',()=>{const h=harness({storage:{biometria_login_uuid:'otro'}});h.run('actualizarBotonLoginBiometricoApp()');assert.equal(h.nodes.get('#login_credenciales').visible,true);assert.equal(h.prompts(),0);});
test('sensor no disponible muestra el formulario',()=>{const h=harness({unavailable:true});h.run('actualizarBotonLoginBiometricoApp()');assert.equal(h.nodes.get('#login_credenciales').visible,true);assert.equal(h.prompts(),0);});
test('espera deviceready y cae a formulario si no hay plugin',()=>{const h=harness({noPlugin:true});h.run('actualizarBotonLoginBiometricoApp()');assert.equal(h.nodes.get('#login_credenciales').visible,false);h.events.deviceready();assert.equal(h.nodes.get('#login_credenciales').visible,true);});
test('huella correcta usa login normal del servidor y no persiste la contraseña',()=>{
 const h=harness();h.run('actualizarBotonLoginBiometricoApp()');h.callbacks.ok(h.secret());assert.equal(h.requests.length,1);const sent=typeof h.requests[0].data==='string'?JSON.parse(h.requests[0].data):h.requests[0].data;assert.equal(sent.user,'prueba@example.invalid');assert.equal(sent.pass,'CLAVE_FICTICIA');assert.equal(JSON.stringify([...h.values]).includes('CLAVE_FICTICIA'),false);assert.equal(h.nodes.get('#login_credenciales').visible,false);
 h.requests[0].success({estado:1,token:'sesion-ficticia',user:{id:1},roles:[{name:'Paciente'},{name:'Profesional'}]});assert.equal(h.nodes.get('#pass').value,'');assert.equal(h.run('medsdiGetAuthToken()'),'sesion-ficticia');
});
test('credencial inválida en bóveda pide usuario y clave',()=>{const h=harness();h.run('actualizarBotonLoginBiometricoApp()');h.callbacks.ok('invalido');assert.equal(h.requests.length,0);assert.equal(h.nodes.get('#login_credenciales').visible,true);});
test('rechazo del servidor limpia secreto del formulario y desactiva login biométrico obsoleto',()=>{
 const h=harness();h.run('actualizarBotonLoginBiometricoApp()');h.callbacks.ok(h.secret());h.requests[0].success({estado:0});assert.equal(h.nodes.get('#pass').value,'');assert.equal(h.nodes.get('#login_credenciales').visible,true);assert.equal(h.values.has('biometria_login_habilitada'),false);
});
test('error de red permite ingreso manual sin borrar la activación',()=>{
 const h=harness();h.run('actualizarBotonLoginBiometricoApp()');h.callbacks.ok(h.secret());h.requests[0].error({status:0});assert.equal(h.nodes.get('#login_credenciales').visible,true);assert.equal(h.nodes.get('#pass').value,'');assert.equal(h.values.get('biometria_login_habilitada'),'1');
});
test('respuesta biométrica tardía no inicia sesión desde otra pantalla',()=>{const h=harness();h.run('actualizarBotonLoginBiometricoApp()');h.leave();h.callbacks.ok(h.secret());assert.equal(h.requests.length,0);});
test('sesión activa no vuelve a solicitar biometría al actualizar controles',()=>{const h=harness();h.run("medsdiSetAuthToken('sesion');actualizarBotonLoginBiometricoApp()");assert.equal(h.prompts(),0);});

test('una respuesta biométrica de la visita anterior no entra al volver al login',()=>{
 const h=harness();h.run('actualizarBotonLoginBiometricoApp()');const previous=h.callbacks.ok;h.events['pagehide|#login']();h.run('prepararLoginBiometricoApp();actualizarBotonLoginBiometricoApp()');previous(h.secret());assert.equal(h.requests.length,0);h.callbacks.ok(h.secret());assert.equal(h.requests.length,1);
});
test('una respuesta HTTP de un ingreso biométrico abandonado no crea sesión',()=>{
 const h=harness();h.run('actualizarBotonLoginBiometricoApp()');h.callbacks.ok(h.secret());h.events['pagehide|#login']();h.run('prepararLoginBiometricoApp()');h.requests[0].success({estado:1,token:'token-abandonado',user:{id:1},roles:[{name:'Paciente'}]});assert.equal(h.run('medsdiGetAuthToken()'),'');
});
