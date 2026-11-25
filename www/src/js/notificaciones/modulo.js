var notificacionesPushInicializadas = false;
var notificacionesPushUltimaInicializacion = 0;
var notificacionesPushInicializacionMs = 5 * 60 * 1000;
var registroTokenPushEnCurso = false;

const registrarTokenPush = (token) => {
    const authToken = medsdiGetAuthToken();
    if (!authToken || !token || registroTokenPushEnCurso) return;

    var usuario = String(_SESSION('id_usuario') || '');
    var uuid = String(localStorage.getItem('uuid') || '');
    var registroKey = usuario + '|' + uuid + '|' + token;

    if (localStorage.getItem('fcmRegistrationKey') === registroKey) {
        localStorage.setItem('fcmToken', token);
        return;
    }

    registroTokenPushEnCurso = true;

    $.ajax({
        url: MEDSDI_API_URL + '/mobile/devices',
        method: 'POST',
        data: JSON.stringify({
            token: token,
            platform: 'android',
            device_uuid: localStorage.getItem('uuid') || null
        }),
        contentType: 'application/json',
        dataType: 'json',
        headers: {
            'Accept': 'application/json',
            'X-Auth-Token': authToken
        },
        success: function () {
            localStorage.setItem('fcmToken', token);
            localStorage.setItem('fcmRegistrationKey', registroKey);
            registroTokenPushEnCurso = false;
            console.log('Token FCM registrado en MED-SDI.');
        },
        error: function (xhr) {
            registroTokenPushEnCurso = false;
            console.error('No se pudo registrar el token FCM.', xhr.status);
        }
    });
};

const manejarNotificacionPush = (mensaje) => {
    if (!mensaje || !['login_approval', 'authorization_request', 'direct_message', 'patient_emergency', 'rest_control_request', 'rest_control_reminder'].includes(mensaje.type)) return;

    const esAutorizacion = mensaje.type === 'authorization_request';
    const esMensajeDirecto = mensaje.type === 'direct_message';
    const esEmergencia = mensaje.type === 'patient_emergency';
    const esControlReposo = mensaje.type === 'rest_control_request' || mensaje.type === 'rest_control_reminder';
    const usuarioDestino = String(mensaje.target_user_id || '');
    const usuarioActivo = String(_SESSION('id_usuario') || '');

    if (mensaje.tap === 'background' || mensaje.tap === 'foreground') {
        if (usuarioDestino && usuarioActivo && usuarioDestino !== usuarioActivo) {
            localStorage.setItem(esMensajeDirecto ? 'mensajePendiente' : (esAutorizacion ? 'autorizacionPendiente' : 'desafioAccesoPendiente'), '1');
            msg(
                'Seguridad',
                'Esta solicitud pertenece a otra cuenta registrada en este teléfono. Cierra sesión e ingresa con esa cuenta para aprobarla.',
                'info'
            );
            return;
        }

        if (!medsdiGetAuthToken()) {
            localStorage.setItem(esMensajeDirecto ? 'mensajePendiente' : (esAutorizacion ? 'autorizacionPendiente' : 'desafioAccesoPendiente'), '1');
            $('#user, #pass').val('');
            vista('login', 'fade');
            msg('Seguridad', 'Inicia sesión para revisar y aprobar este acceso.', 'info');
            return;
        }

        if (esControlReposo) {
            cargar_controles_reposo();
        } else if (esEmergencia) {
            abrirMedicoEmergencia();
        } else if (esMensajeDirecto) {
            localStorage.removeItem('mensajePendiente');
            abrirMensajesApp();
        } else if (esAutorizacion) {
            if ($.mobile && $.mobile.activePage && $.mobile.activePage.attr('id') === 'autorizaciones_sdi') {
                list_log_device();
            } else {
                vista('autorizaciones_sdi', 'fade');
            }
        } else {
            abrirDesafiosAcceso();
        }
        return;
    }

    // En primer plano el plugin también muestra una notificación del sistema.
    // Actualizamos la lista si el usuario ya está mirando los desafíos.
    if (esEmergencia && $.mobile && $.mobile.activePage && $.mobile.activePage.attr('id') === 'medico-emergencia-app') {
        cargarMedicoEmergencia();
    } else if (esMensajeDirecto && $.mobile && $.mobile.activePage && $.mobile.activePage.attr('id') === 'mensajes-app') {
        cargarMensajesApp(true);
    } else if (esMensajeDirecto) {
        // Llegó un mensaje nuevo: se actualiza el número de la carta junto a la campana.
        if (typeof actualizarContadorMensajes === 'function') actualizarContadorMensajes();
    } else if (esAutorizacion && $.mobile && $.mobile.activePage && $.mobile.activePage.attr('id') === 'autorizaciones_sdi') {
        list_log_device();
    } else if (!esAutorizacion && $.mobile && $.mobile.activePage && $.mobile.activePage.attr('id') === 'desafios-acceso') {
        cargarDesafiosAcceso(true);
    }
};

const inicializarNotificacionesPush = (forzar) => {
    forzar = forzar === true;
    var ahora = Date.now();

    if (!forzar && notificacionesPushUltimaInicializacion && (ahora - notificacionesPushUltimaInicializacion) < notificacionesPushInicializacionMs) {
        return;
    }
    notificacionesPushUltimaInicializacion = ahora;

    const esCordovaBrowser = typeof cordova !== 'undefined' && cordova.platformId === 'browser';
    if (esCordovaBrowser || typeof FirebasexMessaging === 'undefined') {
        console.log('Firebase Messaging no está disponible en esta plataforma.');
        return;
    }

    FirebasexMessaging.grantPermission(function (concedido) {
        if (!concedido) {
            console.warn('El usuario no concedió permiso para mostrar notificaciones.');
            return;
        }

        const channel = {
            id: 'medsdi_security',
            name: 'Seguridad MED-SDI',
            description: 'Solicitudes de acceso y alertas de seguridad',
            sound: 'default',
            vibration: true,
            importance: 'high',
            visibility: 1,
            badge: true
        };

        const messagesChannel = {
            id: 'medsdi_messages',
            name: 'Mensajes MED-SDI',
            description: 'Mensajes enviados por profesionales y MED-SDI',
            sound: 'default',
            vibration: true,
            importance: 'high',
            visibility: 1,
            badge: true
        };

        const emergencyChannel = {
            id: 'medsdi_emergency',
            name: 'Alertas SOS MED-SDI',
            description: 'Alertas urgentes de pacientes vinculados',
            sound: 'default',
            vibration: true,
            importance: 'high',
            visibility: 1,
            badge: true
        };

        const restControlChannel = {
            id: 'medsdi_rest_control',
            name: 'Control de reposo MED-SDI',
            description: 'Solicitudes y recordatorios de verificación de reposo',
            sound: 'default',
            vibration: true,
            importance: 'high',
            visibility: 1,
            badge: true
        };

        FirebasexMessaging.createChannel(channel, function () {
            FirebasexMessaging.setDefaultChannel(channel, function () {
                console.log('Canal de seguridad MED-SDI configurado.');
            }, function (error) {
                console.error('No se pudo establecer el canal predeterminado.', error);
            });
        }, function (error) {
            console.error('No se pudo crear el canal MED-SDI.', error);
        });
        FirebasexMessaging.createChannel(messagesChannel, function () {}, function (error) {
            console.error('No se pudo crear el canal de mensajes MED-SDI.', error);
        });
        FirebasexMessaging.createChannel(emergencyChannel, function () {}, function (error) {
            console.error('No se pudo crear el canal SOS MED-SDI.', error);
        });
        FirebasexMessaging.createChannel(restControlChannel, function () {}, function (error) {
            console.error('No se pudo crear el canal de control de reposo.', error);
        });

        FirebasexMessaging.getToken(registrarTokenPush, function (error) {
            console.error('No se pudo obtener el token FCM.', error);
        });
    }, function (error) {
        console.warn('El permiso de notificaciones no fue concedido.', error);
    });

    if (!notificacionesPushInicializadas) {
        FirebasexMessaging.onTokenRefresh(registrarTokenPush, function (error) {
            console.error('Error al renovar el token FCM.', error);
        });
        FirebasexMessaging.onMessageReceived(manejarNotificacionPush, function (error) {
            console.error('Error al recibir una notificación FCM.', error);
        });
        notificacionesPushInicializadas = true;
    }
};
