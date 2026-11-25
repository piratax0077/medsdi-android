const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, 'www/src/js', file), 'utf8');

function harness(initial = {}) {
    const values = new Map(Object.entries(initial));
    const fields = new Map();
    const requests = [];
    const opened = [];
    const storage = {
        getItem: k => values.has(k) ? values.get(k) : null,
        setItem: (k,v) => values.set(k,String(v)), removeItem: k => values.delete(k),
        clear: () => values.clear(), key: i => [...values.keys()][i], get length() { return values.size; }
    };
    function $(selector) {
        const chain = new Proxy({}, {get(_, name) {
            if (name === 'val') return (...args) => args.length ? (fields.set(selector,args[0]),chain) : (fields.get(selector) || '');
            if (name === 'length') return 0;
            return () => chain;
        }});
        return chain;
    }
    $.trim = x => String(x == null ? '' : x).trim();
    $.ajax = opts => { requests.push(opts); return {abort() {}}; };
    $.mobile = {};
    const ctx = vm.createContext({
        window: {location: {protocol:'https:',hostname:'localhost'}, open: url => opened.push(url)},
        document: {addEventListener(){}}, navigator: {userAgent:'Android',notification:{}},
        localStorage: storage, sessionStorage: storage, $, URL, URLSearchParams, TextEncoder, TextDecoder,
        console: {log(){},warn(){},error(){}}, setTimeout(){}, clearTimeout(){}, setInterval(){}, clearInterval(){},
        msg(){}, cargando(){}, vista(){}, _SESSION: () => '1', obtenerUuidDispositivo: () => 'uuid-prueba'
    });
    const run = code => vm.runInContext(code,ctx);
    const load = file => run(read(file));
    load('api/api.js');
    return {ctx,run,load,values,fields,requests,opened};
}

test('tokens are removed from durable storage and held only in memory', () => {
    const h = harness({authToken:'heredado'});
    assert.equal(h.values.has('authToken'),false);
    h.run("medsdiSetAuthToken('token-ficticio')");
    assert.equal(h.run('medsdiGetAuthToken()'),'token-ficticio');
    assert.equal(h.values.has('authToken'),false);
    h.run('medsdiClearAuthToken()');
    assert.equal(h.run('medsdiGetAuthToken()'),'');
});

test('old remembered passwords and unprotected device PINs are purged', () => {
    const h = harness({recordar_login_pass:'34383236',recordar_login_usuario:'test',password:'4826',pass:'secret'});
    h.load('login/modulo.js');
    for(const key of ['recordar_login_pass','recordar_login_usuario','password','pass']) assert.equal(h.values.has(key),false);
});

test('current authorization endpoints require a session token in the client', () => {
    const h = harness();
    assert.equal(h.run("new Api('mobile-authorization','device/verify-pin').needsAuth()"),true);
    let status;
    h.ctx.failure = xhr => { status=xhr.status; };
    h.run("new Api('mobile-authorization','device/verify-pin').request({},()=>{},failure,'POST')");
    assert.equal(status,401); assert.equal(h.requests.length,0);
});

test('an old response cannot populate the next signed-in account', () => {
    const h = harness(); let called=false;
    h.ctx.done=()=>{called=true;};
    h.run("medsdiSetAuthToken('cuenta-a'); new Api('mobile-authorization','requests').request({},done,()=>{},'GET')");
    h.run("medsdiClearAuthToken(); medsdiSetAuthToken('cuenta-b')");
    h.requests[0].success({datos:'privados-cuenta-a'});
    assert.equal(called,false);
    assert.equal(h.run('Object.keys(MEDSDI_REQUEST_STATE.cache).length'),0);
});

test('authorization submits the entered PIN without a persistent local copy', () => {
    const h = harness(); h.load('autorizacion/modulo.js');
    h.fields.set('#autorizacion #password_','4826'); h.fields.set('#autorizacion #id_log_autorizacion','25');
    h.run("medsdiSetAuthToken('session'); respuesta(1)");
    const request=h.requests[0]; const payload=JSON.parse(request.data);
    assert.equal(request.url.endsWith('/mobile-authorization/requests/25/decision'),true);
    assert.equal(payload.credential,'4826'); assert.equal(payload.estado,1);
    assert.equal(h.fields.get('#autorizacion #password_'),'');
    assert.equal(h.values.has('password'),false);
});

test('biometric enrollment waits for successful server PIN verification', () => {
    const h = harness(); let enrolled=0;
    h.ctx.Fingerprint={isAvailable:success=>success('finger'),registerBiometricSecret:()=>{enrolled++;}};
    h.load('autorizacion/modulo.js'); h.fields.set('#perfil_app_biometria_pin','4826');
    h.run("medsdiSetAuthToken('session'); activarBiometriaApp()");
    assert.equal(enrolled,0); assert.equal(h.requests[0].url.endsWith('/device/verify-pin'),true);
    h.requests[0].success({verified:true});
    assert.equal(enrolled,1);
});

test('clinical links reject scripts and third-party origins', () => {
    const h=harness(); h.load('home/modulo.js');
    h.run("abrirDocumentoClinico('javascript:alert(1)'); abrirDocumentoClinico('https://otro.example/documento.pdf')");
    assert.equal(h.opened.length,0);
    h.run("openReceta('https://medichile.cl/reportes/prueba.pdf')");
    assert.deepEqual(h.opened,['https://medichile.cl/reportes/prueba.pdf']);
});

test('release HTML uses local SweetAlert and prohibits remote JavaScript', () => {
    const html=fs.readFileSync(path.join(root,'www/index.html'),'utf8');
    assert.match(html,/Content-Security-Policy/);
    assert.doesNotMatch(html,/<script[^>]+src=["']https?:/i);
    assert.equal(fs.existsSync(path.join(root,'www/src/vendor/sweetalert2.all.min.js')),true);
});


test('message attachments use authenticated fetch and ignore supplied external URLs', async () => {
    const h = harness();
    h.load('mensajes/adjuntos-seguros.js');
    h.run("medsdiSetAuthToken('token-memoria')");
    const calls = [];
    h.ctx.fetch = async (url, options) => {
        calls.push({url, options});
        return {ok:true, headers:{get:name=>name==='Content-Type'?'application/pdf':null}, arrayBuffer:async()=>new TextEncoder().encode('%PDF-prueba').buffer};
    };
    const result = await h.run("medsdiFetchMessageAttachment(50,0,{mime:'application/pdf',url:'https://ajeno.invalid/robar'})");
    assert.equal(result.mime, 'application/pdf');
    assert.equal(calls.length,1);
    assert.match(calls[0].url,/^https:\/\/medichile\.cl\/api\/mensajes\/50\/adjuntos\/0$/);
    assert.equal(calls[0].options.headers.Authorization,'Bearer token-memoria');
    assert.equal(calls[0].options.redirect,'error');
    assert.equal(calls[0].options.cache,'no-store');
    assert.equal(calls[0].options.credentials,'omit');
    assert.equal(calls[0].url.includes('token'),false);
});

test('message attachments refuse downloads without a session', async () => {
    const h = harness();h.load('mensajes/adjuntos-seguros.js');
    let called=false;h.ctx.fetch=async()=>{called=true;};
    await assert.rejects(h.run("medsdiFetchMessageAttachment(50,0,{mime:'application/pdf'})"),/sesión/);
    assert.equal(called,false);
});

test('message attachments refuse HTML disguised as a PDF', async () => {
    const h = harness();h.load('mensajes/adjuntos-seguros.js');h.run("medsdiSetAuthToken('token-memoria')");
    h.ctx.fetch=async()=>({ok:true,headers:{get:name=>name==='Content-Type'?'application/pdf':null},arrayBuffer:async()=>new TextEncoder().encode('<html>activo</html>').buffer});
    await assert.rejects(h.run("medsdiFetchMessageAttachment(50,0,{mime:'application/pdf'})"),/tipo/);
});

test('logout discards an attachment still being downloaded', async () => {
    const h = harness();h.load('mensajes/adjuntos-seguros.js');h.run("medsdiSetAuthToken('token-memoria')");
    h.ctx.fetch=async()=>{
        h.run('medsdiClearAuthToken()');
        return {ok:true,headers:{get:name=>name==='Content-Type'?'application/pdf':null},arrayBuffer:async()=>new TextEncoder().encode('%PDF-prueba').buffer};
    };
    await assert.rejects(h.run("medsdiFetchMessageAttachment(50,0,{mime:'application/pdf'})"),/sesión cambió/);
});

test('message attachment URLs reject invalid identifiers and insecure production transport', () => {
    const h = harness();h.load('mensajes/adjuntos-seguros.js');
    assert.throws(()=>h.run('medsdiMessageAttachmentEndpoint(-1,0)'),/inválido/);
    assert.throws(()=>h.run('medsdiMessageAttachmentEndpoint(1,-1)'),/inválido/);
    h.run("MEDSDI_API_URL='http://medichile.cl/api'");
    assert.throws(()=>h.run('medsdiMessageAttachmentEndpoint(1,0)'),/segura/);
});

test('message attachments enforce maximum declared size', async () => {
    const h = harness();h.load('mensajes/adjuntos-seguros.js');h.run("medsdiSetAuthToken('token-memoria')");
    let read=false;
    h.ctx.fetch=async()=>({ok:true,headers:{get:()=>String(6*1024*1024)},arrayBuffer:async()=>{read=true;return new ArrayBuffer(1);}});
    await assert.rejects(h.run("medsdiFetchMessageAttachment(50,0,{mime:'application/pdf'})"),/grande/);
    assert.equal(read,false);
});



test('exam downloader permits only fixed API paths without signatures or external origins',()=>{
 const h=harness();h.load('mensajes/adjuntos-seguros.js');
 assert.equal(h.run("medsdiClinicalDownloadEndpoint('/api/paciente/mis_examenes/orden/301/pdf')"),'https://medichile.cl/api/paciente/mis_examenes/orden/301/pdf');
 for(const url of ['https://ajeno.invalid/api/paciente/mis_examenes/orden/1/pdf','javascript:alert(1)','/api/paciente/mis_examenes/orden/1/pdf?signature=vieja','/api/paciente/mis_examenes/orden/1/pdf#token','/api/paciente/mis_documentos/1/pdf','https://usuario:clave@medichile.cl/api/paciente/mis_examenes/orden/1/pdf'])assert.throws(()=>h.run('medsdiClinicalDownloadEndpoint('+JSON.stringify(url)+')'),/permitido/);
});
test('exam download authenticates in headers and never opens a remote viewer',async()=>{
 const h=harness();h.load('mensajes/adjuntos-seguros.js');h.run("medsdiSetAuthToken('prueba')");const calls=[];
 h.ctx.fetch=async(url,options)=>{calls.push({url,options});return {ok:true,headers:{get:n=>n==='Content-Type'?'application/pdf':null},arrayBuffer:async()=>new TextEncoder().encode('%PDF-prueba').buffer};};
 await h.run("medsdiFetchClinicalFile('/api/paciente/mis_examenes/especialidad/701/pdf',{mime:'application/pdf'})");
 assert.equal(calls[0].options.headers.Authorization,'Bearer prueba');assert.equal(calls[0].options.redirect,'error');assert.equal(calls[0].options.credentials,'omit');assert.equal(calls[0].options.cache,'no-store');assert.equal(calls[0].url.includes('prueba'),false);assert.equal(h.opened.length,0);
});
test('wrong response MIME is rejected before reading bytes',async()=>{
 const h=harness();h.load('mensajes/adjuntos-seguros.js');h.run("medsdiSetAuthToken('prueba')");let read=false;
 h.ctx.fetch=async()=>({ok:true,headers:{get:n=>n==='Content-Type'?'text/html':null},arrayBuffer:async()=>{read=true;return new ArrayBuffer(1);}});
 await assert.rejects(h.run("medsdiFetchClinicalFile('/api/paciente/mis_examenes/orden/1/pdf',{mime:'application/pdf'})"),/tipo/);assert.equal(read,false);
});
test('bounded streamed download cancels when size exceeds limit',async()=>{
 const h=harness();h.load('mensajes/adjuntos-seguros.js');h.run("medsdiSetAuthToken('prueba')");let cancelled=false,released=false;
 h.ctx.fetch=async()=>({ok:true,headers:{get:n=>n==='Content-Type'?'application/pdf':null},body:{getReader:()=>({read:async()=>({done:false,value:new Uint8Array(6*1024*1024)}),cancel:async()=>{cancelled=true;},releaseLock:()=>{released=true;}})}});
 await assert.rejects(h.run("medsdiFetchClinicalFile('/api/paciente/mis_examenes/orden/1/pdf',{mime:'application/pdf'})"),/grande/);assert.equal(cancelled,true);assert.equal(released,true);
});
test('logout during streaming cancels the document instead of showing old account data',async()=>{
 const h=harness();h.load('mensajes/adjuntos-seguros.js');h.run("medsdiSetAuthToken('prueba')");let cancelled=false;
 h.ctx.fetch=async()=>({ok:true,headers:{get:n=>n==='Content-Type'?'application/pdf':null},body:{getReader:()=>({read:async()=>{h.run('medsdiClearAuthToken()');return {done:false,value:new TextEncoder().encode('%PDF-prueba')};},cancel:async()=>{cancelled=true;},releaseLock(){}})}});
 await assert.rejects(h.run("medsdiFetchClinicalFile('/api/paciente/mis_examenes/orden/1/pdf',{mime:'application/pdf'})"),/sesión cambió/);assert.equal(cancelled,true);
});
test('GIF results require a real GIF signature',async()=>{
 const h=harness();h.load('mensajes/adjuntos-seguros.js');h.run("medsdiSetAuthToken('prueba')");h.ctx.fetch=async()=>({ok:true,headers:{get:n=>n==='Content-Type'?'image/gif':null},arrayBuffer:async()=>new TextEncoder().encode('GIF89a-prueba').buffer});
 const r=await h.run("medsdiFetchClinicalFile('/api/paciente/mis_examenes/resultado/1/archivo/1',{mime:'image/gif'})");assert.equal(r.mime,'image/gif');
});
test('exam button calls the authenticated viewer with MIME rather than the URL opener',()=>{
 const source=read('home/modulo.js');const start=source.indexOf("$(document).on('click', '.js-ver-examen'");const end=source.indexOf('\n});',start);const handler=source.slice(source.indexOf('function()',start),end+2);const calls=[];
 vm.runInNewContext('('+handler+')()',{$:()=>({attr:k=>k==='data-examen-url'?'/api/paciente/mis_examenes/orden/1/pdf':'application/pdf'}),medsdiShowExamDocument:(...a)=>calls.push(a),msg(){}});
 assert.deepEqual(calls,[['/api/paciente/mis_examenes/orden/1/pdf','application/pdf']]);
});

test('local review mode never permits sending tokens to a remote HTTP server',()=>{
 const c=vm.createContext({MEDSDI_API_URL:'http://medichile.cl/api',MEDSDI_IS_LOCAL:true,URL,document:{addEventListener(){}}});
 vm.runInContext(read('mensajes/adjuntos-seguros.js'),c);
 assert.throws(()=>vm.runInContext("medsdiClinicalDownloadEndpoint('/api/paciente/mis_examenes/orden/1/pdf')",c),/segura/);
 assert.throws(()=>vm.runInContext('medsdiMessageAttachmentEndpoint(1,0)',c),/segura/);
});

test('prescription and consent API routes are permitted without URL credentials',()=>{
 const h=harness();h.load('mensajes/adjuntos-seguros.js');
 for(const type of ['mis_recetas','mis_consentimientos'])assert.equal(h.run("medsdiClinicalDownloadEndpoint('/api/paciente/"+type+"/1/pdf')"),'https://medichile.cl/api/paciente/'+type+'/1/pdf');
});
test('prescription and consent buttons use the authenticated local viewer',()=>{
 const source=read('home/modulo.js');
 for(const type of ['receta','consentimiento']){
  const start=source.indexOf("$(document).on('click', '.js-ver-"+type+"'");const end=source.indexOf('\n});',start);const handler=source.slice(source.indexOf('function()',start),end+2);const calls=[];
  vm.runInNewContext('('+handler+')()',{$:()=>({attr:()=>'/api/paciente/'+(type==='receta'?'mis_recetas':'mis_consentimientos')+'/1/pdf'}),medsdiShowPatientDocument:url=>calls.push(url),msg(){}});
  assert.equal(calls.length,1);assert.ok(calls[0].endsWith('/1/pdf'));
 }
});
test('patient document wrapper refuses legacy public reports and exam or message routes',()=>{
 const h=harness();h.load('mensajes/adjuntos-seguros.js');
 for(const url of ['/reportes/archivo.pdf','/api/mensajes/1/adjuntos/0','/api/paciente/mis_examenes/orden/1/pdf','/api/paciente/mis_recetas/1/pdf?signature=vieja'])assert.throws(()=>h.run('medsdiShowPatientDocument('+JSON.stringify(url)+')'),/permitido/);
});
