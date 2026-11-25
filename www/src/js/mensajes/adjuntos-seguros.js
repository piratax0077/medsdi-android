'use strict';

// Documentos clínicos en memoria: sin URL con credenciales ni visor remoto.
var medsdiMessageAttachmentState = {controller: null, panel: null, blobUrl: null, pdf: null, task: null};

const medsdiMessageAttachmentEndpoint = (messageId, index) => {
    messageId = Number(messageId);
    index = Number(index);
    if (!Number.isSafeInteger(messageId) || messageId <= 0 ||
        !Number.isSafeInteger(index) || index < 0) throw new Error('Adjunto inválido.');
    var base = new URL(MEDSDI_API_URL);
    if (base.protocol !== 'https:' && !(base.protocol === 'http:' && typeof MEDSDI_IS_LOCAL !== 'undefined' && MEDSDI_IS_LOCAL && ['localhost','127.0.0.1','[::1]'].includes(base.hostname))) {
        throw new Error('Se requiere una conexión segura.');
    }
    return base.href.replace(/\/$/, '') + '/mensajes/' + messageId + '/adjuntos/' + index;
};

const medsdiClinicalDownloadEndpoint = value => {
    var base=new URL(MEDSDI_API_URL);
    if (base.protocol!=='https:' && !(base.protocol==='http:' && typeof MEDSDI_IS_LOCAL!=='undefined' && MEDSDI_IS_LOCAL && ['localhost','127.0.0.1','[::1]'].includes(base.hostname))) throw new Error('Se requiere una conexión segura.');
    var target=new URL(value,base.origin);
    var prefix=base.pathname.replace(/\/$/,'')+'/';
    if (target.origin!==base.origin || target.username || target.password || target.search || target.hash || !target.pathname.startsWith(prefix)) throw new Error('Destino de documento no permitido.');
    var relative=target.pathname.slice(prefix.length);
    if (!/^(?:mensajes\/[1-9]\d*\/adjuntos\/(?:0|[1-9]\d*)|paciente\/mis_examenes\/(?:orden\/[1-9]\d*\/pdf|especialidad\/[1-9]\d*\/pdf|resultado\/[1-9]\d*\/archivo\/[1-9]\d*)|paciente\/(?:mis_recetas|mis_consentimientos)\/[1-9]\d*\/pdf)$/.test(relative)) throw new Error('Destino de documento no permitido.');
    return target.href;
};

const medsdiFetchClinicalFile = async (endpoint, metadata, signal) => {
    var token=medsdiGetAuthToken();if(!token)throw new Error('Vuelve a iniciar sesión.');
    var mime=String(metadata && metadata.mime || '').toLowerCase();
    if(!['application/pdf','image/jpeg','image/png','image/webp','image/gif'].includes(mime))throw new Error('Formato de documento no permitido.');
    var response=await fetch(medsdiClinicalDownloadEndpoint(endpoint),{
        method:'GET',headers:{Authorization:'Bearer '+token,Accept:mime},cache:'no-store',credentials:'omit',redirect:'error',signal:signal
    });
    if(!response.ok)throw new Error('No fue posible acceder al documento.');
    var limit=5*1024*1024;
    if(Number(response.headers.get('Content-Length') || 0)>limit)throw new Error('Documento demasiado grande.');
    if(String(response.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase()!==mime)throw new Error('El tipo del archivo no coincide.');
    var bytes;
    if(response.body && typeof response.body.getReader==='function'){
        var reader=response.body.getReader(),chunks=[],total=0;
        try {
            while(true){
                var chunk=await reader.read();if(chunk.done)break;
                total+=chunk.value.byteLength;
                if(total>limit || token!==medsdiGetAuthToken() || (signal && signal.aborted)){
                    await reader.cancel();throw new Error(total>limit?'Documento demasiado grande.':'La sesión cambió.');
                }
                chunks.push(chunk.value);
            }
            bytes=new Uint8Array(total);var offset=0;chunks.forEach(part=>{bytes.set(part,offset);offset+=part.byteLength;});
        }finally{reader.releaseLock();}
    }else{bytes=new Uint8Array(await response.arrayBuffer());}
    if(token!==medsdiGetAuthToken() || (signal && signal.aborted))throw new Error('La sesión cambió.');
    if(!bytes.length || bytes.length>limit)throw new Error('Tamaño de documento no permitido.');
    var prefix=String.fromCharCode(...bytes.subarray(0,12));
    var valid=(mime==='application/pdf' && prefix.startsWith('%PDF-')) ||
        (mime==='image/png' && bytes[0]===137 && prefix.slice(1,4)==='PNG') ||
        (mime==='image/jpeg' && bytes[0]===255 && bytes[1]===216 && bytes[2]===255) ||
        (mime==='image/webp' && prefix.startsWith('RIFF') && prefix.slice(8,12)==='WEBP') ||
        (mime==='image/gif' && (prefix.startsWith('GIF87a') || prefix.startsWith('GIF89a')));
    if(!valid)throw new Error('El tipo del archivo no coincide.');return {bytes:bytes,mime:mime};
};

const medsdiFetchMessageAttachment = (messageId,index,metadata,signal) =>
    medsdiFetchClinicalFile(medsdiMessageAttachmentEndpoint(messageId,index),metadata,signal);

const medsdiShowExamDocument = (endpoint,mime) => {
    var target=medsdiClinicalDownloadEndpoint(endpoint);
    if(!new URL(target).pathname.includes('/paciente/mis_examenes/'))throw new Error('Destino de examen no permitido.');
    return medsdiShowMessageAttachment(null,null,{mime:mime},signal=>medsdiFetchClinicalFile(target,{mime:mime},signal));
};

const medsdiShowPatientDocument = endpoint => {
    var target=medsdiClinicalDownloadEndpoint(endpoint);
    if(!/\/paciente\/(?:mis_recetas|mis_consentimientos)\/[1-9]\d*\/pdf$/.test(new URL(target).pathname))throw new Error('Destino de documento no permitido.');
    return medsdiShowMessageAttachment(null,null,{mime:'application/pdf'},signal=>medsdiFetchClinicalFile(target,{mime:'application/pdf'},signal));
};

const medsdiCloseMessageAttachment = () => {
    var state = medsdiMessageAttachmentState;
    if (state.controller) state.controller.abort();
    if (state.pdf) state.pdf.destroy().catch(function() {});
    else if (state.task) state.task.destroy().catch(function() {});
    if (state.panel) state.panel.querySelectorAll("canvas").forEach(canvas => {canvas.width = canvas.height = 0;});
    if (state.blobUrl) URL.revokeObjectURL(state.blobUrl);
    if (state.panel) state.panel.remove();
    medsdiMessageAttachmentState = {controller: null, panel: null, blobUrl: null, pdf: null, task: null};
};

const medsdiShowMessageAttachment = async (messageId, index, metadata, loader) => {
    medsdiCloseMessageAttachment();
    var state = medsdiMessageAttachmentState;
    state.controller = new AbortController();
    var panel = document.createElement('section');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', loader ? 'Documento clínico' : 'Adjunto del mensaje');
    panel.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:99999;overflow:auto;padding:16px;box-sizing:border-box;';
    var close = document.createElement('button');
    close.textContent = loader ? 'Cerrar documento' : 'Cerrar adjunto';
    close.onclick = medsdiCloseMessageAttachment;
    panel.appendChild(close);
    var status = document.createElement('p');
    status.textContent = 'Cargando adjunto…';
    panel.appendChild(status);
    document.body.appendChild(panel);
    state.panel = panel;
    try {
        var file = loader ? await loader(state.controller.signal) : await medsdiFetchMessageAttachment(messageId, index, metadata, state.controller.signal);
        if (state !== medsdiMessageAttachmentState) return;
        if (file.mime !== 'application/pdf') {
            var image = document.createElement('img');
            image.alt = 'Adjunto del mensaje';
            image.style.cssText = 'display:block;max-width:100%;height:auto;margin-top:16px;';
            state.blobUrl = URL.createObjectURL(new Blob([file.bytes], {type: file.mime}));
            image.src = state.blobUrl;
            panel.appendChild(image);
            status.textContent = '';
            return;
        }
        var assets = new URL('vendor/pdfjs/', document.baseURI);
        var pdfjs = await import(new URL('build/pdf.mjs', assets).href);
        if (state !== medsdiMessageAttachmentState) return;
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('build/pdf.worker.mjs', assets).href;
        state.task = pdfjs.getDocument({
            data: file.bytes, isEvalSupported: false, enableXfa: false, useWasm: false,
            maxImageSize: 16000000, canvasMaxAreaInBytes: 16000000,
            cMapUrl: new URL('cmaps/', assets).href, cMapPacked: true,
            standardFontDataUrl: new URL('standard_fonts/', assets).href,
            wasmUrl: new URL('wasm/', assets).href
        });
        state.pdf = await state.task.promise;
        if (state !== medsdiMessageAttachmentState) {await state.pdf.destroy(); return;}
        if (state.pdf.numPages > 500) throw new Error('Documento demasiado extenso para este visor.');
        var pageNumber = 1;
        var rendering = false;
        var canvas = document.createElement('canvas');
        canvas.style.cssText = 'display:block;max-width:100%;height:auto;margin:16px auto;';
        var controls = document.createElement('div');
        var previous = document.createElement('button');
        var next = document.createElement('button');
        previous.textContent = 'Anterior';
        next.textContent = 'Siguiente';
        controls.append(previous, next);
        panel.append(controls, canvas);
        const render = async () => {
            if (rendering || state !== medsdiMessageAttachmentState) return;
            rendering = true;
            previous.disabled = next.disabled = true;
            try {
                var page = await state.pdf.getPage(pageNumber);
                var natural = page.getViewport({scale: 1});
                var scale = Math.min(1.5, 1400 / natural.width, Math.sqrt(4000000 / (natural.width * natural.height)));
                var viewport = page.getViewport({scale: scale});
                canvas.width = Math.ceil(viewport.width);
                canvas.height = Math.ceil(viewport.height);
                await page.render({canvasContext: canvas.getContext('2d'), viewport: viewport}).promise;
                status.textContent = 'Página ' + pageNumber + ' de ' + state.pdf.numPages;
                page.cleanup();
            } finally {
                rendering = false;
                previous.disabled = pageNumber <= 1;
                next.disabled = pageNumber >= state.pdf.numPages;
            }
        };
        previous.onclick = () => {if (pageNumber > 1 && !rendering) {pageNumber--; render().catch(() => {status.textContent = 'No fue posible mostrar la página.';});}};
        next.onclick = () => {if (pageNumber < state.pdf.numPages && !rendering) {pageNumber++; render().catch(() => {status.textContent = 'No fue posible mostrar la página.';});}};
        await render();
    } catch (error) {
        if (state !== medsdiMessageAttachmentState) return;
        status.textContent = 'No fue posible abrir el adjunto. Verifica tu sesión e intenta nuevamente.';
    }
};

if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('pause', medsdiCloseMessageAttachment, false);
    document.addEventListener('visibilitychange', () => {if (document.hidden) medsdiCloseMessageAttachment();});
}
