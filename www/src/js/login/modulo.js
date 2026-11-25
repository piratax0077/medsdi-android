
$(document).on('pageshow', '#login', function() {
    if (typeof actualizarBotonLoginBiometricoApp === 'function') {
        actualizarBotonLoginBiometricoApp();
    }
});

// ---------------------------------------------------------------------------
// Recordar contraseña (opcional: se ofrece con la alerta "Guardar acceso").
// Se guarda únicamente en este dispositivo y se puede olvidar desde Mi perfil.
// cerrarSesion() conserva las claves con prefijo "recordar_login_".
// ---------------------------------------------------------------------------
const RECORDAR_LOGIN_USUARIO = 'recordar_login_usuario';
const RECORDAR_LOGIN_PASS = 'recordar_login_pass';

const codificarLoginRecordado = (texto) => {
    var bytes = new TextEncoder().encode(String(texto));
    return Array.prototype.map.call(bytes, function (b) {
        return b.toString(16).padStart(2, '0');
    }).join('');
};

const decodificarLoginRecordado = (hex) => {
    try {
        if (!hex || hex.length % 2 !== 0 || !/^[a-f0-9]+$/i.test(hex)) return '';
        return new TextDecoder().decode(new Uint8Array(hex.match(/.{2}/g).map(function (h) {
            return parseInt(h, 16);
        })));
    } catch (e) {
        return '';
    }
};

const obtenerLoginRecordado = () => {
    var usuario = $.trim(localStorage.getItem(RECORDAR_LOGIN_USUARIO) || '');
    var pass = decodificarLoginRecordado(localStorage.getItem(RECORDAR_LOGIN_PASS) || '');
    return (usuario !== '' && pass !== '') ? {usuario: usuario, pass: pass} : null;
};

const guardarLoginRecordado = (usuario, pass) => {
    localStorage.setItem(RECORDAR_LOGIN_USUARIO, usuario);
    localStorage.setItem(RECORDAR_LOGIN_PASS, codificarLoginRecordado(pass));
};

const borrarLoginRecordado = () => {
    localStorage.removeItem(RECORDAR_LOGIN_USUARIO);
    localStorage.removeItem(RECORDAR_LOGIN_PASS);
};

// Se pregunta en cada inicio de sesión hasta que el usuario elija "Guardar"
// o "No volver a mostrar" (esto último se puede revertir en Mi perfil).
const RECORDAR_LOGIN_NO_PREGUNTAR = 'recordar_login_no_preguntar';

const preguntarGuardarAcceso = (usuario, pass) => {
    if (typeof confirmarMedsdi !== 'function') return Promise.resolve();
    var noMostrarMas = false;
    return confirmarMedsdi(
        '¿Guardar acceso para próximas sesiones?',
        'Evita ingresar tu contraseña cada vez. Puedes desactivarlo en Mi perfil.',
        {
            icon: undefined, // sin ícono de interrogación
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Ahora no',
            focusCancel: false,
            footer: '<a href="#" class="swal-guardar-acceso-omitir">No volver a mostrar este mensaje</a>',
            customClass: {
                popup: 'swal-medsdi-popup swal-guardar-acceso',
                title: 'swal-medsdi-title swal-guardar-acceso-titulo',
                htmlContainer: 'swal-medsdi-text',
                confirmButton: 'swal-medsdi-confirm',
                cancelButton: 'swal-medsdi-cancel',
                footer: 'swal-guardar-acceso-pie'
            },
            didOpen: function (popup) {
                $(popup).find('.swal-guardar-acceso-omitir').on('click', function (e) {
                    e.preventDefault();
                    noMostrarMas = true;
                    Swal.close();
                });
            }
        }
    ).then(function (guardar) {
        if (guardar) {
            guardarLoginRecordado(usuario, pass);
            localStorage.removeItem(RECORDAR_LOGIN_NO_PREGUNTAR);
        } else if (noMostrarMas) {
            localStorage.setItem(RECORDAR_LOGIN_NO_PREGUNTAR, '1');
        }
    }, function () {});
};

const volverAPreguntarGuardarAcceso = () => {
    localStorage.removeItem(RECORDAR_LOGIN_NO_PREGUNTAR);
    actualizarEstadoRecordarLogin();
    msg('Contraseña recordada', 'La próxima vez que inicies sesión se te preguntará si quieres guardar el acceso.', 'success');
};

const cargarLoginRecordado = () => {
    // La contraseña siempre vuelve a mostrarse oculta.
    $('#pass').attr('type', 'password');
    $('#login .login-ojo').removeClass('activo').attr('aria-label', 'Mostrar contraseña');

    var recordado = obtenerLoginRecordado();
    if (recordado) {
        $('#user').val(recordado.usuario);
        $('#pass').val(recordado.pass);
    }
};

const actualizarEstadoRecordarLogin = () => {
    var recordado = obtenerLoginRecordado();
    $('#perfil_app_recordar_estado').text(recordado
        ? 'Tu contraseña está guardada en este dispositivo para ' + recordado.usuario + '.'
        : 'No hay una contraseña guardada en este dispositivo.');
    $('#perfil_app_recordar_desactivar').toggle(!!recordado);
    $('#perfil_app_recordar_preguntar').toggle(!recordado && localStorage.getItem(RECORDAR_LOGIN_NO_PREGUNTAR) === '1');
};

const olvidarLoginRecordado = () => {
    borrarLoginRecordado();
    $('#pass').val('');
    actualizarEstadoRecordarLogin();
    msg('Contraseña recordada', 'La contraseña ya no se recordará en este dispositivo.', 'success');
};

$(document).on('pageshow', '#login', cargarLoginRecordado);


let loginBloqueoInterval = null;

const formatearTiempoBloqueoLogin = (segundos) => {
    segundos = Math.max(0, parseInt(segundos || 0, 10));
    const minutos = Math.floor(segundos / 60);
    const resto = segundos % 60;
    return String(minutos).padStart(2, '0') + ':' + String(resto).padStart(2, '0');
};

const detenerBloqueoVisualLogin = () => {
    if (loginBloqueoInterval) {
        clearInterval(loginBloqueoInterval);
        loginBloqueoInterval = null;
    }

    const boton = $('#login .login-boton-principal');
    boton.prop('disabled', false).removeClass('login-bloqueado');
    boton.find('span').first().text('Ingresar');
};

const iniciarBloqueoVisualLogin = (segundos) => {
    segundos = Math.max(1, parseInt(segundos || 0, 10));

    if (loginBloqueoInterval) {
        clearInterval(loginBloqueoInterval);
    }

    const boton = $('#login .login-boton-principal');
    boton.prop('disabled', true).addClass('login-bloqueado');

    const actualizar = () => {
        boton.find('span').first().text(
            'Reintentar en ' + formatearTiempoBloqueoLogin(segundos)
        );

        if (segundos <= 0) {
            detenerBloqueoVisualLogin();
            return;
        }

        segundos--;
    };

    actualizar();
    loginBloqueoInterval = setInterval(actualizar, 1000);
};

const ingresarLogin = () => {

    var user = $.trim($('#user').val());
    var pass = $.trim($('#pass').val());

    if(user=='')
    {
        msg('Login','Debe ingresar el usuario','warning');
        $('#user').focus().select();
        return false;
    }

    if(pass=='')
    {
        msg('Login','Debe ingresar el password','warning');
        $('#pass').focus().select();
        return false;
    }

    var datos = {};

    datos.user = user;
    datos.pass = pass;
    datos.device_uuid = typeof obtenerUuidDispositivo === 'function'
        ? obtenerUuidDispositivo()
        : (localStorage.getItem('uuid') || $('#uuid').val() || null);

    cargando(1); 

    const enviarSolicitudLogin = () => {
        var api = new Api("user", "login");
        api.request(
        datos,
        function (resp) {
            if (resp.estado == 1) {
                detenerBloqueoVisualLogin();
                console.log("LOGIN EXITOSO");

                // Guardar el token para usarlo en futuras peticiones
                localStorage.setItem('authToken', resp.token);
                // El estado del dispositivo y los demás GET autenticados de la
                // sesión anterior no son válidos para el token recién emitido.
                if (typeof medsdiClearGetCache === 'function') {
                    medsdiClearGetCache();
                }
                if (resp.device_uuid) {
                    localStorage.setItem('uuid', resp.device_uuid);
                    $('#uuid').val(resp.device_uuid);
                }
                inicializarNotificacionesPush();
                // La contraseña no se conserva salvo que el usuario acepte
                // "Guardar acceso". Si habilita huella, el plugin la
                // protege dentro de Android Keystore.
                localStorage.removeItem('pass');
                var recordadoPrevio = obtenerLoginRecordado();
                sesionUsuarioInit(resp.user);
                $('#pass').val('');
                if (typeof restaurarEstadoBiometricoTrasLogin === 'function') {
                    restaurarEstadoBiometricoTrasLogin();
                }

                if (recordadoPrevio && recordadoPrevio.usuario === user) {
                    // Ya tenía el acceso guardado: se actualiza por si cambió la contraseña.
                    guardarLoginRecordado(user, pass);
                    prepararSeleccionRoles(resp);
                } else if (localStorage.getItem(RECORDAR_LOGIN_NO_PREGUNTAR) === '1') {
                    // Eligió "No volver a mostrar este mensaje".
                    prepararSeleccionRoles(resp);
                } else {
                    preguntarGuardarAcceso(user, pass).then(function () {
                        prepararSeleccionRoles(resp);
                    });
                }
            } else {
                if (resp.bloqueado) {
                    const segundos = parseInt(resp.segundos_restantes || 900, 10);

                    iniciarBloqueoVisualLogin(segundos);

                    msg(
                        'Acceso temporalmente bloqueado',
                        (resp.msj || 'Has alcanzado el máximo de intentos.') +
                        ' Podrás volver a intentar en ' +
                        Math.max(1, Math.ceil(segundos / 60)) +
                        ' minuto(s).',
                        'error'
                    );
                } else if (typeof resp.intentos_restantes !== 'undefined') {
                    const restantes = parseInt(resp.intentos_restantes, 10);

                    msg(
                        'Login',
                        resp.msj || (
                            restantes === 1
                                ? 'Usuario o contraseña incorrectos. Te queda 1 intento.'
                                : 'Usuario o contraseña incorrectos. Te quedan ' + restantes + ' intentos.'
                        ),
                        'error'
                    );
                } else {
                    msg(
                        'Login',
                        resp.msj || 'No se encontró el usuario o password incorrecto, vuelva a intentarlo.',
                        'error'
                    );
                }
            }
            cargando(0); 

        },
        function (resp, status, error) {
            cargando(0);

            var httpStatus = resp && typeof resp.status !== 'undefined' ? resp.status : 0;
            var responseText = resp && resp.responseText ? resp.responseText : '';

            console.error('ERROR LOGIN MEDSDI', {
                status: httpStatus,
                responseText: responseText,
                ajaxStatus: status || '',
                error: error || '',
                backend: (typeof MEDSDI_WEB_URL !== 'undefined' ? MEDSDI_WEB_URL : '')
            });

            var detalle = httpStatus
                ? 'Error de conexión (HTTP ' + httpStatus + ')'
                : 'Error de conexión con Cloud. Revisa Internet o la consola de la app.';

            msg('Login', detalle, 'error');
        },
            "POST");
    };

    // El token FCM identifica al teléfono previamente vinculado.
    const esCordovaBrowser = typeof cordova !== 'undefined' && cordova.platformId === 'browser';
    if (!esCordovaBrowser && typeof FirebasexMessaging !== 'undefined') {
        FirebasexMessaging.getToken(function (deviceToken) {
            datos.device_token = deviceToken;
            enviarSolicitudLogin();
        }, function () {
            enviarSolicitudLogin();
        });
    } else {
        enviarSolicitudLogin();
    }
}

const prepararSeleccionRoles = (respuesta) => {
    const roles = (respuesta.roles || []).map(function (rol) {
        return rol.name;
    }).filter(function (nombre) {
        return nombre === 'Paciente' || nombre === 'Profesional';
    });

    localStorage.setItem('rolesDisponibles', JSON.stringify(roles));
    localStorage.setItem('perfilPaciente', JSON.stringify(respuesta.paciente || null));
    localStorage.setItem('perfilProfesional', JSON.stringify(respuesta.profesional || null));

    if (!roles.length) {
        localStorage.removeItem('authToken');
        msg('Acceso', 'Esta cuenta no posee un perfil Paciente o Profesional habilitado.', 'warning');
        return;
    }

    if (roles.length === 1) {
        $('.selector-multiple-roles').hide();
        seleccionarRolApp(roles[0]);
        return;
    }

    $('.selector-multiple-roles').show();
    renderizarSelectorRoles(roles);
    vista('seleccionar-rol', 'fade');
};

// Iconos de ingreso por rol (imágenes SVG del proyecto).
const ICONOS_ROL = {
    Profesional: '<img src="src/images/ingreso/profesional.svg" alt="">',
    Paciente: '<img src="src/images/ingreso/paciente.svg" alt="">'
};

const renderizarSelectorRoles = (roles) => {
    const html = roles.map(function (rol) {
        const icono = ICONOS_ROL[rol] || ICONOS_ROL.Paciente;
        return '<button type="button" class="selector-rol-card" onclick="seleccionarRolApp(\'' + rol + '\')">' +
            '<span class="selector-rol-icono">' + icono + '</span>' +
            '<span class="selector-rol-titulo">Ingresar como ' + rol + '</span>' +
            '</button>';
    }).join('');

    $('#roles-disponibles').html(html);
};

const seleccionarRolApp = (rol) => {
    let roles = [];
    try {
        roles = JSON.parse(localStorage.getItem('rolesDisponibles') || '[]');
    } catch (error) {
        roles = [];
    }

    if (roles.indexOf(rol) === -1) {
        msg('Acceso', 'El perfil seleccionado no está disponible para esta cuenta.', 'error');
        return;
    }

    localStorage.setItem('rolActivo', rol);
    aplicarPerfilActivo(rol);
    vista(rol === 'Profesional' ? 'inicio-profesional' : 'index', 'fade');
    const esCordovaBrowser = typeof cordova !== 'undefined' && cordova.platformId === 'browser';
    if (esCordovaBrowser && typeof checkDevice === 'function') {
        setTimeout(function () { checkDevice(); }, 50);
    }

    if (localStorage.getItem('mensajePendiente') === '1') {
        localStorage.removeItem('mensajePendiente');
        setTimeout(function () {
            abrirMensajesApp();
        }, 300);
    } else if (localStorage.getItem('desafioAccesoPendiente') === '1') {
        localStorage.removeItem('desafioAccesoPendiente');
        setTimeout(function () {
            abrirDesafiosAcceso();
        }, 300);
    } else if (localStorage.getItem('autorizacionPendiente') === '1') {
        localStorage.removeItem('autorizacionPendiente');
        setTimeout(function () {
            vista('autorizaciones_sdi', 'fade');
        }, 300);
    }
};

const volverASeleccionRoles = () => {
    let roles = [];
    try {
        roles = JSON.parse(localStorage.getItem('rolesDisponibles') || '[]');
    } catch (error) {
        roles = [];
    }

    if (roles.length < 2) {
        return;
    }

    renderizarSelectorRoles(roles);
    vista('seleccionar-rol', 'fade');
};

const aplicarPerfilActivo = (rol) => {
    let perfil = null;
    try {
        perfil = JSON.parse(localStorage.getItem(
            rol === 'Profesional' ? 'perfilProfesional' : 'perfilPaciente'
        ) || 'null');
    } catch (error) {
        perfil = null;
    }

    // Evita reutilizar la imagen del rol anterior o de una sesión previa.
    localStorage.removeItem('foto_perfil');
    localStorage.removeItem('foto_perfil_url');

    if (perfil) {
        const nombre = rol === 'Profesional'
            ? [perfil.nombre, perfil.apellido_uno].filter(Boolean).join(' ')
            : [perfil.nombres, perfil.apellido_uno].filter(Boolean).join(' ');

        if (nombre) localStorage.setItem('nombre', nombre);
        if (perfil.foto_perfil) {
            localStorage.setItem('foto_perfil', perfil.foto_perfil);
            localStorage.setItem('foto_perfil_url', perfil.foto_perfil_url || '');
        }
        if (perfil.sexo) localStorage.setItem('sexo', perfil.sexo);
    }

    actualizarHeaderUsuario();
    $('.rol-activo-label').text(rol);

    // Los desafíos 2FA pertenecen al usuario, tanto Paciente como Profesional.
    $('.acceso-solo-profesional').show();
    $('#contenedor-citas').removeClass('col-xs-12').addClass('col-xs-6');
};


const recuperarContrasena = () =>{

    var texto1 = 'Para recuperar tu contraseña debes ingresar tu correo';    
    $('#texto-recuperar').html(`<span class="size12 fade-in">${texto1}</span>`);

    var html = `
    <div class="col-xs-1"></div>
    <div class="col-xs-10">
        <div class="col-xs-12 mt15">
            <!--<p class="size16 color-gris opacity0-5">Ingrese su Rut</p>-->
            <input type="text" class="input-app size16 color-gris col-xs-12 icon-3" placeholder="RUT(Ej:123456789)" id="rut">
        </div>
        <div class="col-xs-12 mt15">
        <!--<p class="size16 color-gris opacity0-5">Ingrese su correo</p>-->
        <input type="text" class="input-app size16 color-gris col-xs-12 icon-1" placeholder="Correo" id="correo">
    </div>
    </div>
    `;

    $('#cont_i_form').html(html);


    var html2 = `
    <div class="col-xs-6 padding0">
        <div class="btn-app-2 color-blanco size12 pt15 pb15 lineh3 center-block" onclick="volverLogin()">VOLVER</div>
    </div>
    <div class="col-xs-6 padding0">
        <div class="btn-app-1 color-blanco pt15 pb15 size12 lineh3 text-uppercase" onclick="recuperarPassword()">Recuperar</div>
    </div>
    `;

    $('#cont_btn_form').html(html2);


    var block_hide =  ['cont_i_login','cont_o_contrasena'];
    var block_show = ['cont_i_form','cont_btn_form','cont_btn_registrar'];
    showHiddenBlock(block_hide,block_show);
}


const volverLogin = () => {

    var texto1 = '¡BIENVENIDO!';
    var texto2 = 'A SDI APP DESARROLLO';
    $('#texto-recuperar').html(`<span class="size20 fade-in">${texto1}</span><br><span class="size14 fade-in">${texto2}</span>`);

    var block_hide = ['cont_i_form','cont_btn_form'];
    var block_show =  ['cont_i_login','cont_o_contrasena','cont_btn_registrar'];
    showHiddenBlock(block_hide,block_show);
}

const registrarUsuario = () =>{
    var texto1 = 'Debe llenar todos los datos para registrar el usuario';    
    $('#texto-recuperar').html(`<span class="size12 fade-in">${texto1}</span>`);


    var html = `
    <div class="col-xs-1"></div>
    <div class="col-xs-10">
        <div class="col-xs-12 mt15">
            <p class="size16 color-blanco opacity0-5">Rut</p>
            <input type="text" class="input-app size20 color-blanco col-xs-12" id="rut_r">
        </div>
        <div class="col-xs-12 mt15">
            <p class="size16 color-blanco opacity0-5">Ingrese su correo</p>
            <input type="text" class="input-app size20 color-blanco col-xs-12" id="correo_r">
        </div>
        <div class="col-xs-12 mt15">
            <p class="size16 color-blanco opacity0-5">User</p>
            <input type="text" class="input-app size20 color-blanco col-xs-12" id="user_r">
        </div>
        <div class="col-xs-12 mt15">
            <p class="size16 color-blanco opacity0-5">Pass</p>
            <input type="password" class="input-app size20 color-blanco col-xs-12" id="pass_r">
        </div>
    </div>
    `;

    $('#cont_i_form').html(html);


    var html2 = `
            <div class="col-xs-6 pl5 pr5">
                <div class="btn-app2 color-blanco size12 pt15 pb15 opacity0-5 center-block" onclick="volverLogin()">VOLVER</div>
            </div>
            <div class="col-xs-6">
                <div class="btn-app1 pt15 pb15 size12 text-uppercase" onclick="">Registrar</div>
            </div>
    `;

    $('#cont_btn_form').html(html2);

    var block_hide =  ['cont_i_login','cont_o_contrasena','cont_btn_registrar'];
    var block_show = ['cont_i_form','cont_btn_form'];
    showHiddenBlock(block_hide,block_show);

}


const recuperarPassword = () =>{
    var rut = $.trim($('#rut').val());
    var correo = $.trim($('#correo').val());

    if(!Rut(rut))
    {
        //msg('Login','Debe ingresar un rut valido','warning');
        $('#rut').focus().select();
        return false;
    }

    if(correo=='')
    {
        msg('Login','Debe ingresar un correo valido','warning');
        $('#correo').focus().select();
        return false;
    }

    var datos = {};

    datos.rut = rut;
    datos.email = correo;

    cargando(1); 

    var api = new Api("usuario", "recuperar_contrasena");
    api.request(
        datos,
        function (resp) {
            
            if (resp.estado == 1) {

                msg('aviso','Se enviara a su correo con su nueva contraseña temporal','success');
                volverLogin();
                
            } else {                
                msg('Login', 'No se encontro el usuario, vuelva a intentarlo.', 'error');
            }
            cargando(0); 

        },
        function (resp) { 
            cargando(0); 
            console.log(resp);        
            msg('Login', 'Error de conexión', 'error');
        },
        "POST");
}


/* ===================== RECUPERAR CONTRASEÑA ===================== */

let recuperarEnviando = false;

const cambiarPanelLogin = (mostrar, ocultar) => {
    $(ocultar).hide();
    $(mostrar).stop(true, true).fadeIn(180);
    $('html, body').scrollTop(0);
};

const mostrarRecuperarContrasena = () => {
    // Si el usuario ya escribió su correo en el login, se reutiliza.
    const emailLogin = $.trim($('#user').val());
    if (emailLogin !== '' && $.trim($('#recuperar_email').val()) === '') {
        $('#recuperar_email').val(emailLogin);
    }

    $('#recuperar_enviado').hide();
    $('#recuperar_formulario').show();
    cambiarPanelLogin('#cont_i_recuperar', '#cont_i_login');
    setTimeout(function () { $('#recuperar_email').focus(); }, 200);
};

const volverLoginDesdeRecuperar = () => {
    const email = $.trim($('#recuperar_email').val());
    if (email !== '' && $.trim($('#user').val()) === '') {
        $('#user').val(email);
    }
    cambiarPanelLogin('#cont_i_login', '#cont_i_recuperar');
};

const reintentarRecuperarContrasena = () => {
    $('#recuperar_enviado').hide();
    $('#recuperar_formulario').stop(true, true).fadeIn(180);
};

const validarEmailRecuperar = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

const enviarRecuperarContrasena = () => {
    if (recuperarEnviando) return false;

    const email = $.trim($('#recuperar_email').val()).toLowerCase();

    if (email === '') {
        msg('Recuperar contraseña', 'Debe ingresar el correo electrónico de su cuenta', 'warning');
        $('#recuperar_email').focus();
        return false;
    }

    if (!validarEmailRecuperar(email)) {
        msg('Recuperar contraseña', 'El correo electrónico ingresado no es válido', 'warning');
        $('#recuperar_email').focus().select();
        return false;
    }

    const boton = $('#recuperar_boton');
    recuperarEnviando = true;
    boton.prop('disabled', true);
    cargando(1);

    const finalizar = () => {
        recuperarEnviando = false;
        boton.prop('disabled', false);
        cargando(0);
    };

    const api = new Api('user', 'recuperar_contrasena');
    api.request(
        { email: email },
        function (resp) {
            finalizar();

            if (resp && resp.estado == 1) {
                $('#recuperar_email_enviado').text(email);
                $('#recuperar_formulario').hide();
                $('#recuperar_enviado').stop(true, true).fadeIn(180);
                return;
            }

            msg(
                'Recuperar contraseña',
                (resp && resp.msj) || 'No fue posible enviar el correo de recuperación. Intente nuevamente.',
                'error'
            );
        },
        function (resp) {
            finalizar();
            const httpStatus = resp && typeof resp.status !== 'undefined' ? resp.status : 0;
            const respJson = resp && resp.responseJSON ? resp.responseJSON : null;

            if (httpStatus === 429) {
                msg('Recuperar contraseña', 'Has realizado demasiadas solicitudes. Espera unos minutos e intenta nuevamente.', 'warning');
                return;
            }

            msg(
                'Recuperar contraseña',
                (respJson && respJson.msj) || (httpStatus
                    ? 'Error de conexión (HTTP ' + httpStatus + ')'
                    : 'Error de conexión. Revisa tu conexión a Internet e intenta nuevamente.'),
                'error'
            );
        },
        'POST'
    );
};

$(document).on('keydown', '#recuperar_email', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        enviarRecuperarContrasena();
    }
});

$(document).on('keydown', '#login .login-recuperar', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        $(this).trigger('click');
    }
});

// Al volver a la página de login siempre se muestra el formulario de ingreso.
$(document).on('pagebeforeshow', '#login', function () {
    $('#cont_i_recuperar').hide();
    $('#cont_i_login').show();
});
