let emergencyContingencyMode = false;
let emergencyCurrentPhone = null;

/**
 * Request normal del módulo de emergencia.
 * Requiere la sesión API del usuario (X-Auth-Token).
 */
const emergencyRequest = (path, method, data, success, error) => {
    const authToken = medsdiGetAuthToken();

    if (!authToken) {
        if (typeof error === 'function') {
            error({status: 401, responseJSON: {message: 'Sesión no disponible.'}});
        }
        return;
    }

    $.ajax({
        url: MEDSDI_API_URL + '/emergency-doctor' + path,
        method: method,
        data: data ? JSON.stringify(data) : undefined,
        contentType: data ? 'application/json' : undefined,
        dataType: 'json',
        headers: {
            'Accept': 'application/json',
            'X-Auth-Token': authToken
        },
        success: success,
        error: function (xhr) {
            if (typeof error === 'function') {
                return error(xhr);
            }

            const response = xhr.responseJSON || {};
            msg(
                'Contacto de emergencia',
                response.message || response.mensaje || 'No fue posible completar la operación.',
                'error'
            );
        }
    });
};

/**
 * Obtiene el UUID persistente que ya utiliza la aplicación.
 */
const obtenerUuidEmergencia = () => {
    if (typeof obtenerUuidDispositivo === 'function') {
        const uuid = obtenerUuidDispositivo();
        if (uuid) return uuid;
    }

    return localStorage.getItem('uuid') ||
        localStorage.getItem('deviceUuid') ||
        localStorage.getItem('deviceUUID') ||
        '';
};

/**
 * Obtiene el token independiente de emergencia.
 * Se aceptan ambos nombres para mantener compatibilidad durante la transición.
 */
const obtenerEmergencyToken = () => {
    return localStorage.getItem('emergencyToken') ||
        localStorage.getItem('emergency_token') ||
        '';
};

/**
 * Acceso de contingencia.
 *
 * Esta ruta NO utiliza el token Sanctum. Solo puede recuperar el vínculo
 * de emergencia desde un dispositivo previamente autorizado.
 *
 * Backend esperado:
 * POST /api/emergency-doctor/device-access
 * {
 *   "uuid": "...",
 *   "emergency_token": "..."
 * }
 */
const emergencyDeviceAccessRequest = (success, error) => {
    const uuid = obtenerUuidEmergencia();
    const emergencyToken = obtenerEmergencyToken();

    if (!uuid || !emergencyToken) {
        if (typeof error === 'function') {
            error({
                status: 401,
                responseJSON: {
                    message: 'Este dispositivo todavía no dispone de acceso de emergencia.'
                }
            });
        }
        return;
    }

    $.ajax({
        url: MEDSDI_API_URL + '/emergency-doctor/device-access',
        method: 'POST',
        data: JSON.stringify({
            uuid: uuid,
            emergency_token: emergencyToken
        }),
        contentType: 'application/json',
        dataType: 'json',
        headers: {
            'Accept': 'application/json'
        },
        success: success,
        error: function (xhr) {
            if (typeof error === 'function') {
                return error(xhr);
            }

            const response = xhr.responseJSON || {};
            msg(
                'Emergencia',
                response.message || response.mensaje || 'No fue posible recuperar el contacto de emergencia.',
                'error'
            );
        }
    });
};

/**
 * Alias de compatibilidad con versiones anteriores de este archivo.
 */
const emergencyAccessRequest = (path, method, data, success, error) => {
    emergencyDeviceAccessRequest(success, error);
};

const abrirMedicoEmergencia = () => {
    sessionStorage.setItem('emergencyEntryPoint', 'app');
    vista('medico-emergencia-app', 'fade');
    cargarMedicoEmergencia();
};

const abrirMedicoEmergenciaDesdeLogin = () => {
    sessionStorage.setItem('emergencyEntryPoint', 'login');
    vista('medico-emergencia-app', 'fade');
    cargarMedicoEmergenciaContingencia();
};

const volverDesdeEmergencia = () => {
    const entryPoint = sessionStorage.getItem('emergencyEntryPoint');

    if (entryPoint === 'login' || !medsdiGetAuthToken()) {
        sessionStorage.removeItem('emergencyEntryPoint');
        vista('login', 'fade');
        return;
    }

    sessionStorage.removeItem('emergencyEntryPoint');

    if (typeof volverInicioSegunRol === 'function') {
        volverInicioSegunRol();
    } else {
        vista(localStorage.getItem('rolActivo') === 'Profesional' ? 'inicio-profesional' : 'index', 'fade');
    }
};

/**
 * Primero intenta utilizar la sesión normal.
 * Si el paciente perdió/expiró su sesión, cae automáticamente al acceso
 * de contingencia por UUID + emergency_token.
 */
const cargarMedicoEmergencia = () => {
    emergencyContingencyMode = false;
    emergencyCurrentPhone = null;

    const authToken = medsdiGetAuthToken();

    if (!authToken) {
        return cargarMedicoEmergenciaContingencia();
    }

    emergencyRequest('', 'GET', null, function (response) {
        emergencyContingencyMode = false;
        $('#emergency-search-section').show();

        const patientRole = response.role === 'patient';
        $('#emergency-patient-panel').toggle(patientRole);
        $('#emergency-professional-panel').toggle(!patientRole);

        if (patientRole) {
            renderEmergencyPatientLink(response.link, false);
        } else {
            renderEmergencyProfessionalLinks(response.links || []);
        }
    }, function (xhr) {
        // Solo hacemos fallback para sesión inválida/expirada.
        if ((xhr.status === 401 || xhr.status === 403) &&
            localStorage.getItem('rolActivo') === 'Paciente') {
            cargarMedicoEmergenciaContingencia();
            return;
        }

        const response = xhr.responseJSON || {};
        msg(
            'Contacto de emergencia',
            response.message || response.mensaje || 'No fue posible cargar el módulo de emergencia.',
            'error'
        );
    });
};

const cargarMedicoEmergenciaContingencia = () => {
    $('#emergency-search-section').hide();

    emergencyDeviceAccessRequest(function (response) {
        emergencyContingencyMode = true;

        $('#emergency-patient-panel').show();
        $('#emergency-professional-panel').hide();

        renderEmergencyPatientLink(response.link || null, true);
    }, function (xhr) {
        emergencyContingencyMode = true;
        emergencyCurrentPhone = null;

        $('#emergency-patient-panel').show();
        $('#emergency-professional-panel').hide();
        $('#boton-panico-paciente').hide();

        const response = xhr.responseJSON || {};
        const message = response.message ||
            response.mensaje ||
            'No fue posible validar este dispositivo para acceso de emergencia.';

        $('#medico-emergencia-resumen').text('Acceso de emergencia no disponible');
        $('#emergency-current-link').html(
            '<div class="emergency-empty">' +
            '<strong>No fue posible recuperar tu contacto</strong>' +
            '<p>' + escapeEmergency(message) + '</p>' +
            '</div>'
        );
    });
};

const renderEmergencyPatientLink = (link, contingencyMode) => {
    contingencyMode = !!contingencyMode;

    const $summary = $('#medico-emergencia-resumen');

    if (!link) {
        emergencyCurrentPhone = null;
        $('#boton-panico-paciente').hide();

        if (contingencyMode) {
            $summary.text('Sin contacto de emergencia');
            $('#emergency-current-link').html(
                '<div class="emergency-empty">' +
                '<strong>Sin médico enlazado</strong>' +
                '<p>Inicia sesión cuando sea posible para configurar un profesional de emergencia.</p>' +
                '</div>'
            );
        } else {
            $summary.text('Configura un contacto médico');
            $('#emergency-current-link').html(
                '<div class="emergency-empty">' +
                '<strong>Sin médico enlazado</strong>' +
                '<p>Busca un profesional para enviarle una solicitud.</p>' +
                '</div>'
            );
        }

        return;
    }

    const professional = link.professional || {};
    const active = link.status === 'active';
    const phone = active ? (professional.phone || '') : '';

    emergencyCurrentPhone = phone || null;

    $summary.text(active ? (professional.name || 'Profesional') : 'Solicitud pendiente de aceptación');

    // En contingencia el botón SOS permite llamar directamente.
    // Con sesión normal conserva alerta Firebase + llamada.
    $('#boton-panico-paciente').toggle(active && !!phone);

    const status = active
        ? (contingencyMode ? 'Contacto disponible sin iniciar sesión' : 'Vínculo activo')
        : 'Esperando aceptación';

    let actions = '';

    if (active && phone) {
        actions +=
            '<button type="button" class="emergency-call-button" ' +
            'onclick="llamarMedicoEmergencia(\'' + escapeEmergencyJs(phone) + '\')">Llamar</button>';
    }

    // En modo contingencia NO permitimos modificar el vínculo.
    if (!contingencyMode) {
        actions +=
            '<button type="button" onclick="revocarMedicoEmergencia(' +
            parseInt(link.id, 10) + ')">Quitar</button>';
    }

    $('#emergency-current-link').html(
        '<article class="emergency-link-card">' +
            '<span class="emergency-link-icon">♥</span>' +
            '<div>' +
                '<small>' + escapeEmergency(status) + '</small>' +
                '<h2>' + escapeEmergency(professional.name || 'Profesional') + '</h2>' +
                '<p>' + escapeEmergency(professional.specialty || '') + '</p>' +
            '</div>' +
            '<div class="emergency-link-actions">' + actions + '</div>' +
        '</article>'
    );
};

const llamarMedicoEmergencia = (phone) => {

    const cleanPhone = String(phone || '')
        .replace(/[^+0-9]/g, '');

    if (!cleanPhone) {
        msg(
            'Contacto de emergencia',
            'El profesional no tiene un teléfono disponible.',
            'warning'
        );
        return;
    }

    const telUrl = 'tel:' + cleanPhone;

    console.log('Abriendo marcador:', telUrl);

    if (
        window.cordova &&
        cordova.InAppBrowser
    ) {
        cordova.InAppBrowser.open(
            telUrl,
            '_system'
        );

        return;
    }

    window.open(telUrl, '_system');
};

const buscarProfesionalEmergencia = () => {
    if (emergencyContingencyMode) {
        msg(
            'Contacto de emergencia',
            'Para buscar o cambiar tu profesional debes iniciar sesión.',
            'warning'
        );
        return;
    }

    const query = $.trim($('#emergency-professional-query').val());

    if (query.length < 3) {
        msg('Buscar profesional', 'Ingresa al menos tres caracteres.', 'warning');
        return;
    }

    $('#emergency-professional-results').html(
        '<div class="app-estado-carga"><span class="app-spinner"></span></div>'
    );

    emergencyRequest(
        '/professionals?q=' + encodeURIComponent(query),
        'GET',
        null,
        function (items) {
            const html = items.length
                ? items.map(function (item) {
                    return '<article class="emergency-result"><div><strong>' +
                        escapeEmergency(item.name) +
                        '</strong><small>' +
                        escapeEmergency(item.specialty) +
                        '</small></div>' +
                        '<button type="button" onclick="solicitarMedicoEmergencia(' +
                        parseInt(item.id, 10) +
                        ')">Enlazar</button></article>';
                }).join('')
                : '<div class="emergency-empty"><p>No encontramos profesionales.</p></div>';

            $('#emergency-professional-results').html(html);
        }
    );
};

const solicitarMedicoEmergencia = (professionalId) => {
    if (emergencyContingencyMode) {
        msg('Contacto de emergencia', 'Debes iniciar sesión para crear un vínculo.', 'warning');
        return;
    }

    emergencyRequest('/links', 'POST', {professional_id: professionalId}, function (response) {
        msg('Médico de emergencia', 'Solicitud enviada al profesional.', 'success');
        $('#emergency-professional-results').empty();
        renderEmergencyPatientLink(response.link, false);
    });
};

const decidirVinculoEmergencia = (linkId, decision) => {
    emergencyRequest('/links/' + linkId + '/decision', 'POST', {decision: decision}, function () {
        msg(
            'Contacto de emergencia',
            decision === 'accept' ? 'Vínculo aceptado.' : 'Solicitud rechazada.',
            'success'
        );
        cargarMedicoEmergencia();
    });
};

const revocarMedicoEmergencia = (linkId) => {
    if (emergencyContingencyMode) {
        msg('Contacto de emergencia', 'Debes iniciar sesión para modificar el vínculo.', 'warning');
        return;
    }

    emergencyRequest('/links/' + linkId, 'DELETE', null, function () {
        msg('Contacto de emergencia', 'El vínculo fue retirado.', 'success');
        cargarMedicoEmergencia();
    });
};

const renderEmergencyProfessionalLinks = (links) => {
    emergencyContingencyMode = false;

    const html = links.length
        ? links.map(function (link) {
            const pending = link.status === 'pending';

            return '<article class="emergency-link-card professional">' +
                '<span class="emergency-link-icon">♥</span>' +
                '<div><small>' +
                (pending ? 'Solicitud pendiente' : 'Paciente vinculado') +
                '</small><h2>' +
                escapeEmergency(link.patient) +
                '</h2></div>' +
                (pending
                    ? '<div class="emergency-link-actions">' +
                        '<button class="reject" onclick="decidirVinculoEmergencia(' +
                        parseInt(link.id, 10) +
                        ',&quot;reject&quot;)">Rechazar</button>' +
                        '<button onclick="decidirVinculoEmergencia(' +
                        parseInt(link.id, 10) +
                        ',&quot;accept&quot;)">Aceptar</button></div>'
                    : (link.phone
                        ? '<a href="tel:' +
                            encodeURIComponent(String(link.phone).replace(/[^+0-9]/g, '')) +
                            '">Llamar</a>'
                        : '')
                ) +
                '</article>';
        }).join('')
        : '<div class="emergency-empty"><strong>Sin solicitudes</strong>' +
            '<p>No tienes pacientes de emergencia vinculados.</p></div>';

    $('#emergency-professional-links').html(html);
};

var emergencyPressTimer = null;

const iniciarPulsacionSOS = (event) => {
    if (event) event.preventDefault();

    $('#boton-panico-paciente').addClass('pressing');

    emergencyPressTimer = setTimeout(function () {
        emergencyPressTimer = null;
        $('#boton-panico-paciente').removeClass('pressing');
        confirmarAlertaEmergencia();
    }, 1300);
};

const cancelarPulsacionSOS = () => {
    if (emergencyPressTimer) {
        clearTimeout(emergencyPressTimer);
    }

    emergencyPressTimer = null;
    $('#boton-panico-paciente').removeClass('pressing');
};

const confirmarAlertaEmergencia = () => {
    // Sin sesión no intentamos /alerts porque sigue protegido por auth:api.
    // El modo contingencia mantiene la función principal: contactar al profesional.
    if (emergencyContingencyMode) {
        if (!emergencyCurrentPhone) {
            msg('Emergencia', 'El profesional no tiene un teléfono disponible.', 'warning');
            return;
        }

        const executeCall = function (button) {
            if (button === 1) {
                llamarMedicoEmergencia(emergencyCurrentPhone);
            }
        };

        if (navigator.notification && navigator.notification.confirm) {
            navigator.notification.confirm(
                'Se abrirá una llamada a tu profesional de emergencia.',
                executeCall,
                'Llamar a profesional',
                ['Llamar', 'Cancelar']
            );
        } else if (window.confirm('¿Llamar a tu profesional de emergencia?')) {
            llamarMedicoEmergencia(emergencyCurrentPhone);
        }

        return;
    }

    const execute = function (button) {
        if (button === 1) {
            enviarAlertaEmergencia();
        }
    };

    if (navigator.notification && navigator.notification.confirm) {
        navigator.notification.confirm(
            'Se avisará a tu médico vinculado y se abrirá una llamada. Si existe riesgo vital, contacta al servicio oficial de emergencias.',
            execute,
            'Confirmar alerta SOS',
            ['Alertar y llamar', 'Cancelar']
        );
    } else if (window.confirm('¿Enviar alerta SOS y llamar a tu médico?')) {
        enviarAlertaEmergencia();
    }
};

const enviarAlertaEmergencia = () => {
    if (emergencyContingencyMode) {
        llamarMedicoEmergencia(emergencyCurrentPhone);
        return;
    }

    const send = function (position) {
        const data = position
            ? {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            }
            : {};

        emergencyRequest('/alerts', 'POST', data, function (response) {
            msg(
                'Alerta SOS',
                'La alerta fue registrada. Intentando llamar al profesional.',
                'success'
            );

            const phone = response.doctor && response.doctor.phone;

            if (phone) {
                llamarMedicoEmergencia(phone);
            } else {
                msg('Alerta SOS', 'El profesional no tiene un teléfono disponible.', 'warning');
            }
        });
    };

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            send,
            function () {
                send(null);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 60000
            }
        );
    } else {
        send(null);
    }
};

const escapeEmergency = (value) => $('<div>').text(value || '').html();

const escapeEmergencyJs = (value) => {
    return String(value || '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r/g, '')
        .replace(/\n/g, '');
};

$(document).on('pageshow', '#index', function () {
    if (localStorage.getItem('rolActivo') === 'Paciente') {
        cargarMedicoEmergenciaResumen();
    }
});

/**
 * Resumen de inicio:
 * 1) usa la sesión normal cuando existe;
 * 2) si expiró, intenta automáticamente UUID + emergency_token.
 */
const cargarMedicoEmergenciaResumen = () => {
    const authToken = medsdiGetAuthToken();

    if (authToken) {
        emergencyRequest('', 'GET', null, function (response) {
            if (response.role === 'patient') {
                emergencyContingencyMode = false;
                $('#emergency-search-section').show();
                renderEmergencyPatientLink(response.link, false);
            }
        }, function (xhr) {
            if (xhr.status === 401 || xhr.status === 403) {
                cargarResumenEmergenciaContingencia();
            }
        });

        return;
    }

    cargarResumenEmergenciaContingencia();
};

const cargarResumenEmergenciaContingencia = () => {
    emergencyDeviceAccessRequest(function (response) {
        emergencyContingencyMode = true;
        renderEmergencyPatientLink(response.link || null, true);
    }, function () {
        // En la portada no mostramos error intrusivo.
        // La pantalla completa de emergencia sí mostrará el motivo.
    });
};
