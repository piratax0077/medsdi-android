var mensajesAppCache = [];
var mensajesAppCargando = false;
var mensajesAppUltimaCarga = 0;
var mensajesAppCacheMs = 15000;

const escaparTextoMensaje = (valor) => $('<div>').text(valor == null ? '' : String(valor)).html();

// Icono de sobre (línea), en azul vía CSS (currentColor).
const ICONO_MENSAJE_APP =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="3" y="5" width="18" height="14" rx="3"/>' +
        '<path d="m4 7.5 7.1 5.1a1.6 1.6 0 0 0 1.8 0L20 7.5"/>' +
    '</svg>';

// Fecha del mensaje con la hora sin segundos.
const fechaMensajeApp = (fecha) =>
    typeof horaSinSegundos === 'function' ? horaSinSegundos(fecha || '') : (fecha || '');

const abrirMensajesApp = () => {
    $('.header-menu-perfil').removeClass('abierto');
    vista('mensajes-app', 'fade');
};

const cargarMensajesApp = (forzar) => {
    forzar = forzar === true;
    var ahora = Date.now();

    if (mensajesAppCargando) {
        console.log('[MED-SDI] Mensajes ya se están cargando.');
        return;
    }

    if (!forzar && mensajesAppUltimaCarga && (ahora - mensajesAppUltimaCarga) < mensajesAppCacheMs) {
        renderMensajesApp(
            mensajesAppCache,
            mensajesAppCache.filter(function(item) { return !item.leido; }).length
        );
        return;
    }

    mensajesAppCargando = true;
    $('#mensajes-app-lista').html(
        '<div class="app-estado-carga"><span class="app-spinner"></span><p>Actualizando tus mensajes…</p></div>'
    );
    var rol = localStorage.getItem('rolActivo') === 'Profesional' ? 'Profesional' : 'Paciente';
    var api = new Api('mensajes', '');
    api.request({rol: rol}, function(resp) {
        mensajesAppCargando = false;
        mensajesAppUltimaCarga = Date.now();
        mensajesAppCache = resp.registros || [];
        renderMensajesApp(mensajesAppCache, Number(resp.no_leidos || 0));
    }, function() {
        mensajesAppCargando = false;
        $('#mensajes-app-resumen').html('');
        $('#mensajes-app-lista').html(
            '<div class="mensajes-app-vacio">No fue posible cargar tus mensajes. Intenta nuevamente.</div>'
        );
    }, 'GET');
};

const renderMensajesApp = (mensajes, noLeidos) => {
    $('.mensajes-badge').text(noLeidos).toggle(noLeidos > 0);
    $('#mensajes-app-resumen').html(
        noLeidos > 0
            ? '<strong>' + noLeidos + '</strong> mensaje' + (noLeidos === 1 ? '' : 's') + ' sin leer'
            : ''
    );

    if (!mensajes.length) {
        $('#mensajes-app-lista').html(
            '<div class="mensajes-app-vacio">Aún no tienes mensajes en esta bandeja.</div>'
        );
        return;
    }

    $('#mensajes-app-lista').html(mensajes.map(function(mensaje) {
        var cantidadAdjuntos = (mensaje.archivos || []).length;
        return '<button type="button" class="mensaje-app-card ' + (mensaje.leido ? '' : 'no-leido') +
            '" onclick="abrirDetalleMensajeApp(' + Number(mensaje.id) + ')">' +
                '<div class="mensaje-app-card-layout">' +
                    '<span class="mensaje-app-card-icono" aria-hidden="true">' + ICONO_MENSAJE_APP + '</span>' +
                    '<div class="mensaje-app-card-contenido">' +
                        '<div class="mensaje-app-card-cabecera">' +
                            '<span class="mensaje-app-asunto">' + escaparTextoMensaje(mensaje.asunto) + '</span>' +
                            (mensaje.leido ? '' : '<span class="mensaje-app-nuevo">Nuevo</span>') +
                        '</div>' +
                        '<div class="mensaje-app-emisor">De: ' + escaparTextoMensaje(mensaje.emisor) + '</div>' +
                        '<div class="mensaje-app-preview">' + escaparTextoMensaje(mensaje.mensaje) + '</div>' +
                        '<div class="mensaje-app-card-pie">' +
                            '<span class="mensaje-app-fecha">' + escaparTextoMensaje(fechaMensajeApp(mensaje.fecha_envio)) + '</span>' +
                            (cantidadAdjuntos ? '<span class="mensaje-app-clip">📎 ' + cantidadAdjuntos + '</span>' : '') +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</button>';
    }).join(''));
};

const abrirDetalleMensajeApp = (id) => {
    var mensaje = mensajesAppCache.find(function(item) {
        return Number(item.id) === Number(id);
    });
    if (!mensaje) return;

    var adjuntos = (mensaje.archivos || []).map(function(archivo, indice) {
        return '<a class="mensaje-app-adjunto" href="#" onclick="abrirAdjuntoMensajeApp(' +
            Number(mensaje.id) + ', ' + indice + '); return false;">📎 ' +
            escaparTextoMensaje(archivo.nombre) + '</a>';
    }).join('');

    var contenido =
        '<div class="mensaje-app-detalle">' +
            '<h3>' + escaparTextoMensaje(mensaje.asunto) + '</h3>' +
            '<div class="mensaje-app-detalle-meta">De: ' + escaparTextoMensaje(mensaje.emisor) +
                '<br>' + escaparTextoMensaje(fechaMensajeApp(mensaje.fecha_envio)) + '</div>' +
            '<div class="mensaje-app-cuerpo">' + escaparTextoMensaje(mensaje.mensaje).replace(/\n/g, '<br>') + '</div>' +
            (adjuntos ? '<div class="mensaje-app-adjuntos"><strong>Adjuntos</strong>' + adjuntos + '</div>' : '') +
        '</div>';

    $('#mensaje-app-modal-contenido').html(contenido);
    $('#mensaje-app-overlay').addClass('visible').attr('aria-hidden', 'false');

    if (!mensaje.leido) {
        var api = new Api('mensajes/' + mensaje.id, 'leer');
        api.request({}, function() {
            mensaje.leido = true;
            renderMensajesApp(
                mensajesAppCache,
                mensajesAppCache.filter(function(item) { return !item.leido; }).length
            );
        }, function() {}, 'PUT');
    }
};

const cerrarDetalleMensajeApp = () => {
    $('#mensaje-app-overlay').removeClass('visible').attr('aria-hidden', 'true');
};

const abrirAdjuntoMensajeApp = (mensajeId, indice) => {
    var mensaje = mensajesAppCache.find(item => Number(item.id) === Number(mensajeId));
    var adjunto = mensaje && mensaje.archivos && mensaje.archivos[indice];
    if (!adjunto) return;
    return medsdiShowMessageAttachment(mensajeId, indice, adjunto);
};

$(document).on('pageshow', '#mensajes-app', function() {
    cargarMensajesApp();
});

// Contador de no leídos en la carta junto a la campana (inicio paciente y profesional).
var contadorMensajesConsultando = false;
const actualizarContadorMensajes = () => {
    if (contadorMensajesConsultando || mensajesAppCargando || !medsdiGetAuthToken()) return;
    contadorMensajesConsultando = true;
    var rol = localStorage.getItem('rolActivo') === 'Profesional' ? 'Profesional' : 'Paciente';
    var api = new Api('mensajes', '');
    api.request({rol: rol}, function(resp) {
        contadorMensajesConsultando = false;
        mensajesAppCache = resp.registros || [];
        mensajesAppUltimaCarga = Date.now();
        var noLeidos = Number(resp.no_leidos || 0);
        $('.mensajes-badge').text(noLeidos > 99 ? '99+' : noLeidos).toggle(noLeidos > 0);
    }, function() {
        contadorMensajesConsultando = false;
    }, 'GET');
};

$(document).on('pageshow', '#index, #inicio-profesional', function() {
    actualizarContadorMensajes();
});

// Al volver a la app (desde segundo plano) se refresca el contador.
document.addEventListener('resume', function() {
    var pagina = $.mobile && $.mobile.activePage ? $.mobile.activePage.attr('id') : '';
    if (pagina === 'index' || pagina === 'inicio-profesional') actualizarContadorMensajes();
}, false);
