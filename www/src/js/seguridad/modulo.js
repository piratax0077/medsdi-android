const mobileTwoFactorRequest = (path, method, data, success, errorCallback) => {
    const token = medsdiGetAuthToken();
    if (!token) {
        msg('Seguridad', 'Debes iniciar sesión para revisar los accesos.', 'warning');
        return;
    }

    var api = new Api('mobile-2fa', path);

    api.request(
        data || {},
        success,
        function (xhr, status, error) {
            console.error('[MED-SDI] No fue posible resolver la solicitud.', xhr ? xhr.status : null);

            if (xhr && xhr.status === 401) {
                medsdiClearAuthToken();
                localStorage.setItem('desafioAccesoPendiente', '1');
                vista('login', 'fade');
                msg('Seguridad', 'Tu sesión móvil terminó. Inicia sesión nuevamente.', 'warning');
                return;
            }

            if (typeof errorCallback === 'function') {
                errorCallback(xhr, status, error);
                return;
            }

            if (xhr && xhr.status === 429) {
                msg('Seguridad', 'Se realizaron demasiadas solicitudes. Espera unos segundos antes de volver a actualizar.', 'warning');
                return;
            }

            if (xhr && xhr.status === 409) {
                msg('Seguridad', 'Este acceso ya fue resuelto o expiró.', 'warning');
                return;
            }

            var mensaje = 'No fue posible comunicarse con MED-SDI.';
            if (xhr && xhr.responseJSON && xhr.responseJSON.message) {
                mensaje = xhr.responseJSON.message;
            } else if (xhr && xhr.status) {
                mensaje += ' HTTP ' + xhr.status;
            }
            msg('Seguridad', mensaje, 'error');
        },
        String(method || 'GET').toUpperCase(),
        false,
        12000
    );
};

const abrirDesafiosAcceso = () => {
    if (!medsdiGetAuthToken()) {
        localStorage.setItem('desafioAccesoPendiente', '1');
        vista('login', 'fade');
        msg('Seguridad', 'Inicia sesión para revisar los accesos.', 'warning');
        return;
    }
    // La clave SDI pertenece al usuario + dispositivo en el backend. Antes de
    // mostrar una aprobación forzamos la sincronización para no conservar el PIN
    // global de otra cuenta o uno anterior al último cambio de clave.
    if (typeof checkDevice === 'function') {
        checkDeviceUltimaVerificacion = 0;
        checkDevice(function (dispositivoActivo) {
            if (!dispositivoActivo) {
                msg(
                    'Seguridad',
                    'Este dispositivo todavía no está registrado o activo para la cuenta. Regístralo y luego aprueba su acceso desde la web.',
                    'warning'
                );

                // checkDevice se invoca con callback desde esta pantalla y no
                // abre por sí mismo el flujo de registro. Lo iniciamos aquí para
                // vincular el UUID actual en lugar de dejar al usuario bloqueado.
                if (typeof registrarPasswordShow === 'function') {
                    registrarPasswordShow();
                }
                return;
            }
            vista('desafios-acceso', 'fade');
            cargarDesafiosAcceso(true);
        }, true);
        return;
    }

    vista('desafios-acceso', 'fade');
    cargarDesafiosAcceso(true);
};

const volverDesdeDesafiosAcceso = () => {
    const rolActivo = localStorage.getItem('rolActivo');
    vista(rolActivo === 'Profesional' ? 'inicio-profesional' : 'index', 'fade');
};

let desafiosAccesoCargando = false;
let desafiosAccesoUltimaCarga = 0;
const desafiosAccesoCacheMs = 30000;

const cargarDesafiosAcceso = (forzar) => {
    forzar = forzar === true;
    const ahora = Date.now();

    if (desafiosAccesoCargando) {
        console.log('[MED-SDI] Ya hay una carga de desafíos en curso.');
        return;
    }

    if (
        !forzar &&
        desafiosAccesoUltimaCarga &&
        (ahora - desafiosAccesoUltimaCarga) < desafiosAccesoCacheMs
    ) {
        console.log('[MED-SDI] Se omite carga repetida de desafíos por caché temporal.');
        return;
    }

    desafiosAccesoCargando = true;

    $('#lista-desafios-acceso').html(
        '<div class="app-estado-carga"><span class="app-spinner"></span><p>Buscando solicitudes seguras…</p></div>'
    );

    mobileTwoFactorRequest('challenges', 'GET', null, function (items) {
        desafiosAccesoCargando = false;
        desafiosAccesoUltimaCarga = Date.now();

        if (!items.length) {
            $('#lista-desafios-acceso').html(
                '<div class="app-estado-vacio">' +
                '<span class="app-estado-vacio-icono">✓</span>' +
                '<strong>Todo está en orden</strong>' +
                '<p>No tienes solicitudes de acceso pendientes.</p>' +
                '</div>'
            );
            return;
        }

        const html = items.map(function (item) {
            return '<article class="desafio-acceso-card">' +
                '<div class="desafio-acceso-cabecera">' +
                '<span class="desafio-acceso-icono">↗</span>' +
                '<div><strong>Nuevo acceso a MED-SDI</strong><span>Esperando tu confirmación</span></div>' +
                '<span class="desafio-acceso-estado">Pendiente</span>' +
                '</div>' +
                '<div class="desafio-acceso-datos">' +
                '<div><span class="desafio-dato-icono">⌖</span><p><small>Ubicación aproximada</small>' +
                escaparHtml(item.location || 'No disponible') + '</p></div>' +
                '<div><span class="desafio-dato-icono">▣</span><p><small>Dispositivo</small>' +
                escaparHtml(nombreDispositivoAcceso(item.device)) + '</p></div>' +
                '</div>' +
                '<div class="desafio-acceso-acciones">' +
                '<button type="button" class="desafio-btn rechazar" onclick="confirmarDesafioAcceso(\'' + item.id + '\', \'rejected\')">Rechazar</button>' +
                '<button type="button" class="desafio-btn aprobar" onclick="confirmarDesafioAcceso(\'' + item.id + '\', \'approved\')">✓ Aprobar acceso</button>' +
                '</div>' +
                '</article>';
        }).join('');

        $('#lista-desafios-acceso').html(html);
    }, function (xhr) {
        desafiosAccesoCargando = false;

        const respuesta = xhr && xhr.responseJSON ? xhr.responseJSON : {};

        if (xhr && xhr.status === 429) {
            desafiosAccesoUltimaCarga = Date.now();
            $('#lista-desafios-acceso').html(
                '<div class="app-estado-vacio">' +
                '<span class="app-estado-vacio-icono">!</span>' +
                '<strong>Demasiadas solicitudes</strong>' +
                '<p>Espera unos segundos antes de volver a actualizar.</p>' +
                '</div>'
            );
            msg('Seguridad', 'Se realizaron demasiadas solicitudes. Espera unos segundos.', 'warning');
            return;
        }

        var mensaje = respuesta.message || (
            xhr && xhr.status
                ? 'No fue posible cargar los accesos. HTTP ' + xhr.status
                : 'No fue posible comunicarse con MED-SDI.'
        );

        $('#lista-desafios-acceso').html(
            '<div class="app-estado-vacio">' +
            '<span class="app-estado-vacio-icono">!</span>' +
            '<strong>No fue posible cargar los accesos</strong>' +
            '<p>' + escaparHtml(mensaje) + '</p>' +
            '</div>'
        );
        msg('Seguridad', mensaje, 'error');
    });
};

const nombreDispositivoAcceso = (device) => {
    const texto = String(device || '');
    if (/android/i.test(texto)) return 'Teléfono o tablet Android';
    if (/iphone|ipad/i.test(texto)) return 'iPhone o iPad';
    if (/windows/i.test(texto)) return 'Computador Windows';
    if (/macintosh|mac os/i.test(texto)) return 'Computador Mac';
    if (/linux/i.test(texto)) return 'Computador Linux';
    return texto || 'Dispositivo no identificado';
};

const confirmarDesafioAcceso = (id, decision) => {
    const aprobar = decision === 'approved';
    $('#desafio-confirmacion-overlay')
        .addClass('visible')
        .attr('aria-hidden', 'false')
        .data('challenge-id', id)
        .data('decision', decision);
    $('#desafio-confirmacion-icono').toggleClass('rechazar', !aprobar).text(aprobar ? '✓' : '!');
    $('#desafio-confirmacion-titulo').text(aprobar ? 'Aprobar este acceso' : 'Rechazar este acceso');
    $('#desafio-confirmacion-texto').text(
        aprobar
            ? 'Confirma que reconoces este ingreso a tu cuenta.'
            : 'Confirma tu identidad para bloquear esta solicitud.'
    );
    $('#desafio-confirmar-clave').text(aprobar ? 'Aprobar con clave SDI' : 'Rechazar con clave SDI');
    $('#desafio_clave_web').val('').attr('type', 'password');
    $('#desafio-ver-clave').text('Ver');
    $('#desafio-confirmacion-error').text('');

    const biometriaDisponible = biometriaHabilitadaApp()
        && typeof Fingerprint !== 'undefined';
    $('#desafio-confirmar-huella').toggle(biometriaDisponible);
    $('#desafio-huella-ayuda').text(
        biometriaDisponible
            ? ''
            : 'Activa la autorización con huella desde Editar perfil para usar esta opción.'
    );
    setTimeout(function () { $('#desafio_clave_web').focus(); }, 150);
};

const cerrarConfirmacionDesafio = () => {
    $('#desafio-confirmacion-overlay')
        .removeClass('visible')
        .attr('aria-hidden', 'true')
        .removeData('challenge-id')
        .removeData('decision');
    $('#desafio_clave_web').val('');
    $('#desafio-confirmacion-error').text('');
};

const alternarVisibilidadClaveDesafio = () => {
    const $input = $('#desafio_clave_web');
    const mostrar = $input.attr('type') === 'password';
    $input.attr('type', mostrar ? 'text' : 'password');
    $('#desafio-ver-clave').text(mostrar ? 'Ocultar' : 'Ver');
};

const obtenerDecisionDesafioActual = () => {
    const $overlay = $('#desafio-confirmacion-overlay');
    return {
        id: String($overlay.data('challenge-id') || ''),
        decision: String($overlay.data('decision') || '')
    };
};

const resolverDesafioConClave = () => {
    const actual = obtenerDecisionDesafioActual();
    const credential = $.trim($('#desafio_clave_web').val());
    if (!/^\d{4}$/.test(credential)) {
        $('#desafio-confirmacion-error').text('Ingresa tu clave SDI de 4 dígitos.');
        $('#desafio_clave_web').focus();
        return;
    }

    resolverDesafioAcceso(actual.id, actual.decision, 'device_pin', credential);
};

const resolverDesafioConBiometria = () => {
    const actual = obtenerDecisionDesafioActual();
    if (!biometriaHabilitadaApp() || typeof Fingerprint === 'undefined') {
        $('#desafio-confirmacion-error').text('La huella no está habilitada para esta cuenta.');
        return;
    }

    Fingerprint.loadBiometricSecret(
        opcionesBiometriaApp(
            actual.decision === 'approved'
                ? 'Confirma tu huella para aprobar este acceso.'
                : 'Confirma tu huella para rechazar este acceso.'
        ),
        function (secreto) {
            try {
                const boveda = decodificarBovedaBiometricaApp(secreto);
                if (!boveda.pin) {
                    throw new Error('Vuelve a activar la autorización con huella desde Editar perfil.');
                }
                resolverDesafioAcceso(actual.id, actual.decision, 'biometric', boveda.pin);
            } catch (error) {
                $('#desafio-confirmacion-error').text(error.message);
            }
        },
        function (error) {
            if (error && Number(error.code) === -113) {
                if (typeof limpiarLoginBiometricoApp === 'function') {
                    limpiarLoginBiometricoApp();
                } else {
                    localStorage.removeItem('biometria_login_habilitada');
                    localStorage.removeItem('biometria_login_usuario');
                    localStorage.removeItem('biometria_login_uuid');
                }
                $('#desafio-confirmar-huella').hide();
            }
            $('#desafio-confirmacion-error').text(
                (error && error.message) || 'No fue posible validar la huella.'
            );
        }
    );
};

const resolverDesafioAcceso = (id, decision, authMethod, credential) => {
    if (!id || !decision) return;
    const uuid = typeof obtenerUuidDispositivo === 'function'
        ? obtenerUuidDispositivo()
        : (localStorage.getItem('uuid') || '');
    if (!uuid || uuid === '0') {
        $('#desafio-confirmacion-error').text(
            'Este navegador no tiene un dispositivo SDI registrado. Inicia sesión y registra este equipo antes de aprobar el acceso.'
        );
        return;
    }
    $('#desafio-confirmacion-error').text('');
    $('#desafio-confirmar-clave, #desafio-confirmar-huella').prop('disabled', true);

    mobileTwoFactorRequest('challenges/' + encodeURIComponent(id) + '/decision', 'POST', {
        decision: decision,
        auth_method: authMethod,
        credential: credential,
        uuid: uuid
    }, function () {
        $('#desafio-confirmar-clave, #desafio-confirmar-huella').prop('disabled', false);
        cerrarConfirmacionDesafio();
        msg('Seguridad', decision === 'approved' ? 'Acceso aprobado.' : 'Acceso rechazado.', 'success');
        desafiosAccesoUltimaCarga = 0;
        cargarDesafiosAcceso(true);
    }, function (xhr) {
        $('#desafio-confirmar-clave, #desafio-confirmar-huella').prop('disabled', false);
        const respuesta = xhr.responseJSON || {};
        if (xhr.status === 422) {
            const errores = respuesta.errors || {};
            const primerCampo = Object.keys(errores)[0];
            const detalle = primerCampo && Array.isArray(errores[primerCampo])
                ? errores[primerCampo][0]
                : '';
            $('#desafio-confirmacion-error').text(
                detalle || respuesta.message || 'La clave SDI no es correcta.'
            );
            $('#desafio_clave_web').val('').focus();
            return;
        }
        if (xhr.status === 409) {
            cerrarConfirmacionDesafio();
            msg('Seguridad', 'Este acceso ya fue resuelto o expiró.', 'warning');
            desafiosAccesoUltimaCarga = 0;
            cargarDesafiosAcceso(true);
            return;
        }

        if (xhr.status === 429) {
            $('#desafio-confirmacion-error').text(
                'Se realizaron demasiadas solicitudes. Espera unos segundos antes de volver a intentar.'
            );
            return;
        }

        $('#desafio-confirmacion-error').text(
            respuesta.message ||
            (xhr.status
                ? 'No fue posible comunicarse con MED-SDI. HTTP ' + xhr.status
                : 'No fue posible comunicarse con MED-SDI. El servidor no respondió.')
        );
    });
};

const escaparHtml = (value) => $('<div>').text(value || '').html();

$(document).on('keyup', '#desafio_clave_web', function (event) {
    if (event.key === 'Enter') resolverDesafioConClave();
});
