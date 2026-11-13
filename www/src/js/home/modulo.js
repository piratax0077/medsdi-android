var svg_receta = '<svg style="width: 40px;" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" xmlns:xlink="http://www.w3.org/1999/xlink" enable-background="new 0 0 512 512"> <g> <g> <g> <path d="m208,177.2h27.7v26.2c0,11.3 9.1,20.4 20.4,20.4 11.3,0 20.4-9.1 20.4-20.4v-26.2h27.7c11.3,0 20.4-9.1 20.4-20.4 0-11.3-9.1-20.4-20.4-20.4h-27.7v-26.2c0-11.3-9.1-20.4-20.4-20.4-11.3,0-20.4,9.1-20.4,20.4v26.2h-27.7c-11.3,0-20.4,9.1-20.4,20.4 0,11.3 9.2,20.4 20.4,20.4z"/> <path d="M440.5,10.8H71.8c-11.3,0-20.4,9.1-20.4,20.4v449.2c0,11.3,9.1,20.4,20.4,20.4h368.7c11.3,0,20.4-9.1,20.4-20.4V31.2 C460.9,20,451.8,10.8,440.5,10.8z M420.1,460H92.2V51.7h327.9V460z"/> <path d="m157.3,318h197.6c11.3,0 20.4-9.1 20.4-20.4 0-11.3-9.1-20.4-20.4-20.4h-197.6c-11.3,0-20.4,9.1-20.4,20.4 0,11.2 9.1,20.4 20.4,20.4z"/> <path d="m157.3,409.6h197.6c11.3,0 20.4-9.1 20.4-20.4 0-11.3-9.1-20.4-20.4-20.4h-197.6c-11.3,0-20.4,9.1-20.4,20.4 0,11.2 9.1,20.4 20.4,20.4z"/> </g> </g> </g></svg>';


/* =========================================================
   SweetAlert2 MED-SDI
   Funciones reutilizables para toda la aplicación.
   Si SweetAlert2 no carga, se usa confirm/alert del navegador.
   ========================================================= */

const swalMedsdi = (titulo, mensaje, tipo, opciones) => {
    tipo = tipo || 'info';
    opciones = opciones || {};

    if (typeof Swal === 'undefined') {
        window.alert((titulo ? titulo + '\n\n' : '') + (mensaje || ''));
        return Promise.resolve({isConfirmed: true});
    }

    return Swal.fire(Object.assign({
        title: titulo || 'MED-SDI',
        text: mensaje || '',
        icon: tipo,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#1450bd',
        buttonsStyling: true,
        heightAuto: false,
        allowOutsideClick: false,
        customClass: {
            popup: 'swal-medsdi-popup',
            title: 'swal-medsdi-title',
            htmlContainer: 'swal-medsdi-text',
            confirmButton: 'swal-medsdi-confirm',
            cancelButton: 'swal-medsdi-cancel'
        }
    }, opciones));
};

const confirmarMedsdi = (titulo, mensaje, opciones) => {
    opciones = opciones || {};

    if (typeof Swal === 'undefined') {
        return Promise.resolve(window.confirm((titulo ? titulo + '\n\n' : '') + (mensaje || '')));
    }

    return Swal.fire(Object.assign({
        title: titulo || 'Confirmar',
        text: mensaje || '',
        icon: opciones.icon || 'question',
        showCancelButton: true,
        confirmButtonText: opciones.confirmButtonText || 'Confirmar',
        cancelButtonText: opciones.cancelButtonText || 'Cancelar',
        confirmButtonColor: opciones.confirmButtonColor || '#1450bd',
        cancelButtonColor: opciones.cancelButtonColor || '#7b8a9a',
        reverseButtons: true,
        focusCancel: true,
        heightAuto: false,
        allowOutsideClick: false,
        allowEscapeKey: true,
        customClass: {
            popup: 'swal-medsdi-popup',
            title: 'swal-medsdi-title',
            htmlContainer: 'swal-medsdi-text',
            confirmButton: 'swal-medsdi-confirm',
            cancelButton: 'swal-medsdi-cancel'
        }
    }, opciones)).then(function(resultado) {
        return !!resultado.isConfirmed;
    });
};


$(document).on("pageshow", "#home", function () {
    // La verificación del equipo se reutiliza durante varios minutos.
    // No cargamos recetas automáticamente desde el home.
    if (typeof checkDevice === 'function') {
        checkDevice(null, true);
    }
});

$(document).on('pageshow', '#index, #inicio-profesional', function () {
    if (typeof checkDevice !== 'function') {
        return;
    }

    checkDevice(function (deviceReady) {
        if (!deviceReady) {
            return;
        }

        console.log(
            'Dispositivo verificado. Emergency token:',
            localStorage.getItem('emergencyToken') ? 'OK' : 'NO DISPONIBLE'
        );
    }, true);
});

var homeResumenTimer = null;

const fechaIsoCita = (hora) => String(hora && hora.fecha_consulta || '').slice(0, 10);

// Estados de horas_medicas (tabla parametros, referencia Agenda_Estado) que
// corresponden a horas anuladas/canceladas y no deben mostrarse ni contarse:
// 3 = Rechazada (la usa "Anular hora" del paciente), 14 = Bloqueo anulado,
// 13 = Bloqueo por profesional, 15 = Hora anulada por profesional.
// También se descarta por el nombre del estado.
const ESTADOS_HORA_ANULADA = [3, 13, 14, 15];

const esHoraAnulada = (hora) => {
    if (!hora) return true;
    if (ESTADOS_HORA_ANULADA.indexOf(Number(hora.id_estado)) !== -1) return true;
    return /anulad|cancelad|rechazad/i.test(String(hora.estado || ''));
};

const horasVigentes = (horas) => (Array.isArray(horas) ? horas : []).filter(function(hora) {
    return !esHoraAnulada(hora);
});

const fechaCortaHome = (iso) => {
    var p = String(iso).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso;
};

const construirSlidesHome = (horas) => {
    var hoy = new Date();
    var hoyIso = hoy.getFullYear() + '-' + ('0' + (hoy.getMonth() + 1)).slice(-2) + '-' + ('0' + hoy.getDate()).slice(-2);

    var vigentes = horasVigentes(horas).filter(function(h) {
        return [1, 2].indexOf(Number(h.id_estado)) !== -1 && fechaIsoCita(h) >= hoyIso;
    }).sort(function(a, b) {
        return (fechaIsoCita(a) + (a.hora_inicio || '')).localeCompare(fechaIsoCita(b) + (b.hora_inicio || ''));
    });

    var deHoy = vigentes.filter(function(h) { return fechaIsoCita(h) === hoyIso; });
    var porConfirmar = vigentes.filter(function(h) { return Number(h.id_estado) === 1; });
    var proxima = vigentes.filter(function(h) { return Number(h.id_estado) === 2; })[0];
    var profesional = function(h) {
        return escaparTextoConsentimiento(((h.nombre_profesional || '') + ' ' + (h.apellido_uno_profesional || '')).trim());
    };

    var slideHoy = {
        kicker: 'Hoy · ' + fechaCortaHome(hoyIso),
        titulo: 'No tienes citas agendadas',
        accion: { texto: 'Agendar', onclick: "vista('pedirhora')" }
    };
    if (deHoy.length === 1) {
        slideHoy.titulo = 'Tienes una cita hoy';
        slideHoy.texto = (deHoy[0].hora_inicio || '') + (profesional(deHoy[0]) ? ' · ' + profesional(deHoy[0]) : '');
        slideHoy.accion = { texto: 'Ver', onclick: "vista('citas'); solicitarMisHorasMedicas();" };
    } else if (deHoy.length > 1) {
        slideHoy.titulo = 'Tienes ' + deHoy.length + ' citas hoy';
        slideHoy.texto = 'La primera es a las ' + (deHoy[0].hora_inicio || '');
        slideHoy.accion = { texto: 'Ver', onclick: "vista('citas'); solicitarMisHorasMedicas();" };
    }

    var slideConfirmar;
    if (porConfirmar.length) {
        slideConfirmar = {
            kicker: 'Por confirmar · ' + fechaCortaHome(fechaIsoCita(porConfirmar[0])) + ' · ' + (porConfirmar[0].hora_inicio || ''),
            titulo: porConfirmar.length === 1
                ? 'Tienes una hora agendada, confírmala'
                : 'Tienes ' + porConfirmar.length + ' horas agendadas, confírmalas',
            accion: { texto: 'Confirmar', onclick: "vista('citas'); solicitarMisHorasMedicas();" }
        };
    } else if (proxima) {
        slideConfirmar = {
            kicker: 'Tu próxima cita',
            titulo: fechaCortaHome(fechaIsoCita(proxima)) + ' · ' + (proxima.hora_inicio || ''),
            texto: profesional(proxima),
            accion: { texto: 'Ver', onclick: "vista('citas'); solicitarMisHorasMedicas();" }
        };
    } else {
        slideConfirmar = {
            kicker: 'Tu próxima cita',
            titulo: 'Agenda tu próxima hora',
            accion: { texto: 'Agendar', onclick: "vista('pedirhora')" }
        };
    }

    var slideInfo = {
        kicker: 'Para ti',
        titulo: 'Tu ficha médica al día',
        accion: { texto: 'Ver ficha', onclick: "vista('fmu_paciente'); solicitarFmu()" }
    };

    return [slideHoy, slideConfirmar, slideInfo];
};

const hoyIsoHome = () => {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
};

const construirSlidesProfesional = (agenda, pendientes) => {
    var hoyIso = hoyIsoHome();
    var ahora = new Date();
    var horaActual = ('0' + ahora.getHours()).slice(-2) + ':' + ('0' + ahora.getMinutes()).slice(-2);

    var atenciones = horasVigentes(agenda).sort(function(a, b) {
        return String(a.hora_inicio || '').localeCompare(String(b.hora_inicio || ''));
    });
    var proxima = atenciones.filter(function(h) {
        return String(h.hora_inicio || '').slice(0, 5) >= horaActual;
    })[0];
    var telemedicina = atenciones.filter(function(h) { return h.es_telemedicina; }).length;

    var slideHoy = {
        kicker: 'Hoy · ' + fechaCortaHome(hoyIso),
        titulo: 'No tienes atenciones hoy',
        accion: { texto: 'Ver agenda', onclick: "vista('agenda-profesional'); cargarAgendaProfesional()" }
    };
    if (proxima) {
        slideHoy.titulo = 'Próxima atención ' + escaparTextoConsentimiento(String(proxima.hora_inicio).slice(0, 5)) +
            (proxima.lugar ? ' en ' + escaparTextoConsentimiento(proxima.lugar) : '');
    } else if (atenciones.length) {
        slideHoy.titulo = 'No te quedan más atenciones hoy';
    }

    var slideSolicitudes = {
        kicker: 'Autorizaciones',
        titulo: 'Tienes ' + pendientes + (pendientes === 1 ? ' autorización' : ' autorizaciones') + ' por aprobar',
        accion: { texto: 'Revisar', onclick: "vista('autorizaciones_sdi')" }
    };

    var slideAgenda = {
        kicker: 'Tu agenda de hoy',
        titulo: atenciones.length === 1 ? '1 atención agendada' : atenciones.length + ' atenciones agendadas',
        accion: { texto: 'Mis pacientes', onclick: 'abrirMisPacientesProfesional()' }
    };
    if (telemedicina) {
        slideAgenda.texto = telemedicina + ' por telemedicina';
    }

    return [slideHoy, slideSolicitudes, slideAgenda];
};

const raizResumenActiva = () => $('.ui-page-active .home-resumen').first();

const mostrarSlideHome = (indice, $raiz) => {
    $raiz = $raiz && $raiz.length ? $raiz : raizResumenActiva();
    var $slides = $raiz.find('.home-resumen-slide');
    if (!$slides.length) return;
    indice = (indice + $slides.length) % $slides.length;

    var $anterior = $slides.filter('.activo');
    if ($anterior.length && $anterior.index() !== indice) {
        $anterior.removeClass('activo').addClass('saliendo');
        setTimeout(function() { $anterior.removeClass('saliendo'); }, 520);
    }
    $slides.eq(indice).addClass('activo').removeClass('saliendo');
    $raiz.find('.home-resumen-puntos button').removeClass('activo').eq(indice).addClass('activo');
    $raiz.data('indice', indice);
};

const detenerRotacionHome = () => {
    if (homeResumenTimer) {
        clearInterval(homeResumenTimer);
        homeResumenTimer = null;
    }
};

const iniciarRotacionHome = () => {
    detenerRotacionHome();
    homeResumenTimer = setInterval(function() {
        var $raiz = raizResumenActiva();
        if ($raiz.length) {
            mostrarSlideHome(($raiz.data('indice') || 0) + 1, $raiz);
        }
    }, 5500);
};

const renderizarResumenHome = (slides, $raiz) => {
    $raiz.find('.home-resumen-pista').html(slides.map(function(s, i) {
        return '<article class="home-resumen-slide' + (i === 0 ? ' activo' : '') + '">' +
            '<div class="home-resumen-texto">' +
                '<span class="home-resumen-kicker">' + s.kicker + '</span>' +
                '<strong>' + s.titulo + '</strong>' +
                (s.texto ? '<p>' + s.texto + '</p>' : '') +
            '</div>' +
            (s.accion ? '<button type="button" data-role="none" class="home-resumen-accion" onclick="' + s.accion.onclick + '">' + s.accion.texto + '</button>' : '') +
            '</article>';
    }).join(''));
    $raiz.find('.home-resumen-puntos').html(slides.map(function(s, i) {
        return '<button type="button" data-role="none" aria-label="Ir al aviso ' + (i + 1) + '" data-indice="' + i + '"' + (i === 0 ? ' class="activo"' : '') + '></button>';
    }).join(''));
    $raiz.data('indice', 0);
    iniciarRotacionHome();
};

// Se consulta sin el loader global: es información de apoyo del home.
const consultarSinLoader = (ruta, datos, alExito) => {
    $.ajax({
        type: 'GET',
        url: MEDSDI_API_URL + ruta,
        data: datos,
        dataType: 'json',
        headers: { 'Accept': 'application/json', 'X-Auth-Token': localStorage.getItem('authToken') },
        timeout: 15000,
        success: alExito
    });
};

const cargarResumenHome = () => {
    var $raiz = $('#index .home-resumen');
    renderizarResumenHome(construirSlidesHome([]), $raiz);

    if (!localStorage.getItem('authToken') || localStorage.getItem('rolActivo') === 'Profesional') return;

    consultarSinLoader('/paciente/agenda', { id_paciente: _SESSION('id_usuario') }, function(resp) {
        if (resp && resp.estado == 1 && Array.isArray(resp.horas)) {
            renderizarResumenHome(construirSlidesHome(resp.horas), $raiz);
        }
    });
};

const cargarResumenProfesional = () => {
    var $raiz = $('#inicio-profesional .home-resumen');
    var datos = { agenda: [], pendientes: 0 };
    var pintar = function() {
        renderizarResumenHome(construirSlidesProfesional(datos.agenda, datos.pendientes), $raiz);
    };
    pintar();

    if (!localStorage.getItem('authToken') || localStorage.getItem('rolActivo') !== 'Profesional') return;

    consultarSinLoader('/profesional/agenda', { id_lugar_atencion: '', fecha: hoyIsoHome() }, function(resp) {
        datos.agenda = resp && Array.isArray(resp.registros) ? resp.registros : [];
        pintar();
    });

    consultarSinLoader('/mobile-authorization/requests', {}, function(resp) {
        var registros = resp && resp.estado == 1 && Array.isArray(resp.registros) ? resp.registros : [];
        datos.pendientes = registros.filter(function(r) { return Number(r.estado) === 0; }).length;
        pintar();
    });
};

$(document).on('pageshow', '#index', cargarResumenHome);
$(document).on('pageshow', '#inicio-profesional', cargarResumenProfesional);
$(document).on('pagehide', '#index, #inicio-profesional', detenerRotacionHome);

$(document).on('click', '.home-resumen-puntos button', function() {
    mostrarSlideHome(Number($(this).data('indice')), $(this).closest('.home-resumen'));
    iniciarRotacionHome();
});

(function() {
    var inicioX = null;
    $(document).on('touchstart', '.home-resumen', function(ev) {
        inicioX = ev.originalEvent.touches[0].clientX;
        detenerRotacionHome();
    });
    $(document).on('touchend', '.home-resumen', function(ev) {
        if (inicioX !== null) {
            var dx = ev.originalEvent.changedTouches[0].clientX - inicioX;
            var $raiz = $(this);
            if (Math.abs(dx) > 40) mostrarSlideHome(($raiz.data('indice') || 0) + (dx < 0 ? 1 : -1), $raiz);
        }
        inicioX = null;
        iniciarRotacionHome();
    });
})();

$(document).on('pageshow', '#certificadosro', function() {
    list_consentimientos();
});

$(document).on('pageshow', '#recetasro', function() {
    list_recetas_paciente();
});

$(document).on('pageshow', '#examenesro', function() {
    list_examenes_paciente();
});

$(document).on('click', '.js-ver-consentimiento', function() {
    abrirConsentimiento($(this).attr('data-consentimiento-url'));
});

$(document).on('click', '.js-ver-receta', function() {
    abrirConsentimiento($(this).attr('data-receta-url'));
});

$(document).on('click', '.js-ver-examen', function() {
    abrirDocumentoClinico($(this).attr('data-examen-url'), 'examen');
});

$(document).on("pageshow", "#autorizaciones_sdi", function () {
    configurarFooterAutorizaciones();

    // La primera vista prioriza las solicitudes que requieren acción.
    if (!autorizacionesFiltroActivo) {
        autorizacionesFiltroActivo = 'pendientes';
    }

    // Primero verificamos el dispositivo. Solo si está OK cargamos autorizaciones.
    checkDevice(function (deviceReady) {
        if (!deviceReady) {
            return;
        }

        // Fuerza una recarga al entrar, pero manteniendo protección
        // contra solicitudes simultáneas.
        list_log_device();
    }, true);
});

$(document).on('pagehide', '#autorizaciones_sdi', function () {
    // Solo liberamos la lista pesada. El detalle pertenece a otra página.
    $('#list_log_reg').empty();
});

const volverInicioSegunRol = () => {
    const rolActivo = localStorage.getItem('rolActivo');
    vista(rolActivo === 'Profesional' ? 'inicio-profesional' : 'index', 'fade');
};

// Menú inferior único de las pantallas interiores, según el rol activo.
const PAGINAS_SIN_MENU_INFERIOR = ['login', 'seleccionar-rol', 'index', 'inicio-profesional', 'autorizado', 'rechazado', 'log-secundario'];

const menuInferiorHtml = (profesional) => {
    var item = function(onclick, icono, texto) {
        return '<div class="col-xs-4 pt10 pb10 text-center">' +
            '<p class="color-blanco size12" onclick="' + onclick + '"><img class="mb10" width="20" src="src/images/' + icono + '"><br>' + texto + '</p>' +
            '</div>';
    };
    return '<div class="row bg-azul">' +
        item(profesional ? "vista('inicio-profesional')" : "vista('index')", 'home.svg', 'Inicio') +
        (profesional
            ? item("vista('agenda-profesional'); cargarAgendaProfesional()", 'citas.svg', 'Agenda')
            : item("vista('citas'); solicitarMisHorasMedicas()", 'citas.svg', 'Citas')) +
        item('cerrarSesion()', 'salir.svg', 'Cerrar sesión') +
        '</div>';
};

$(document).on('pagebeforeshow', '[data-role="page"]', function() {
    var $pagina = $(this);
    if (PAGINAS_SIN_MENU_INFERIOR.indexOf($pagina.attr('id')) !== -1) return;

    var $menu = $pagina.children('.menu-inferior');
    if (!$menu.length) {
        $menu = $('<div class="footer menu-inferior"></div>').appendTo($pagina);
        $pagina.addClass('con-menu-inferior');
    }
    $menu.html(menuInferiorHtml(localStorage.getItem('rolActivo') === 'Profesional'));
});

// Con el teclado abierto el menú inferior se oculta: así no queda flotando sobre el teclado ni deja huecos.
$(document).on('focusin', 'input:not([type=checkbox]):not([type=radio]):not([type=button]), textarea', function() {
    $('body').addClass('teclado-abierto');
});

$(document).on('focusout', 'input, textarea', function() {
    $('body').removeClass('teclado-abierto');
});

const toggleMenuPerfil = (event) => {
    if (event) event.stopPropagation();
    $('.header-notificaciones-caja').removeClass('abierto');
    var $menu = $(event.currentTarget).closest('.header-menu-perfil');
    $('.header-menu-perfil').not($menu).removeClass('abierto');
    $menu.toggleClass('abierto');
};

const toggleNotificaciones = (event) => {
    if (event) event.stopPropagation();
    var $caja = $(event.currentTarget).closest('.header-notificaciones-caja');
    $('.header-menu-perfil').removeClass('abierto');
    $('.header-notificaciones-caja').not($caja).removeClass('abierto');
    $caja.toggleClass('abierto');
};

$(document).on('click', function() {
    $('.header-menu-perfil').removeClass('abierto');
    $('.header-notificaciones-caja').removeClass('abierto');
});

// Mi perfil: botón "ojo" para mostrar u ocultar una clave.
const verClavePerfil = (id, boton) => {
    var $input = $('#' + id);
    var mostrar = $input.attr('type') === 'password';
    $input.attr('type', mostrar ? 'text' : 'password');
    $(boton).toggleClass('activo', mostrar).attr('aria-label', mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña');
};

// Mi perfil: lista de opciones y vistas internas (solo interfaz).
const mostrarVistaPerfilApp = (vista) => {
    $('.perfil-app-form').attr('data-vista', vista);
    window.scrollTo(0, 0);
};

const volverPerfilApp = () => {
    if ($('.perfil-app-form').attr('data-vista') !== 'menu') {
        cancelarFotoAjustada();
        mostrarVistaPerfilApp('menu');
        return;
    }
    volverInicioSegunRol();
};

const abrirEditarPerfil = () => {
    $('.header-menu-perfil').removeClass('abierto');
    $('.perfil-app-form').attr('data-vista', 'menu');
    var rol = localStorage.getItem('rolActivo') === 'Profesional'
        ? 'Profesional'
        : 'Paciente';
    var api = new Api('perfil', 'datos');
    api.request(
        {rol: rol},
        function(resp) {
            var perfil = resp.perfil || {};
            $('#perfil_app_rol').val(rol);
            $('#perfil_app_nombres').val(perfil.nombres || '');
            $('#perfil_app_apellido_uno').val(perfil.apellido_uno || '');
            $('#perfil_app_apellido_dos').val(perfil.apellido_dos || '');
            $('#perfil_app_telefono_uno').val(perfil.telefono_uno || '');
            $('#perfil_app_telefono_dos').val(perfil.telefono_dos || '');
            $('#perfil_app_email').val(perfil.email || '');
            actualizarNombreHeroPerfil();
            var perfilLocal = {};
            try {
                perfilLocal = JSON.parse(localStorage.getItem(
                    rol === 'Profesional' ? 'perfilProfesional' : 'perfilPaciente'
                ) || '{}') || {};
            } catch (error) {
                perfilLocal = {};
            }
            var rut = perfil.rut || perfilLocal.rut || '';
            $('#perfil_menu_rut').text(rut).toggle(!!rut);
            $('#perfil_app_rut').val(rut);
            $('#perfil_app_foto, #perfil_app_foto_camara').val('');
            $('.perfil-app-foto').removeClass('con-nueva-foto');
            $('#perfil_app_foto_preview, #perfil_menu_foto').attr(
                'src',
                perfil.foto_perfil_url || 'src/images/avatar-generico.svg'
            );
            $('#perfil_app_clave_actual, #perfil_app_clave_nueva, #perfil_app_clave_confirmacion, #perfil_app_biometria_pin, #perfil_app_password_login').val('');
            vista('editar-perfil-app', 'fade');
            if (typeof actualizarEstadoBiometriaApp === 'function') {
                actualizarEstadoBiometriaApp();
            }
        },
        function() {
            msg('Perfil', 'No fue posible cargar el perfil.', 'error');
        },
        'GET'
    );
};

const guardarPerfilApp = () => {
    var datos = {
        rol: $('#perfil_app_rol').val(),
        nombres: $.trim($('#perfil_app_nombres').val()),
        apellido_uno: $.trim($('#perfil_app_apellido_uno').val()),
        apellido_dos: $.trim($('#perfil_app_apellido_dos').val()),
        telefono_uno: $.trim($('#perfil_app_telefono_uno').val()),
        telefono_dos: $.trim($('#perfil_app_telefono_dos').val())
    };
    var api = new Api('perfil', 'datos');
    api.request(datos, function(resp) {
        msg('Perfil', resp.msj || 'Perfil actualizado.', 'success');
        localStorage.setItem('nombre', datos.nombres);
        volverInicioSegunRol();
    }, function(xhr) {
        var mensaje = xhr.responseJSON && xhr.responseJSON.message
            ? xhr.responseJSON.message
            : 'Revisa los datos ingresados.';
        msg('Perfil', mensaje, 'error');
    }, 'PUT');
};

const abrirOpcionesFotoPerfil = () => {
    $('.perfil-app-foto').addClass('sheet-abierta');
};

const cerrarOpcionesFotoPerfil = () => {
    $('.perfil-app-foto').removeClass('sheet-abierta');
};

const elegirOrigenFotoPerfil = (idInput) => {
    cerrarOpcionesFotoPerfil();
    var input = document.getElementById(idInput);
    input.value = '';
    input.click();
};

$(document).on('change', '#perfil_app_foto, #perfil_app_foto_camara', function() {
    var archivo = this.files && this.files[0];
    if (!archivo) return;
    var maximo = (this.id === 'perfil_app_foto_camara' ? 25 : 5) * 1024 * 1024;
    if (!/^image\/(jpeg|png|webp)$/.test(archivo.type) || archivo.size > maximo) {
        this.value = '';
        $('.perfil-app-foto').removeClass('con-nueva-foto');
        msg('Foto de perfil', 'Selecciona una imagen JPG, PNG o WEBP de hasta 5 MB.', 'error');
        return;
    }
    iniciarEncuadreFotoPerfil(archivo);
});

const actualizarNombreHeroPerfil = () => {
    var nombre = $.trim($('#perfil_app_nombres').val() + ' ' + $('#perfil_app_apellido_uno').val());
    $('#perfil_hero_nombre, #perfil_menu_nombre').text(nombre || 'Nombre Apellido');
};

$(document).on('input', '#perfil_app_nombres, #perfil_app_apellido_uno', actualizarNombreHeroPerfil);

/*
 * Encuadre visual de la foto de perfil (solo interfaz): se arrastra y se hace
 * zoom dentro del círculo; al guardar se recorta a un cuadrado y se entrega a
 * guardarFotoPerfilApp(), que sigue siendo quien sube la foto.
 */
var encuadreFoto = { x: 0, y: 0, escala: 1, minimo: 1, ancho: 0, alto: 0, marco: 0, url: null };

const aplicarEncuadreFoto = () => {
    var e = encuadreFoto;
    var s = e.minimo * e.escala;
    e.x = Math.min(0, Math.max(e.marco - e.ancho * s, e.x));
    e.y = Math.min(0, Math.max(e.marco - e.alto * s, e.y));
    $('#perfil_foto_editor').css('transform', 'translate(' + e.x + 'px,' + e.y + 'px) scale(' + s + ')');
};

const iniciarEncuadreFotoPerfil = (archivo) => {
    if (encuadreFoto.url) URL.revokeObjectURL(encuadreFoto.url);
    encuadreFoto.url = URL.createObjectURL(archivo);

    var editor = document.getElementById('perfil_foto_editor');
    editor.onload = function() {
        var e = encuadreFoto;
        $('.perfil-app-foto').addClass('con-nueva-foto');
        e.marco = document.getElementById('perfil_foto_marco').clientWidth; // ya excluye el borde
        e.ancho = editor.naturalWidth;
        e.alto = editor.naturalHeight;
        e.minimo = e.marco / Math.min(e.ancho, e.alto);
        e.escala = 1;
        e.x = (e.marco - e.ancho * e.minimo) / 2;
        e.y = (e.marco - e.alto * e.minimo) / 2;
        $('#perfil_foto_zoom').val(100);
        $(editor).css({ width: e.ancho + 'px', height: e.alto + 'px' });
        aplicarEncuadreFoto();
    };
    editor.onerror = function() {
        cancelarFotoAjustada();
        msg('Foto de perfil', 'No fue posible leer la imagen. Prueba con otra.', 'error');
    };
    editor.src = encuadreFoto.url;
};

$(document).on('input', '#perfil_foto_zoom', function() {
    var e = encuadreFoto;
    var anterior = e.minimo * e.escala;
    var centroX = (e.marco / 2 - e.x) / anterior;
    var centroY = (e.marco / 2 - e.y) / anterior;
    e.escala = this.value / 100;
    var nueva = e.minimo * e.escala;
    e.x = e.marco / 2 - centroX * nueva;
    e.y = e.marco / 2 - centroY * nueva;
    aplicarEncuadreFoto();
});

(function() {
    var arrastre = null;
    $(document).on('pointerdown', '.perfil-app-foto.con-nueva-foto #perfil_foto_marco', function(ev) {
        arrastre = { px: ev.originalEvent.clientX, py: ev.originalEvent.clientY, x: encuadreFoto.x, y: encuadreFoto.y };
        try { this.setPointerCapture(ev.originalEvent.pointerId); } catch (err) {}
    });
    $(document).on('pointermove', '#perfil_foto_marco', function(ev) {
        if (!arrastre) return;
        encuadreFoto.x = arrastre.x + (ev.originalEvent.clientX - arrastre.px);
        encuadreFoto.y = arrastre.y + (ev.originalEvent.clientY - arrastre.py);
        aplicarEncuadreFoto();
    });
    $(document).on('pointerup pointercancel', '#perfil_foto_marco', function() { arrastre = null; });
})();

const cancelarFotoAjustada = () => {
    $('#perfil_app_foto, #perfil_app_foto_camara').val('');
    $('.perfil-app-foto').removeClass('con-nueva-foto sheet-abierta');
    if (encuadreFoto.url) {
        URL.revokeObjectURL(encuadreFoto.url);
        encuadreFoto.url = null;
    }
};

// Recorta lo que se ve dentro del círculo y lo sube con la función existente.
const guardarFotoAjustada = () => {
    var e = encuadreFoto;
    var editor = document.getElementById('perfil_foto_editor');
    if (!editor.naturalWidth) return;

    var s = e.minimo * e.escala;
    var lado = 512;
    var lienzo = document.createElement('canvas');
    lienzo.width = lado;
    lienzo.height = lado;
    var ctx = lienzo.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, lado, lado);
    ctx.drawImage(editor, -e.x / s, -e.y / s, e.marco / s, e.marco / s, 0, 0, lado, lado);

    lienzo.toBlob(function(blob) {
        if (!blob) {
            msg('Foto de perfil', 'No fue posible preparar la foto.', 'error');
            return;
        }
        var recorte = new File([blob], 'foto-perfil.jpg', { type: 'image/jpeg' });
        var transferencia = new DataTransfer();
        transferencia.items.add(recorte);
        document.getElementById('perfil_app_foto').files = transferencia.files;
        guardarFotoPerfilApp();
    }, 'image/jpeg', 0.9);
};

const guardarFotoPerfilApp = () => {
    var input = document.getElementById('perfil_app_foto');
    var archivo = input && input.files ? input.files[0] : null;
    if (!archivo) {
        msg('Foto de perfil', 'Selecciona una foto antes de continuar.', 'error');
        return;
    }

    var formData = new FormData();
    formData.append('rol', $('#perfil_app_rol').val());
    formData.append('foto', archivo);

    $.ajax({
        url: MEDSDI_API_URL + '/perfil/foto',
        type: 'POST',
        data: formData,
        headers: {
            'Accept': 'application/json',
            'X-Auth-Token': localStorage.getItem('authToken')
        },
        contentType: false,
        processData: false,
        success: function(resp) {
            $('#perfil_app_foto_preview, #perfil_menu_foto').attr('src', resp.foto_perfil_url);
            $('#perfil_app_foto').val('');
            $('.perfil-app-foto').removeClass('con-nueva-foto');
            localStorage.setItem('foto_perfil', resp.foto_perfil || '');
            localStorage.setItem('foto_perfil_url', resp.foto_perfil_url || '');

            var clavePerfil = $('#perfil_app_rol').val() === 'Profesional'
                ? 'perfilProfesional'
                : 'perfilPaciente';
            try {
                var perfilGuardado = JSON.parse(localStorage.getItem(clavePerfil) || '{}');
                perfilGuardado.foto_perfil = resp.foto_perfil || '';
                perfilGuardado.foto_perfil_url = resp.foto_perfil_url || '';
                localStorage.setItem(clavePerfil, JSON.stringify(perfilGuardado));
            } catch (error) {
                console.log('No fue posible actualizar la copia local del perfil.', error);
            }

            if (typeof actualizarHeaderUsuario === 'function') {
                actualizarHeaderUsuario();
            }
            msg('Foto de perfil', resp.msj || 'Foto actualizada.', 'success');
        },
        error: function(xhr) {
            var mensaje = xhr.responseJSON && xhr.responseJSON.message
                ? xhr.responseJSON.message
                : 'No fue posible actualizar la foto.';
            // Si falló, vuelve a mostrar la foto que sigue guardada.
            $('#perfil_app_foto').val('');
            $('.perfil-app-foto').removeClass('con-nueva-foto');
            $('#perfil_app_foto_preview, #perfil_menu_foto').attr(
                'src',
                localStorage.getItem('foto_perfil_url') || 'src/images/avatar-generico.svg'
            );
            msg('Foto de perfil', mensaje, 'error');
        }
    });
};

const cambiarClaveDispositivoApp = () => {
    var actual = $.trim($('#perfil_app_clave_actual').val());
    var nueva = $.trim($('#perfil_app_clave_nueva').val());
    var confirmacion = $.trim($('#perfil_app_clave_confirmacion').val());
    var uuid = typeof obtenerUuidDispositivo === 'function'
        ? obtenerUuidDispositivo()
        : (localStorage.getItem('uuid') || $('#uuid').val());

    if (!/^\d{4}$/.test(actual) || !/^\d{4}$/.test(nueva)) {
        msg('Clave del dispositivo', 'Las claves deben contener exactamente 4 dígitos.', 'error');
        return;
    }
    if (nueva !== confirmacion) {
        msg('Clave del dispositivo', 'La confirmación no coincide con la nueva clave.', 'error');
        return;
    }
    if (!uuid || uuid === '0') {
        msg('Clave del dispositivo', 'No fue posible identificar este dispositivo.', 'error');
        return;
    }

    var api = new Api('perfil', 'clave-dispositivo');
    api.request({
        uuid: uuid,
        clave_actual: actual,
        clave_nueva: nueva,
        clave_nueva_confirmation: confirmacion
    }, function(resp) {
        localStorage.setItem('password', nueva);
        $('#pass_device').val(nueva);
        if (typeof actualizarSecretoBiometricoApp === 'function') {
            actualizarSecretoBiometricoApp(nueva);
        }
        $('#perfil_app_clave_actual, #perfil_app_clave_nueva, #perfil_app_clave_confirmacion').val('');
        msg('Clave del dispositivo', resp.msj || 'Clave actualizada.', 'success');
    }, function(xhr) {
        var mensaje = xhr.responseJSON && xhr.responseJSON.message
            ? xhr.responseJSON.message
            : 'No fue posible cambiar la clave.';
        msg('Clave del dispositivo', mensaje, 'error');
    }, 'PUT');
};

const abrirVideollamadaApp = (url) => {
    if (!url) return;
    if (window.cordova && cordova.InAppBrowser) {
        cordova.InAppBrowser.open(url, '_blank', 'location=yes,mediaPlaybackRequiresUserAction=no');
    } else {
        window.open(url, '_blank');
    }
};

const fechaLocalAgendaProfesional = (fecha) => {
    var year = fecha.getFullYear();
    var month = String(fecha.getMonth() + 1).padStart(2, '0');
    var day = String(fecha.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
};

const irHoyAgendaProfesional = () => {
    $('#agenda_profesional_fecha').val(fechaLocalAgendaProfesional(new Date()));
    cargarAgendaProfesional();
};

const cambiarDiaAgendaProfesional = (dias) => {
    var valor = $('#agenda_profesional_fecha').val() || fechaLocalAgendaProfesional(new Date());
    var fecha = new Date(valor + 'T12:00:00');
    fecha.setDate(fecha.getDate() + dias);
    $('#agenda_profesional_fecha').val(fechaLocalAgendaProfesional(fecha));
    cargarAgendaProfesional();
};

const cargarAgendaProfesional = (idLugar) => {
    if (!$('#agenda_profesional_fecha').val()) {
        $('#agenda_profesional_fecha').val(fechaLocalAgendaProfesional(new Date()));
    }

    var fechaSeleccionada = $('#agenda_profesional_fecha').val();
    var fechaLabel = new Date(fechaSeleccionada + 'T12:00:00');
    $('#agenda_profesional_dia_label').text(
        fechaLabel.toLocaleDateString('es-CL', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        })
    );

    var api = new Api('profesional', 'agenda');
    api.request(
        {
            id_lugar_atencion: idLugar || $('#agenda_profesional_lugar').val() || '',
            fecha: fechaSeleccionada
        },
        function(resp) {
            var lugares = Array.isArray(resp.lugares) ? resp.lugares : [];
            var actual = String(idLugar || $('#agenda_profesional_lugar').val() || '');
            var opciones = '<option value="">Seleccione lugar de atención</option>';
            lugares.forEach(function(lugar) {
                opciones += '<option value="' + lugar.id + '">' +
                    escaparTextoConsentimiento(lugar.nombre) + '</option>';
            });
            $('#agenda_profesional_lugar').html(opciones).val(actual);

            // Las horas anuladas/canceladas no se muestran en la agenda.
            var registros = horasVigentes(resp.registros);
            var html = registros.length ? '' : '<div class="agenda-profesional-vacio">No hay citas para este día.</div>';
            registros.forEach(function(hora) {
                var video = hora.es_telemedicina
                    ? (hora.puede_conectarse && hora.video_url
                        ? '<div class="btn-app7 mt10" onclick="abrirVideollamadaApp(\'' +
                            hora.video_url + '\')">Iniciar videollamada</div>'
                        : '<div class="btn-app8 mt10">Telemedicina: ' +
                            escaparTextoConsentimiento(hora.estado) + '</div>')
                    : '';
                html += '<div class="card-button-dos agenda-profesional-cita mb20">' +
                    '<p class="agenda-profesional-paciente">' + escaparTextoConsentimiento(hora.paciente) + '</p>' +
                    '<div class="agenda-profesional-detalle">' +
                    '<p><b>Fecha</b><span>' + escaparTextoConsentimiento(fechaEsp(hora.fecha)) + '</span></p>' +
                    '<p><b>Horario</b><span>' + escaparTextoConsentimiento(hora.hora_inicio) +
                        ' - ' + escaparTextoConsentimiento(hora.hora_termino) + '</span></p>' +
                    '<p><b>Lugar</b><span>' + escaparTextoConsentimiento(hora.lugar) + '</span></p>' +
                    '<p><b>Estado</b><span>' + escaparTextoConsentimiento(hora.estado) + '</span></p>' +
                    '</div>' +
                    video + '</div>';
            });
            $('#lista-agenda-profesional').html(html);
        },
        function() {
            $('#lista-agenda-profesional').html('<p>No fue posible cargar la agenda.</p>');
        },
        'GET'
    );
};

var paginaMisPacientesProfesional = 1;

const abrirMisPacientesProfesional = () => {
    paginaMisPacientesProfesional = 1;
    $('#mis_pacientes_buscar').val('');
    vista('mis-pacientes-profesional');
    cargarMisPacientesProfesional(1);
};

const cargarMisPacientesProfesional = (pagina) => {
    paginaMisPacientesProfesional = pagina || 1;
    $('#lista-mis-pacientes-profesional').html('<div class="mis-pacientes-vacio">Cargando pacientes...</div>');

    var api = new Api('profesional', 'mis_pacientes');
    api.request(
        {
            buscar: ($('#mis_pacientes_buscar').val() || '').trim(),
            pagina: paginaMisPacientesProfesional,
            por_pagina: 20
        },
        function(resp) {
            var registros = Array.isArray(resp.registros) ? resp.registros : [];
            var paginacion = resp.paginacion || {};
            var html = '';

            registros.forEach(function(paciente) {
                var nombre = escaparTextoConsentimiento(paciente.nombre || 'Paciente');
                var iniciales = (paciente.nombre || 'P').split(/\s+/).slice(0, 2).map(function(parte) {
                    return parte.charAt(0).toUpperCase();
                }).join('');
                var contacto = paciente.telefono || paciente.email || 'Sin datos de contacto';
                var ultima = paciente.ultima_atencion ? fechaEsp(String(paciente.ultima_atencion).substring(0, 10)) : 'Sin fecha';

                html += '<article class="mis-paciente-card">' +
                    '<div class="mis-paciente-avatar">' + escaparTextoConsentimiento(iniciales) + '</div>' +
                    '<div class="mis-paciente-datos"><h3>' + nombre + '</h3>' +
                    '<p><b>RUT:</b> ' + escaparTextoConsentimiento(paciente.rut || 'No registrado') + '</p>' +
                    '<p><b>Contacto:</b> ' + escaparTextoConsentimiento(contacto) + '</p>' +
                    '<p><b>Última atención:</b> ' + escaparTextoConsentimiento(ultima) + '</p>' +
                    '<span>' + Number(paciente.total_atenciones || 0) + ' atención(es)</span></div></article>';
            });

            $('#lista-mis-pacientes-profesional').html(
                html || '<div class="mis-pacientes-vacio">No se encontraron pacientes atendidos.</div>'
            );
            $('#mis_pacientes_resumen').text((paginacion.total || 0) + ' paciente(s)');

            var actual = Number(paginacion.pagina_actual || 1);
            var ultima = Number(paginacion.ultima_pagina || 1);
            $('#mis_pacientes_paginacion').html(
                '<button type="button" data-role="none" ' + (actual <= 1 ? 'disabled' : '') +
                ' onclick="cargarMisPacientesProfesional(' + (actual - 1) + ')">Anterior</button>' +
                '<span>Página ' + actual + ' de ' + ultima + '</span>' +
                '<button type="button" data-role="none" ' + (actual >= ultima ? 'disabled' : '') +
                ' onclick="cargarMisPacientesProfesional(' + (actual + 1) + ')">Siguiente</button>'
            );
        },
        function() {
            $('#lista-mis-pacientes-profesional').html('<div class="mis-pacientes-vacio mis-pacientes-error">No fue posible cargar los pacientes.</div>');
            $('#mis_pacientes_paginacion').empty();
        },
        'GET'
    );
};

$(document).on('keyup', '#mis_pacientes_buscar', function(event) {
    if (event.key === 'Enter') cargarMisPacientesProfesional(1);
});

const configurarFooterAutorizaciones = () => {
    const esProfesional = localStorage.getItem('rolActivo') === 'Profesional';
    const $pagina = $('#autorizaciones_sdi');

    $pagina.find('.autorizaciones-footer-citas').toggle(!esProfesional);
    $pagina.find('.autorizaciones-footer-principal')
        .toggleClass('col-xs-6', esProfesional)
        .toggleClass('col-xs-4', !esProfesional);
};

// O si usas el evento show de jQuery Mobile
$(document).on('pageshow', '#med_no_insc', function() {
    aplicarFormatoRut();
    limpiarFormularioAtencion();
});

//$(document).on('pageshow', '#buscador_profesional', function() {
  //  limpiarFormularioBusquedaMedico();
//});

var checkDeviceEnCurso = false;
var checkDeviceUltimaVerificacion = 0;
// Una verificación válida del dispositivo se reutiliza durante 5 minutos.
var checkDeviceCacheMs = 5 * 60 * 1000;
// Si varias vistas piden verificación mientras una petición está en curso,
// sus callbacks quedan esperando la misma respuesta en vez de lanzar otra petición.
var checkDeviceCallbacksPendientes = [];

const resolverCallbacksCheckDevice = (resultado) => {
    var callbacks = checkDeviceCallbacksPendientes.slice();
    checkDeviceCallbacksPendientes = [];

    callbacks.forEach(function(callback) {
        try {
            callback(resultado);
        } catch (error) {
            console.error('[MED-SDI] Error ejecutando callback de checkDevice:', error);
        }
    });
};

const checkDevice = (onReady, silencioso) => {

    var ahora = Date.now();

    // Reutilizar una verificación reciente.
    if (
        checkDeviceUltimaVerificacion &&
        (ahora - checkDeviceUltimaVerificacion) < checkDeviceCacheMs
    ) {
        if (typeof onReady === 'function') {
            onReady(true);
        }
        return;
    }

    // Si ya hay una verificación en curso, la siguiente vista espera
    // el mismo resultado. Así evitamos peticiones duplicadas y pantallas pegadas.
    if (checkDeviceEnCurso) {
        if (typeof onReady === 'function') {
            checkDeviceCallbacksPendientes.push(onReady);
        }

        console.log('[MED-SDI] checkDevice ya está en ejecución; reutilizando la petición actual.');
        return;
    }

    var datos = {};

    datos.uuid = typeof obtenerUuidDispositivo === 'function'
        ? obtenerUuidDispositivo()
        : (localStorage.getItem('uuid') || $('#uuid').val());

    if (!datos.uuid || datos.uuid === '0') {
        if (typeof onReady === 'function') {
            onReady(false);
        }

        if (!silencioso) {
            msg('Check Device', 'No fue posible identificar este dispositivo.', 'error');
        }

        return;
    }

    if (typeof onReady === 'function') {
        checkDeviceCallbacksPendientes.push(onReady);
    }

    checkDeviceEnCurso = true;

    if (!silencioso) {
        cargando(1);
    }

    console.log('[MED-SDI] Verificando dispositivo:', datos.uuid);

    var api = new Api('mobile-authorization', 'device');

    api.request(
        datos,
        function (resp) {
            checkDeviceEnCurso = false;

            if (!silencioso) {
                cargando(0);
            }

            console.log('[MED-SDI] checkDevice respuesta:', resp);

            if (resp.estado == 0) {
                resolverCallbacksCheckDevice(false);

                // Cuando la llamada original no esperaba callback, mantenemos
                // el flujo legacy para registrar el equipo.
                if (typeof onReady !== 'function') {
                    registrarPasswordShow();
                }

                return;
            }

            if (!resp.registros || !resp.registros.length) {
                console.error('[MED-SDI] Respuesta checkDevice sin registros.', resp);
                resolverCallbacksCheckDevice(false);
                return;
            }

            if (resp.registros[0].estado == 0) {
                resolverCallbacksCheckDevice(false);

                if (typeof onReady !== 'function') {
                    vista('login', 'fade');
                    $('#modalRegistroDevice').modal('show');
                }

                return;
            }

            if (resp.password) {
                setSession('password', resp.password);
                $('#pass_device').val(resp.password);
            }

            if (resp.registros[0].emergency_token) {
                localStorage.setItem(
                    'emergencyToken',
                    resp.registros[0].emergency_token
                );
            }

            // Solo las verificaciones exitosas quedan cacheadas.
            checkDeviceUltimaVerificacion = Date.now();
            resolverCallbacksCheckDevice(true);

            /*
             * IMPORTANTE:
             * checkDevice ya no carga recetas/documentos ni otras vistas.
             * Cada módulo obtiene sus datos únicamente cuando el usuario entra
             * realmente en esa pantalla.
             */
        },
        function (xhr, status, error) {
            checkDeviceEnCurso = false;

            if (!silencioso) {
                cargando(0);
            }

            console.error('[MED-SDI] CHECK DEVICE ERROR', {
                status: xhr ? xhr.status : null,
                responseText: xhr ? xhr.responseText : null,
                responseJSON: xhr ? xhr.responseJSON : null,
                ajaxStatus: status,
                error: error,
                uuid: datos.uuid,
                api: typeof MEDSDI_API_URL !== 'undefined' ? MEDSDI_API_URL : ''
            });

            resolverCallbacksCheckDevice(false);

            if (xhr && xhr.status === 429) {
                // Pequeño enfriamiento para no insistir inmediatamente.
                checkDeviceUltimaVerificacion = Date.now();

                if (!silencioso) {
                    msg(
                        'Check Device',
                        'Se realizaron demasiadas verificaciones. Intenta nuevamente en unos minutos.',
                        'warning'
                    );
                }
                return;
            }

            var mensaje = 'Error de verificación';

            if (xhr && xhr.responseJSON && xhr.responseJSON.message) {
                mensaje = xhr.responseJSON.message;
            } else if (xhr && xhr.status) {
                mensaje += ' (HTTP ' + xhr.status + ')';
            } else {
                mensaje += ' (sin respuesta del servidor)';
            }

            if (!silencioso) {
                msg('Check Device', mensaje, 'error');
            }
        },
        'GET'
    );
}

const registrarPasswordShow = () => {
    vista('clave_desbloqueo','fade');
}

/*
const registrarPasswordShow = () => {
    navigator.notification.prompt(
        'Debe Ingresar un clave, para registrar el equipo',  // message
        registrarPassword,                  // callback to invoke
        'Clave',            // title
        ['Ingresar','Cerrar'],             // buttonLabels
        ''                 // defaultText
    );
    
}
*/


const registrarPassword = () => {

    var pass = $.trim($('#password_desbloqueo').val());

    if(/^\d{4}$/.test(pass))
    {
        $('#pass_device').val(pass);
        registerDeviceShow();
    }else{
        msg('Clave de desbloqueo', 'La clave debe tener exactamente 4 dígitos numéricos.', 'warning');
        $('#password_desbloqueo').focus().select();
    }

}

$(document).on('input', '#password_desbloqueo', function() {
    this.value = this.value.replace(/\D/g, '').slice(0, 4);
});

$(document).on('keydown', '#password_desbloqueo', function(ev) {
    if (ev.key === 'Enter') registrarPassword();
});

/*
const registrarPassword = (results) => {

    switch(results.buttonIndex)
    {
        case 1:
            var pass = $.trim(results.input1);
            if(pass.length>3)
            {
                $('#pass_device').val(pass);
                registerDeviceShow();   
            }else{                
                navigator.notification.alert('Debe ingresar un password mayor a 3 digitos', registrarPasswordShow, 'Aviso', 'Cerrar');
            }
        break;
        case 2:
                navigator.notification.alert('Debe ingresar un password mayor a 3 digitos', registrarPasswordShow, 'Aviso', 'Cerrar');
        break;       
    }

}
*/

const registerDeviceShow = () => {
    navigator.notification.confirm(
        'Quiere registrar el dispositivo', // message
         optionDevice,            // callback to invoke with index of button pressed
        'Registrar Dispositivo',           // title
        ['Registrar','Cancelar']     // buttonLabels
    );
}


function optionDevice(btnIndex) {
    //alert('You selected button ' + btnIndex);

    switch(btnIndex)
    {
        case 1:
            registerDevice();
        break;
        case 2:
            vista('login','fade');
        break;
    }
}

const registerDevice = () => {

    var dateObj = new Date();
    var month = dateObj.getUTCMonth() + 1; //months from 1-12
    var day = dateObj.getUTCDate();
    var year = dateObj.getUTCFullYear();

    if(month<10)
    month = '0'+month;

    if(day<10)
    day = '0'+day;

    newdate = year + "/" + month + "/" + day;

    var datos = {};

    datos.id_user = _SESSION('id_usuario');
    datos.alias = $('#model_device').val();
    datos.uuid = typeof obtenerUuidDispositivo === 'function'
        ? obtenerUuidDispositivo()
        : ($('#uuid').val() || localStorage.getItem('uuid') || '');
    datos.password = $('#pass_device').val();
    datos.estado = 0;
    datos.fecha_ingreso = `${year}-${month}-${day} 00:00:00`;
    datos.fecha_termino = `${year+1}-${month}-${day} 00:00:00`;

    cargando(1); 

    // El alta se realiza con la sesión autenticada. El backend obtiene el
    // usuario desde el token y no confía en un id_user manipulable.
    var api = new Api("mobile-authorization", "device");
    api.request(
        datos,
        function (resp) {
            
            if (resp.estado == 1) {
                navigator.notification.alert(
                    'Dispositivo Registrado',  // message
                    ()=>{ 
                        if (resp.requiere_activacion) {
                            enviarCorreoValidarEquipo();
                        }
                        vista('login','fade');
                        $('#modalRegistroDevice').modal('show'); 
                    },         // callback
                    'Estado Dispositivo',            // title
                    'Cerrar'                  // buttonName
                );
                
            } else {                
                navigator.notification.confirm(
                    'Problemas al Registrar, Quiere volver a registrar el dispositivo', // message
                     optionDevice,            // callback to invoke with index of button pressed
                    'Registrar Dispositivo',           // title
                    ['Registrar','Cancelar']     // buttonLabels
                );
                
            }
            cargando(0); 

        },
        function (resp) { 
            cargando(0); 
            msg('Check Device', 'Error en el registro', 'error');

            navigator.notification.confirm(
                'Problemas al Registrar, Quiere volver a registrar el dispositivo', // message
                 optionDevice,            // callback to invoke with index of button pressed
                'Registrar Dispositivo',           // title
                ['Registrar','Cancelar']     // buttonLabels
            );
        },
        "POST");
}

const list_document_user = ()=>{
    list_recetas_paciente();
}

const escaparTextoConsentimiento = (valor) => {
    return $('<div>').text(valor == null ? '' : String(valor)).html();
};

const abrirDocumentoClinico = (url, tipo) => {
    if (!url) {
        return;
    }

    const esAndroid = (
        (typeof device !== 'undefined' && String(device.platform || '').toLowerCase() === 'android') ||
        /Android/i.test(navigator.userAgent || '')
    );

    /*
     * Android WebView / cordova-plugin-inappbrowser no ofrece un visor PDF
     * nativo fiable. Cuando el servidor devuelve un PDF, el WebView puede
     * quedar negro mientras intenta interpretarlo.
     *
     * En Android abrimos documentos clínicos en el visor del sistema
     * (Chrome/visor PDF instalado), que es mucho más rápido y estable.
     * En iOS/browser mantenemos el InAppBrowser habitual.
     */
    if (window.cordova && cordova.InAppBrowser) {
        if (esAndroid) {
            try {
                cordova.InAppBrowser.open(url, '_system', 'location=yes');
            } catch (error) {
                console.error('[MED-SDI] No fue posible abrir el documento con el visor del sistema:', error);
                cordova.InAppBrowser.open(url, '_blank', 'location=yes');
            }
            return;
        }

        cargando(1);

        const navegador = cordova.InAppBrowser.open(
            url,
            '_blank',
            'location=yes,hidden=yes,clearcache=no,clearsessioncache=no'
        );

        let cerrado = false;

        const terminarCarga = () => {
            if (cerrado) return;
            cargando(0);
            try {
                navegador.show();
            } catch (error) {
                console.log('[MED-SDI] Documento abierto.', error);
            }
        };

        navegador.addEventListener('loadstop', terminarCarga);
        navegador.addEventListener('loaderror', function(event) {
            if (cerrado) return;
            cargando(0);
            console.error('[MED-SDI] Error cargando documento clínico:', event);
            msg('Documento', 'No fue posible abrir el documento.', 'error');
        });
        navegador.addEventListener('exit', function() {
            cerrado = true;
            cargando(0);
        });

        // Seguridad: no dejar el loader bloqueado si WebView no emite loadstop.
        setTimeout(function() {
            if (!cerrado) {
                terminarCarga();
            }
        }, 8000);

        return;
    }

    window.open(url, '_blank');
};

// Compatibilidad con recetas, consentimientos y llamadas existentes.
const abrirConsentimiento = (url) => {
    abrirDocumentoClinico(url, 'documento');
};

// Tarjeta común de Mis exámenes, Mis recetas y Mis consentimientos.
// Todos los textos de "o" deben venir ya escapados.
const tarjetaDocumentoClinico = (o) =>
    '<article class="examen-card">' +
        '<div class="examen-card-cabecera">' +
            '<h3 class="examen-card-nombre">' + o.titulo + '</h3>' +
            (o.estado ? '<span class="examen-estado ' + (o.estadoClase || 'examen-estado-pendiente') + '">' + o.estado + '</span>' : '') +
        '</div>' +
        '<dl class="examen-card-datos">' +
            (o.datos || []).map(function(d) {
                return '<div><dt>' + d[0] + '</dt><dd>' + (d[1] || '—') + '</dd></div>';
            }).join('') +
        '</dl>' +
        (o.boton ? '<div class="examen-card-acciones">' + o.boton + '</div>' : '') +
    '</article>';

// Color de la etiqueta según el texto del estado.
const claseEstadoDocumento = (estado) => {
    var t = String(estado || '').toLowerCase();
    if (/(disponible|firmado|aceptado|autorizado|aprobado|vigente)/.test(t)) return 'examen-estado-ok';
    if (/(rechaz|revoc|cancel|anulad)/.test(t)) return 'examen-estado-rechazado';
    if (t.indexOf('revisado') !== -1) return 'examen-estado-revisado';
    return 'examen-estado-pendiente';
};

const mensajeDocumentoClinico = (texto) =>
    '<p class="examen-vacio">' + escaparTextoConsentimiento(texto) + '</p>';

const list_consentimientos = () => {
    var $contenedor = $('#list_consentimientos');
    $contenedor.html('<p class="text-center color-azul">Cargando consentimientos...</p>');
    cargando(1);

    var api = new Api('paciente', 'mis_consentimientos');
    api.request(
        {},
        function(resp) {
            var registros = Array.isArray(resp.registros) ? resp.registros : [];

            if (resp.estado != 1 || registros.length === 0) {
                $contenedor.html(mensajeDocumentoClinico('No tienes consentimientos informados registrados.'));
                cargando(0);
                return;
            }

            var html = '';
            registros.forEach(function(registro) {
                var tipo = escaparTextoConsentimiento(registro.tipo || 'Consentimiento informado');
                var profesional = escaparTextoConsentimiento(registro.profesional || 'No informado');
                var estado = escaparTextoConsentimiento(registro.estado_consentimiento || 'Pendiente');
                var fecha = registro.fecha_emision
                    ? escaparTextoConsentimiento(fechaEsp(registro.fecha_emision))
                    : 'Sin fecha';
                var pdfUrl = escaparTextoConsentimiento(registro.pdf_url || '');

                html += tarjetaDocumentoClinico({
                    titulo: tipo,
                    estado: estado,
                    estadoClase: claseEstadoDocumento(registro.estado_consentimiento),
                    datos: [['Fecha emisión', fecha], ['Profesional', profesional]],
                    boton: pdfUrl
                        ? '<button type="button" data-role="none" class="examen-btn js-ver-consentimiento" ' +
                            'data-consentimiento-url="' + pdfUrl + '">Ver consentimiento</button>'
                        : ''
                });
            });

            $contenedor.html(html);
            cargando(0);
        },
        function(xhr) {
            var mensaje = xhr && xhr.status === 401
                ? 'Tu sesión expiró. Ingresa nuevamente.'
                : 'No fue posible cargar tus consentimientos.';

            $contenedor.html(mensajeDocumentoClinico(mensaje));
            cargando(0);
        },
        'GET'
    );
};

const list_recetas_paciente = () => {
    var $contenedor = $('#list_recetas');
    $contenedor.html('<p class="text-center color-azul">Cargando recetas...</p>');
    cargando(1);

    var api = new Api('paciente', 'mis_recetas');
    api.request(
        {},
        function(resp) {
            var registros = Array.isArray(resp.registros) ? resp.registros : [];

            if (resp.estado != 1 || registros.length === 0) {
                $contenedor.html(mensajeDocumentoClinico('No tienes recetas registradas.'));
                cargando(0);
                return;
            }

            var html = '';
            registros.forEach(function(receta) {
                var fecha = receta.fecha_emision
                    ? escaparTextoConsentimiento(fechaEsp(receta.fecha_emision))
                    : 'Sin fecha';
                var tipo = escaparTextoConsentimiento(receta.tipo || 'Receta médica');
                var diagnostico = escaparTextoConsentimiento(
                    receta.diagnostico || 'No informado'
                );
                var profesional = escaparTextoConsentimiento(
                    receta.profesional || 'No informado'
                );
                var cantidad = Number(receta.cantidad_medicamentos || 0);
                var pdfUrl = escaparTextoConsentimiento(receta.pdf_url || '');

                html += tarjetaDocumentoClinico({
                    titulo: tipo,
                    estado: cantidad + (cantidad === 1 ? ' medicamento' : ' medicamentos'),
                    estadoClase: 'examen-estado-revisado',
                    datos: [['Fecha emisión', fecha], ['Diagnóstico', diagnostico], ['Profesional', profesional]],
                    boton: pdfUrl
                        ? '<button type="button" data-role="none" class="examen-btn js-ver-receta" ' +
                            'data-receta-url="' + pdfUrl + '">Ver receta</button>'
                        : ''
                });
            });

            $contenedor.html(html);
            cargando(0);
        },
        function(xhr) {
            var mensaje = xhr && xhr.status === 401
                ? 'Tu sesión expiró. Ingresa nuevamente.'
                : 'No fue posible cargar tus recetas.';

            $contenedor.html(mensajeDocumentoClinico(mensaje));
            cargando(0);
        },
        'GET'
    );
};

const list_examenes_paciente = () => {
    var $contenedor = $('#list_examenes');
    $contenedor.html('<p class="text-center color-azul">Cargando exámenes...</p>');
    cargando(1);

    var api = new Api('paciente', 'mis_examenes');
    api.request(
        {},
        function(resp) {
            var registros = Array.isArray(resp.registros) ? resp.registros : [];

            if (resp.estado != 1 || registros.length === 0) {
                $contenedor.html(
                    '<p class="examen-vacio">No tienes órdenes ni resultados de exámenes.</p>'
                );
                cargando(0);
                return;
            }

            var html = '';
            registros.forEach(function(examen) {
                var fecha = examen.fecha
                    ? escaparTextoConsentimiento(fechaHoraEsp(examen.fecha))
                    : 'Sin fecha';
                var nombre = escaparTextoConsentimiento(
                    examen.nombre || 'Examen sin nombre'
                );
                var profesional = escaparTextoConsentimiento(
                    examen.profesional || 'No informado'
                );
                var estado = escaparTextoConsentimiento(
                    examen.estado_examen || 'Orden emitida'
                );
                var numeroOrden = escaparTextoConsentimiento(
                    examen.numero_orden || ''
                );
                var archivos = Array.isArray(examen.archivos)
                    ? examen.archivos
                    : [];
                var botones = '';

                archivos.forEach(function(archivo) {
                    var url = escaparTextoConsentimiento(archivo.url || '');
                    var etiqueta = examen.tipo_registro === 'resultado'
                        ? 'Ver resultado'
                        : 'Ver orden';

                    if (url) {
                        botones +=
                            '<button type="button" data-role="none" class="examen-btn js-ver-examen" ' +
                                'data-examen-url="' + url + '">' +
                                escaparTextoConsentimiento(etiqueta) +
                            '</button>';
                    }
                });

                // Color del estado: disponible (verde agua), revisado (gris azulado), resto (pendiente, ámbar).
                var estadoTexto = String(examen.estado_examen || '').toLowerCase();
                var estadoClase = estadoTexto.indexOf('disponible') !== -1
                    ? 'examen-estado-ok'
                    : (estadoTexto.indexOf('revisado') !== -1 ? 'examen-estado-revisado' : 'examen-estado-pendiente');

                html +=
                    '<article class="examen-card">' +
                        '<div class="examen-card-cabecera">' +
                            '<h3 class="examen-card-nombre">' + nombre + '</h3>' +
                            '<span class="examen-estado ' + estadoClase + '">' + estado + '</span>' +
                        '</div>' +
                        '<dl class="examen-card-datos">' +
                            '<div><dt>Fecha</dt><dd>' + fecha + '</dd></div>' +
                            '<div><dt>Nº registro</dt><dd>' + (numeroOrden || '—') + '</dd></div>' +
                            '<div><dt>Profesional</dt><dd>' + profesional + '</dd></div>' +
                        '</dl>' +
                        (botones ? '<div class="examen-card-acciones">' + botones + '</div>' : '') +
                    '</article>';
            });

            $contenedor.html(html);
            cargando(0);
        },
        function(xhr) {
            var mensaje = xhr && xhr.status === 401
                ? 'Tu sesión expiró. Ingresa nuevamente.'
                : 'No fue posible cargar tus exámenes.';

            $contenedor.html(mensajeDocumentoClinico(mensaje));
            cargando(0);
        },
        'GET'
    );
};

// Texto único para cualquier dato vacío de la Ficha Médica Única.
const FMU_SIN_REGISTRO = 'Sin Registro';
const FMU_SIN_REGISTRO_HTML = '<li class="fmu-sin-registro">' + FMU_SIN_REGISTRO + '</li>';

const limpiarFmuAntesDeCargar = () => {
    const $paginaFmu = $('#fmu_paciente');
    const $tarjetas = $paginaFmu.find('.cards-grid .card-button');

    $paginaFmu.find('.cards-grid').addClass('fmu-datos-pendientes');

    // Nunca dejamos visibles datos del paciente anterior ni datos demo.
    $tarjetas.removeClass('fmu-card-sin-datos');
    $tarjetas.eq(0).find('h2').text('').removeClass('fmu-valor-vacio');
    $tarjetas.find('.card-list').empty();

    // Contacto de emergencia.
    $('#fmu_contactos_lista').empty();
    $('#fmu_atenciones_lista').empty();
    alternarAtencionesFMU(false);
    alternarOdontogramaFMU(false);

    // Odontograma e historial.
    $('#odontograma_fmu_superior, #odontograma_fmu_inferior, #odontograma_fmu_historial').empty();
    $('#odontograma_fmu_historial').hide();
};

const solicitarFmu = (forzar) => {
    limpiarFmuAntesDeCargar();

    // La FMU abierta por el propio paciente se obtiene directamente con el
    // token de sesión. No debe crear ni esperar una autorización de Medichile.
    // El backend obtiene el usuario desde X-Auth-Token, por lo que no enviamos
    // IDs ni tokens ficticios en la URL.
    var datos = {};
    if (forzar && typeof medsdiClearGetCache === 'function') {
        medsdiClearGetCache();
    }

    var api = new Api("paciente", "mi_ficha_medica");
    api.request(
        datos,
        function (resp) {
            try {
                LOG('fmu_user estado:' + resp.estado);
                console.log(resp);

                if (resp && Number(resp.estado) === 1) {
                    actualizarTarjetasFMU(resp);
                } else {
                    mostrarSinDatos();
                    msg('Formulario FMU', (resp && resp.mensaje) || 'No hay datos de ficha disponibles.', 'warning');
                }
            } catch (error) {
                console.error('[MED-SDI] Error mostrando la FMU:', error, resp);
                mostrarSinDatos();
                msg('Formulario FMU', 'No fue posible mostrar los datos recibidos.', 'error');
            } finally {
                $('#fmu_paciente .cards-grid').removeClass('fmu-datos-pendientes');
            }
        },
        function (xhr) {
            console.error('[MED-SDI] Error cargando la FMU:', xhr);
            mostrarSinDatos();
            $('#fmu_paciente .cards-grid').removeClass('fmu-datos-pendientes');

            var mensaje = xhr && xhr.status === 401
                ? 'Tu sesión expiró. Ingresa nuevamente.'
                : (xhr && xhr.status === 0
                    ? 'La consulta tardó demasiado. Revisa tu conexión e intenta nuevamente.'
                    : 'Error al cargar datos de FMU.');
            msg('Formulario FMU', mensaje, 'error');
        },
        "GET",
        false,
        45000
    );
}

const textoDatoProfesional = (valor) => {
    if (valor == null) return '';
    if (typeof valor === 'object') {
        return valor.nombre || valor.descripcion || valor.valor || '';
    }
    return String(valor);
};

// Primera letra en mayúscula sin alterar el resto (respeta siglas como "UCI").
const primeraMayuscula = (texto) => {
    const valor = String(texto || '').trim();
    return valor ? valor.charAt(0).toLocaleUpperCase('es') + valor.slice(1) : valor;
};

const solicitarMedicos = () => {
    var datos = {};
    datos.id_paciente = _SESSION('id_usuario');
    cargando(1);

    var api = new Api("paciente", "mis_profesionales");
    api.request(
        datos,
        function (resp) {
            LOG('medicos estado:'+resp.estado);
            console.log(resp);

            if (resp.estado == 1 && resp.medicos && resp.medicos.length > 0) {
                let htmlMedicos = '';
                resp.medicos.forEach(medico => {
                    let imagenMedico;
                    if(medico.foto_perfil && medico.foto_perfil !== '') {
                        imagenMedico = MEDSDI_WEB_URL + '/storage/'+medico.foto_perfil;
                    } else {
                        imagenMedico = medico.sexo === "M" ? 'src/images/ejemplo_dr.jpg' : 'src/images/ejemplo_dra.jpg';
                    }

                    fotosProfesionalesAgenda[medico.id] = {
                        src: imagenMedico,
                        fallback: medico.sexo === 'M' ? 'src/images/ejemplo_dr.jpg' : 'src/images/ejemplo_dra.jpg'
                    };

                    const nombreCompleto = [
                        medico.nombre,
                        medico.apellido_uno,
                        medico.apellido_dos
                    ].filter(Boolean).join(' ').trim() || 'Profesional';
                    const especialidadCompleta = [
                        textoDatoProfesional(medico.especialidad) || medico.nombre_especialidad,
                        textoDatoProfesional(medico.tipo_especialidad) || medico.nombre_tipo_especialidad,
                        textoDatoProfesional(medico.sub_tipo_especialidad) || medico.nombre_sub_tipo_especialidad
                    ].filter(Boolean).filter(function (valor, indice, lista) {
                        return lista.indexOf(valor) === indice;
                    }).join(' - ') || 'Especialidad no informada';
                    // En la card solo se muestra la especialidad más específica (ej.: Oftalmología).
                    const especialidadVisible = [
                        textoDatoProfesional(medico.sub_tipo_especialidad) || medico.nombre_sub_tipo_especialidad,
                        textoDatoProfesional(medico.tipo_especialidad) || medico.nombre_tipo_especialidad,
                        textoDatoProfesional(medico.especialidad) || medico.nombre_especialidad
                    ].map(function (valor) { return String(valor || '').trim(); }).filter(Boolean)[0]
                        || 'Especialidad no informada';
                    const lugarAtencion = medico.nombre_lugar_atencion
                        || medico.lugar_atencion
                        || medico.direccion
                        || 'Lugar de atención por confirmar';

                    // Escapar comillas para evitar errores de sintaxis
                    const nombreEscapado = nombreCompleto.replace(/'/g, "&apos;");
                    const especialidadEscapada = especialidadCompleta.replace(/'/g, "&apos;");

                    htmlMedicos += `
                        <div class="card-button-dos mb20">
                            <div class="row">
                                <div class="col-xs-3 text-center">
                                    <a href="javascript:void(0)" onclick="damePerfilMedico(${medico.id})"> <img class="img-circulo" width="70" src="${imagenMedico}" data-fallback="${medico.sexo === 'M' ? 'src/images/ejemplo_dr.jpg' : 'src/images/ejemplo_dra.jpg'}" alt="Foto perfil"> </a>
                                </div>
                                <div class="col-xs-9 medico-card-info">
                                    <p class="size16 color-azul mb5">${nombreEscapado}</p>
                                    <span class="medico-especialidad-badge">${escaparTextoConsentimiento(especialidadVisible)}</span>
                                    <p class="letra-small mb5"><img class="mr10" width="15" src="src/images/ubicacion.svg">${lugarAtencion}</p>
                                    <button type="button" data-role="none" class="btn-agendar-hora" onclick="agendarHora(${medico.id}, '${nombreEscapado}', '${especialidadEscapada}')">Agendar hora</button>
                                </div>
                            </div>
                        </div>
                        `;
                    });

                $('#lista-medicos').html(htmlMedicos);
            } else {
                $('#lista-medicos').html(`
                    <div class="card-button-dos mb20">
                        <div class="row">
                            <div class="col-xs-12 text-center pt20 pb20">
                                <p class="size18 color-azul">No hay profesionales asignados</p>
                                <p class="size14">Contacte a su centro médico para asignar profesionales</p>
                            </div>
                        </div>
                    </div>
                `);
            }
            cargando(0);
        },
        function (resp) {
            console.error('Error cargando médicos:', resp);
            cargando(0);
            msg('Médicos', 'Error al cargar datos de médicos', 'error');

            $('#lista-medicos').html(`
                <div class="card-button-dos mb20">
                    <div class="row">
                        <div class="col-xs-12 text-center pt20 pb20">
                            <p class="size18 color-rojo">Error al cargar profesionales</p>
                            <div class="btn-app4 mt10" onclick="solicitarMedicos()">Reintentar</div>
                        </div>
                    </div>
                </div>
            `);
        },
        "GET");
}

const abrirMisProfesionales = () => {
    setSession('origen_seleccion_profesional', 'mis_medicos');
    vista('mis_medicos', 'fade');
    solicitarMedicos();
};

const volverDesdePerfilProfesional = () => {
    const origen = getSession('origen_seleccion_profesional') || 'mis_medicos';
    vista(origen === 'mis_medicos_buscados' ? 'mis_medicos_buscados' : 'mis_medicos', 'fade');
};

const damePerfilMedico = (idMedico) => {
    console.log('Ver perfil médico ID:', idMedico);

    var datos = {
        id_profesional: idMedico
    };

    cargando(1);

    var api = new Api("profesionales", "perfil_profesional");
    api.request(
        datos,
        function (resp) {
            LOG('perfil medico estado:' + resp.estado);
            console.log(resp);

            if (resp.estado == 1 && resp.profesional) {
                const prof = resp.profesional;

                // Determinar imagen del médico
                let imagenMedico;
                if(prof.foto_perfil && prof.foto_perfil !== '') {
                    imagenMedico = MEDSDI_WEB_URL + '/storage/' + prof.foto_perfil;
                } else {
                    imagenMedico = prof.sexo === "M" ? 'src/images/ejemplo_dr.jpg' : 'src/images/ejemplo_dra.jpg';
                }

                // Generar HTML de lugares de atención
                if(prof.lugares_atencion && prof.lugares_atencion.length > 0) {
                    let lugares = '';
                    prof.lugares_atencion.forEach(lugar => {
                        lugares += `<li>${lugar.nombre} - ${lugar.direccion}</li>`;
                    });
                    prof.lugares_atencion_html = `<ul>${lugares}</ul>`;
                } else {
                    prof.lugares_atencion_html = '<p>No hay lugares de atención asignados</p>';
                }

                // Escapar datos antes de usarlos en HTML
                const nombreCompleto = `${prof.nombre} ${prof.apellido_uno} ${prof.apellido_dos || ''}`.trim();
                const especialidadCompleta = `${prof.especialidad?.nombre || 'No especificada'} - ${prof.tipo_especialidad?.nombre || 'No especificado'}`;

                // Escapar comillas para prevenir XSS
                const nombreEscapado = nombreCompleto.replace(/'/g, "&apos;");
                const especialidadEscapada = especialidadCompleta.replace(/'/g, "&apos;");

                $('#perfil-medico-content').html(`
                    <div class="card-button-dos mb20">
                        <div class="row">
                            <div class="col-xs-12 text-center mb20">
                                <img class="img-circulo" width="100" src="${imagenMedico}" data-fallback="${prof.sexo === 'M' ? 'src/images/ejemplo_dr.jpg' : 'src/images/ejemplo_dra.jpg'}" alt="Foto perfil">
                                <h3 class="color-azul mt10">${prof.nombre} ${prof.apellido_uno} ${prof.apellido_dos || ''}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="card-button-dos mb20">
                        <div class="row">
                            <div class="col-xs-12">
                                <p class="size16 color-azul mb10"><strong>Información Profesional</strong></p>
                                <p class="size14 mb5"><strong>Especialidad:</strong> ${prof.especialidad?.nombre || 'No especificada'}</p>
                                <p class="size14 mb5"><strong>Tipo:</strong> ${prof.tipo_especialidad?.nombre || 'No especificado'}</p>
                                <p class="size14 mb5"><strong>Sub-especialidad:</strong> ${prof.sub_tipo_especialidad?.nombre || 'No especificado'}</p>
                                ${prof.experiencia ? `<p class="size14 mb5"><strong>Experiencia:</strong> ${prof.experiencia}</p>` : ''}
                                ${prof.titulo ? `<p class="size14 mb5"><strong>Título:</strong> ${prof.titulo}</p>` : ''}
                                <p class="size14 mb5"><strong>Lugares de Atención:</strong></p>
                                <div class="size14 mb5">${prof.lugares_atencion_html}</div>
                            </div>
                        </div>
                    </div>
                    ${prof.biografia ? `
                    <div class="card-button-dos mb20">
                        <div class="row">
                            <div class="col-xs-12">
                                <p class="size16 color-azul mb10"><strong>Biografía</strong></p>
                                <p class="size14">${prof.biografia}</p>
                            </div>
                        </div>
                    </div>` : ''}
                    <div class="card-button-dos mb20">
                        <div class="row">
                            <div class="col-xs-12">
                                <button type="button" data-role="none" class="btn-agendar-hora" onclick="agendarHora(${prof.id},'${nombreEscapado}','${especialidadEscapada}')">Agendar hora</button>
                            </div>
                        </div>
                    </div>
                `);

                vista('perfil_medico', 'fade');
            } else {
                msg('Perfil Médico', 'No se pudo cargar la información del profesional', 'error');
            }
            cargando(0);
        },
        function (resp) {
            console.error('Error cargando perfil médico:', resp);
            cargando(0);
            msg('Error', 'Error al cargar perfil del profesional', 'error');
        },
        "GET"
    );
}

const agendarHora = (idMedico, nombreMedico, especialidad) => {
    console.log('Agendar hora con médico ID:', idMedico);

    var datos = {
        id_profesional: idMedico
    };

    cargando(1);

    var api = new Api("profesionales", "mis_lugares_atencion");
    api.request(
        datos,
        function (resp) {
            LOG('lugares atencion estado:' + resp.estado);
            console.log(resp);

            if (resp.estado == 1 && resp.registros && resp.registros.length > 0) {
                // Guardar información del médico en sesión
                setSession('id_medico_seleccionado', idMedico);
                setSession('nombre_medico_seleccionado', nombreMedico);
                setSession('especialidad_medico_seleccionado', especialidad);
                const fotoElegida = fotosProfesionalesAgenda[idMedico] || {};
                setSession('foto_medico_seleccionado', fotoElegida.src || '');
                setSession('foto_fallback_medico_seleccionado', fotoElegida.fallback || '');

                // Actualizar el header con la información del médico y botón de retorno
                const origen = getSession('origen_seleccion_profesional') || 'mis_medicos';
                const vistaRetorno = origen === 'mis_medicos_buscados' ? 'mis_medicos_buscados' : 'mis_medicos';
                const textoRetorno = origen === 'mis_medicos_buscados'
                    ? 'Volver a resultados'
                    : 'Volver a mis profesionales';

                $('#lugares_atencion .top-titulos').html(`
                    ${htmlCardProfesionalAgenda(nombreMedico, especialidad)}
                    <div class="btn-app4 btn-volver-compacto text-center size14 mb20" onclick="vista('${vistaRetorno}');">
                         ${textoRetorno}
                    </div>
                    <p class="size14 text-center mb10">Seleccione el lugar de atención</p>
                `);

                // Generar HTML de lugares de atención
                let htmlLugaresAtencion = '';
                resp.registros.forEach(lugar => {
                    htmlLugaresAtencion += `
                    <div class="card-button-dos mb20">
                        <div class="row">
                            <div class="col-xs-12 text-left">
                                <div class="media">
                                    <img src="src/images/clinica.png" class="img-circulo text-center mr10" width="80" alt="Centro médico">
                                    <div class="media-body text-left lugar-atencion-info">
                                        <p class="size14 color-azul">${lugar.nombre}</p>
                                        <p class="size13"><img class="mr10" width="20" src="src/images/ubicacion.svg">${[lugar.direccion, lugar.ciudad].map(v => String(v == null ? '' : v).trim()).filter(v => v && v !== 'undefined' && v !== 'null').join(' - ') || 'Dirección no informada'}</p>

                                        <button type="button" data-role="none" class="btn-agendar-hora" onclick="seleccionarLugarAtencion(${lugar.id},${idMedico},'${lugar.nombre}')">Seleccionar</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    `;
                });

                $('#lista-lugares').html(htmlLugaresAtencion);
                vista('lugares_atencion', 'fade');

            } else {
                msg('Agendar Hora', 'El profesional no tiene lugares de atención asignados.', 'warning');
            }

            cargando(0);
        },
        function (resp) {
            console.error('Error cargando lugares de atención:', resp);
            cargando(0);
            msg('Error', 'Error al cargar lugares de atención del profesional', 'error');
        },
        "GET"
    );
}

const actualizarTarjetasFMU = (fmu) => {
    const $paginaFmu = $('#fmu_paciente');
    const $tarjetas = $paginaFmu.find('.cards-grid .card-button');
    let antecedentes = Array.isArray(fmu.antecedentes) ? fmu.antecedentes : [];
    let alergias = [];
    let enfermedades = [];
    let medicamentos = [];
    let cirugias = [];
    const datoAntecedente = (antecedente, campo, valorPorDefecto) => {
        let datos = antecedente && antecedente.antecedente_data;

        if (typeof datos === 'string') {
            try {
                datos = JSON.parse(datos);
            } catch (error) {
                datos = {};
            }
        }

        datos = datos && typeof datos === 'object' ? datos : {};
        return datos[campo] || valorPorDefecto || '';
    };

    antecedentes.forEach(antecedente => {
        const tipoAntecedente = Number(antecedente.id_tipo_antecedente);
        if(tipoAntecedente === 6) { // Alergia
            alergias.push(antecedente);
        } else if (tipoAntecedente === 1) { // Patología crónica
            enfermedades.push(antecedente);
        }else if (tipoAntecedente === 3) { // Cirugía
            cirugias.push(antecedente);
        } else if (tipoAntecedente === 4) { // Medicamento Crónico
            medicamentos.push(antecedente);
        }
    });

    // Grupo Sanguíneo
    const grupoSanguineo = fmu.grupo_sanguineo && fmu.grupo_sanguineo.nombre_gs ? fmu.grupo_sanguineo.nombre_gs : '';
    $tarjetas.eq(0).find('h2').text(grupoSanguineo || FMU_SIN_REGISTRO).toggleClass('fmu-valor-vacio', !grupoSanguineo);

    let ultima_alergia = alergias.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    fmu.ultima_alergia = ultima_alergia || null;
    // Alergias
    if(fmu.ultima_alergia) {
        $tarjetas.eq(1).find('.card-list').html(
            `<li>${datoAntecedente(fmu.ultima_alergia, 'nombre', 'Alergia sin detalle')}</li>`
        );
    } else {
        $tarjetas.eq(1).find('.card-list').html(FMU_SIN_REGISTRO_HTML);
    }

    if(enfermedades.length > 0) {
        let htmlEnfermedades = '';
        enfermedades.forEach(enfermedad => {
            htmlEnfermedades += `<li>${datoAntecedente(enfermedad, 'nombre', 'Sin detalle')}</li>`;
        });
        $tarjetas.eq(2).find('.card-list').html(htmlEnfermedades);
    } else {
        $tarjetas.eq(2).find('.card-list').html(FMU_SIN_REGISTRO_HTML);
    }

    // Medicamentos Crónicos
    if (fmu.medicamentos_cronicos && fmu.medicamentos_cronicos.length > 0) {
        let htmlMedicamentosCronicos = '';
        fmu.medicamentos_cronicos.forEach(medicamento => {
            htmlMedicamentosCronicos += `<li>${medicamento.nombre}</li>`;
        });
        $tarjetas.eq(3).find('.card-list').html(htmlMedicamentosCronicos);
    } else {
        $tarjetas.eq(3).find('.card-list').html(FMU_SIN_REGISTRO_HTML);
    }

    // Últimos Medicamentos
    if (fmu.ultimos_medicamentos && fmu.ultimos_medicamentos.length > 0) {
        let htmlUltimosMeds = '';
        fmu.ultimos_medicamentos.forEach(medicamento => {
            const fecha = fechaEsp(medicamento.fecha);
            htmlUltimosMeds += `<li>${medicamento.nombre}<br><span class="fecha-small">${fecha}</span></li>`;
        });
        $tarjetas.eq(4).find('.card-list').html(htmlUltimosMeds);
    } else {
        $tarjetas.eq(4).find('.card-list').html(FMU_SIN_REGISTRO_HTML);
    }

    // Último Diagnóstico
    if (fmu.fichas && fmu.fichas.length > 0) {
        // Ordenar por fecha descendente y tomar el primero
        const ultimaFicha = fmu.fichas.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        const fecha = fechaEsp(ultimaFicha.created_at);
        const diagnostico = `<li>${ultimaFicha.hipotesis_diagnostico}<br><span class="fecha-small">${fecha}</span></li>`;
        $tarjetas.eq(5).find('.card-list').html(diagnostico);
    } else {
        $tarjetas.eq(5).find('.card-list').html(FMU_SIN_REGISTRO_HTML);
    }

    let ultima_cirugia = cirugias.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    fmu.ultima_cirugia = ultima_cirugia || null;

    // Última Cirugía
    if (fmu.ultima_cirugia) {
        const fecha = fechaEsp(fmu.ultima_cirugia.created_at);
        $tarjetas.eq(6).find('.card-list').html(
            `<li>${datoAntecedente(fmu.ultima_cirugia, 'procedimiento', 'Cirugía sin detalle')} - ${fmu.ultima_cirugia.comentario || ''}<br><span class="fecha-small">${fecha}</span></li>`
        );
    } else {
        $tarjetas.eq(6).find('.card-list').html(FMU_SIN_REGISTRO_HTML);
    }

    // Prótesis y Ortesis
    if (fmu.protesis_ortesis && fmu.protesis_ortesis.length > 0) {
        let htmlProtesis = '';
        fmu.protesis_ortesis.forEach(item => {
            htmlProtesis += `<li>${item.nombre}</li>`;
        });
        $tarjetas.eq(7).find('.card-list').html(htmlProtesis);
    } else {
        $tarjetas.eq(7).find('.card-list').html(FMU_SIN_REGISTRO_HTML);
    }

    // Historial de atenciones
    renderizarAtencionesFMU(fmu.fichas);

    // Contactos de Emergencia (acepta un objeto o una lista desde el backend)
    renderizarContactosEmergenciaFMU(fmu.contactos_emergencia || fmu.contacto_emergencia);

    renderizarOdontogramaFMU(fmu.odontograma || []);
}

const escaparHtmlFmu = (valor) => String(valor == null ? '' : valor)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const capitalizarFmu = (valor) => {
    const texto = String(valor == null ? '' : valor).trim();
    return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : '';
};

// Historial de atenciones de la FMU: solo las últimas 7, más recientes primero.
const FMU_ATENCIONES_POR_PAGINA = 7;
let fmuAtenciones = [];
let fmuAtencionesVisibles = 0;

const pintarAtencionesFMU = () => {
    const $lista = $('#fmu_atenciones_lista');

    if (fmuAtenciones.length === 0) {
        $lista.html('<li class="fmu-atencion-vacia">' + FMU_SIN_REGISTRO + '</li>');
        return;
    }

    const html = fmuAtenciones.slice(0, fmuAtencionesVisibles).map(ficha => {
        // En minúsculas: el CSS lo muestra con text-transform: capitalize.
        const diagnostico = String(ficha.hipotesis_diagnostico || '').trim().toLowerCase() || FMU_SIN_REGISTRO;
        return '<li class="fmu-atencion-item">' +
            '<span class="fmu-atencion-fecha">' + escaparHtmlFmu(fechaEsp(ficha.created_at)) + '</span>' +
            '<p class="fmu-atencion-diagnostico">' + escaparHtmlFmu(diagnostico) + '</p>' +
        '</li>';
    }).join('');

    $lista.html(html);
};

// Acordeón genérico de la FMU: abre/cierra la card indicada por su id.
const alternarAcordeonFMU = (idCard, abrir) => {
    const $card = $('#' + idCard);
    const $toggle = $card.find('.fmu-acordeon-header').first();
    const abierto = typeof abrir === 'boolean' ? abrir : $toggle.attr('aria-expanded') !== 'true';

    $toggle.attr('aria-expanded', abierto ? 'true' : 'false');
    $card.toggleClass('fmu-acordeon-abierto', abierto);
    $card.find('.fmu-acordeon-cuerpo').first().prop('hidden', !abierto);
};

const alternarAtencionesFMU = (abrir) => alternarAcordeonFMU('fmu_atenciones', abrir);
const alternarOdontogramaFMU = (abrir) => alternarAcordeonFMU('odontograma_fmu', abrir);

const renderizarAtencionesFMU = (fichas) => {
    fmuAtenciones = (Array.isArray(fichas) ? fichas : [])
        .filter(f => f && !(f.confidencial === true || String(f.confidencial) === '1'))
        .slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    fmuAtencionesVisibles = Math.min(FMU_ATENCIONES_POR_PAGINA, fmuAtenciones.length);
    pintarAtencionesFMU();
};

// Muestra solo el primer nombre y el primer apellido del contacto.
const nombreCortoContactoFMU = (c) => {
    const partes = String(c.nombre || '').trim().split(/\s+/).filter(Boolean);
    const apellidoSeparado = String(c.apellido_uno || c.apellido_paterno || c.apellido || '').trim().split(/\s+/)[0];
    let resultado;

    if (apellidoSeparado) {
        resultado = [partes[0], apellidoSeparado];
    } else if (partes.length <= 2) {
        resultado = partes;
    } else if (partes.length === 3) {
        // Nombre + apellido paterno + apellido materno
        resultado = [partes[0], partes[1]];
    } else {
        // Dos nombres + apellido paterno + apellido materno
        resultado = [partes[0], partes[partes.length - 2]];
    }

    return resultado.filter(Boolean).map(capitalizarFmu).join(' ');
};

// Abre el marcador del teléfono. En Android (Cordova) usa el navegador del sistema.
const llamarContactoEmergenciaFMU = (telUrl) => {
    if (!telUrl || telUrl === 'tel:') return false;
    if (window.cordova && cordova.InAppBrowser) {
        cordova.InAppBrowser.open(telUrl, '_system');
    } else {
        window.location.href = telUrl;
    }
    return false;
};

const renderizarContactosEmergenciaFMU = (datos) => {
    const $lista = $('#fmu_contactos_lista');
    let contactos = Array.isArray(datos) ? datos : (datos ? [datos] : []);

    contactos = contactos.filter(c => c && (c.nombre || c.telefono || c.parentezco || c.parentesco));

    if (contactos.length === 0) {
        $lista.html('<li class="fmu-contacto-vacio">' + FMU_SIN_REGISTRO + '</li>');
        return;
    }

    const html = contactos.map(c => {
        const nombre = nombreCortoContactoFMU(c) || FMU_SIN_REGISTRO;
        const parentesco = capitalizarFmu(c.parentezco || c.parentesco) || FMU_SIN_REGISTRO;
        const telefono = String(c.telefono || '').trim();
        const telefonoHtml = telefono
            ? '<a class="fmu-contacto-telefono" data-ajax="false" rel="external" href="tel:' + escaparHtmlFmu(telefono.replace(/[^\d+]/g, '')) + '" onclick="return llamarContactoEmergenciaFMU(this.getAttribute(\'href\'));">' +
                '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>' +
                '<span>' + escaparHtmlFmu(telefono) + '</span></a>'
            : '<span class="fmu-contacto-telefono fmu-contacto-telefono-vacio">' + FMU_SIN_REGISTRO + '</span>';

        return '<li class="fmu-contacto-item">' +
            '<div class="fmu-contacto-info">' +
                '<p class="fmu-contacto-nombre">' + escaparHtmlFmu(nombre) + '</p>' +
                '<span class="fmu-contacto-parentesco">' + escaparHtmlFmu(parentesco) + '</span>' +
            '</div>' +
            telefonoHtml +
        '</li>';
    }).join('');

    $lista.html(html);
};

let odontogramaFmuActual = {};

const piezasOdontogramaSuperior = ['1.8','1.7','1.6','1.5','1.4','1.3','1.2','1.1','2.1','2.2','2.3','2.4','2.5','2.6','2.7','2.8'];
const piezasOdontogramaInferior = ['4.8','4.7','4.6','4.5','4.4','4.3','4.2','4.1','3.1','3.2','3.3','3.4','3.5','3.6','3.7','3.8'];

const estadoPiezaOdontograma = (historial) => {
    let estado = 'normal';
    historial.forEach(function(registro) {
        const diagnostico = String(registro.diagnostico || '').toLowerCase();
        const tratamiento = String(registro.tratamiento || '').toLowerCase();
        if (diagnostico.indexOf('carie') !== -1) estado = 'carie';
        if (tratamiento.indexOf('implante') !== -1) {
            estado = String(registro.estado) === '0' ? 'ausente' : 'implante';
        }
        if (tratamiento.indexOf('endodoncia') !== -1 || tratamiento.indexOf('pulpotomia') !== -1 || tratamiento.indexOf('pulpectomia') !== -1) {
            estado = 'endodoncia';
        }
    });
    return estado;
};

const renderizarFilaOdontogramaFMU = (piezas) => piezas.map(function(pieza) {
    const historial = odontogramaFmuActual[pieza] || [];
    const estado = estadoPiezaOdontograma(historial);
    const codigoImagen = pieza.replace('.', '');
    let carpeta = '';
    let prefijo = 'd';
    if (estado === 'carie') { carpeta = 'carie/'; prefijo = 'carie'; }
    if (estado === 'endodoncia') { carpeta = 'endodoncia/'; prefijo = 'endo'; }
    if (estado === 'implante') { carpeta = 'implante/'; prefijo = 'impl'; }
    if (estado === 'ausente') { carpeta = 'diente-ausente/'; prefijo = 'dau'; }
    const imagen = MEDSDI_WEB_URL + '/images/dental/dientes/' + carpeta + prefijo + codigoImagen + '.png';
    const indicador = historial.length ? '<span class="odontograma-pieza-cantidad">' + historial.length + '</span>' : '';
    return '<button type="button" class="odontograma-pieza estado-' + estado + '" onclick="mostrarHistorialDental(\'' + pieza + '\')">' +
        indicador + '<img src="' + imagen + '" alt="Pieza ' + pieza + '" onerror="this.style.visibility=\'hidden\'">' +
        '<strong>' + pieza + '</strong></button>';
}).join('');

const renderizarOdontogramaFMU = (registros) => {
    odontogramaFmuActual = {};
    (Array.isArray(registros) ? registros : []).forEach(function(registro) {
        const pieza = String(registro.pieza || '').trim();
        if (!pieza) return;
        if (!odontogramaFmuActual[pieza]) odontogramaFmuActual[pieza] = [];
        odontogramaFmuActual[pieza].push(registro);
    });
    $('#odontograma_fmu_superior').html(renderizarFilaOdontogramaFMU(piezasOdontogramaSuperior));
    $('#odontograma_fmu_inferior').html(renderizarFilaOdontogramaFMU(piezasOdontogramaInferior));
    $('#odontograma_fmu_historial').hide().empty();
};

const mostrarHistorialDental = (pieza) => {
    const historial = (odontogramaFmuActual[pieza] || []).slice().sort(function(a, b) {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
    let contenido = '<div class="odontograma-historial-titulo"><strong>Pieza ' + pieza + '</strong><button type="button" onclick="cerrarHistorialDental()">×</button></div>';
    if (!historial.length) {
        contenido += '<p class="odontograma-sin-registros">Esta pieza no tiene registros odontológicos.</p>';
    } else {
        historial.forEach(function(registro) {
            const fecha = registro.created_at ? fechaEsp(registro.created_at) : 'Fecha no informada';
            const diagnostico = escaparTextoConsentimiento(registro.diagnostico || 'Sin diagnóstico informado');
            const tratamiento = escaparTextoConsentimiento(registro.tratamiento || registro.descripcion || 'Sin tratamiento informado');
            contenido += '<div class="odontograma-historial-item"><span>' + escaparTextoConsentimiento(fecha) + '</span>' +
                '<b>' + diagnostico + '</b><p>' + tratamiento + '</p></div>';
        });
    }
    $('#odontograma_fmu_historial').html(contenido).slideDown(180);
};

const cerrarHistorialDental = () => $('#odontograma_fmu_historial').slideUp(150);
const alternarLeyendaOdontograma = () => $('#odontograma_fmu_leyenda').slideToggle(150);

const mostrarSinDatos = () => {
    // Mostrar mensajes por defecto cuando no hay datos
    const $paginaFmu = $('#fmu_paciente');
    $paginaFmu.find('.cards-grid .card-button').eq(0).find('h2').text(FMU_SIN_REGISTRO).addClass('fmu-valor-vacio');
    // Las tarjetas sin datos se siguen mostrando, con "Sin Registro".
    $paginaFmu.find('.cards-grid .card-button .card-list').html(FMU_SIN_REGISTRO_HTML);
    renderizarOdontogramaFMU([]);
    renderizarContactosEmergenciaFMU(null);
    renderizarAtencionesFMU(null);
}

var citasPacienteRegistros = [];
var citasPacienteFiltro = 'todas';

const estadoFiltroCita = (hora) => {
    var estado = Number(hora && hora.id_estado);
    if (estado === 1) return 'reservadas';
    if (estado === 2) return 'confirmadas';
    return 'otras';
};

const actualizarContadoresCitas = () => {
    var contadores = {
        todas: citasPacienteRegistros.length,
        reservadas: 0,
        confirmadas: 0,
        otras: 0
    };

    citasPacienteRegistros.forEach(function(hora) {
        var grupo = estadoFiltroCita(hora);
        contadores[grupo] = (contadores[grupo] || 0) + 1;
    });

    $('#citas-contador-todas').text(contadores.todas);
    $('#citas-contador-reservadas').text(contadores.reservadas);
    $('#citas-contador-confirmadas').text(contadores.confirmadas);
    $('#citas-contador-otras').text(contadores.otras);

    return contadores;
};

const cambiarFiltroCitas = (filtro) => {
    citasPacienteFiltro = ['todas', 'reservadas', 'confirmadas', 'otras'].includes(filtro)
        ? filtro
        : 'todas';

    $('#citas .citas-filtro')
        .removeClass('active')
        .attr('aria-selected', 'false');

    $('#citas .citas-filtro[data-filtro="' + citasPacienteFiltro + '"]')
        .addClass('active')
        .attr('aria-selected', 'true');

    cerrarFiltroCitas();
    renderizarCitasPaciente();
};

// Botón de filtro + hoja inferior con los estados (vista Mis citas agendadas).
const abrirFiltroCitas = () => { $('#citas_filtro_sheet').addClass('sheet-abierta'); };
const cerrarFiltroCitas = () => { $('#citas_filtro_sheet').removeClass('sheet-abierta'); };

const renderizarCitasPaciente = () => {
    var registros = citasPacienteRegistros.filter(function(hora) {
        return citasPacienteFiltro === 'todas' || estadoFiltroCita(hora) === citasPacienteFiltro;
    });

    var etiquetas = {
        todas: 'Todas las citas',
        reservadas: 'Horas que necesitan tu confirmación',
        confirmadas: 'Horas confirmadas',
        otras: 'Horas en otros estados'
    };

    $('#citas-filtro-resumen').text(
        etiquetas[citasPacienteFiltro] + ' · ' + registros.length + ' resultado(s)'
    );

    if (!registros.length) {
        $('#lista-horas').html(`
            <div class="citas-vacio">
                <span class="citas-vacio-icono">⌕</span>
                <strong>No hay citas en este filtro</strong>
                <p>Prueba seleccionando otra categoría.</p>
            </div>
        `);
        return;
    }

    let htmlHoras = '';

    registros.forEach(hora => {
        const fecha = fechaEsp(hora.fecha_consulta);
        const soloHoraMinutos = (valor) => {
            const coincide = String(valor || '').match(/(\d{1,2}):(\d{2})/);
            return coincide ? coincide[1].padStart(2, '0') + ':' + coincide[2] : '';
        };
        const horaInicio = soloHoraMinutos(hora.hora_inicio) || 'No especificada';
        const horaTermino = soloHoraMinutos(hora.hora_termino) || 'No especificada';
        const medico = hora ? `${hora.nombre_profesional} ${hora.apellido_uno_profesional}` : 'No asignado';
        const especialidad = hora && hora.nombre_especialidad ? hora.nombre_especialidad : 'No especificada';
        const tipo_especialidad = hora && hora.nombre_tipo_especialidad ? hora.nombre_tipo_especialidad : 'No especificada';
        const sub_tipo_especialidad = hora && hora.nombre_sub_tipo_especialidad ? hora.nombre_sub_tipo_especialidad : '';
        const estado = Number(hora.id_estado);
        const estadoHora = estado === 1
            ? 'Reservada'
            : (estado === 2 ? 'Confirmada' : (hora.estado || 'Rechazada'));

        // Colores de la agenda web: 1 = reservada, 2 = confirmada, 5 = realizando atención.
        const estadoClase = estado === 1
            ? 'reservada'
            : (estado === 2 ? 'confirmada' : (estado === 5 ? 'realizando' : 'otra'));

        // Reservada, confirmada y realizando usan el color que envía el backend
        // (tabla parametros, el mismo de la agenda web). Si no llega, queda el del CSS.
        const colorEstado = [1, 2, 5].includes(estado) && /^#[0-9a-f]{3,8}$/i.test(String(hora.estado_color || ''))
            ? hora.estado_color
            : '';
        const estiloEstado = colorEstado ? ` style="background:${colorEstado}"` : '';

        const botonesHtml = estado === 1 ? `
            <div class="cita-acciones">
                <button type="button" data-role="none" class="cita-btn confirmar"
                        onclick="confirmarHoraMedicaAgendada(${hora.id})">
                    <span>✓</span> Confirmar hora
                </button>
                <button type="button" data-role="none" class="cita-btn anular"
                        onclick="cancelarHoraMedica(${hora.id})">
                    Anular hora
                </button>
            </div>
        ` : '';

        const botonAnularHtml = estado === 2 ? `
            <div class="cita-acciones una">
                <button type="button" data-role="none" class="cita-btn anular"
                        onclick="cancelarHoraMedica(${hora.id})">
                    Anular hora
                </button>
            </div>
        ` : '';

        const botonVideoHtml = hora.es_telemedicina && hora.puede_conectarse && hora.video_url ? `
                <button type="button" data-role="none" class="cita-btn videollamada"
                        onclick="abrirVideollamadaApp('${hora.video_url}')">
                    Iniciar videollamada
                </button>
            ` : '';

        let imagenMedico = '';
        if (hora.foto_perfil && hora.foto_perfil !== '') {
            imagenMedico = MEDSDI_WEB_URL + '/storage/' + hora.foto_perfil;
        } else {
            imagenMedico = hora.sexo === "M"
                ? 'src/images/ejemplo_dr.jpg'
                : 'src/images/ejemplo_dra.jpg';
        }

        htmlHoras += `
            <article class="cita-paciente-card">
                <div class="cita-paciente-header">
                    <img class="cita-paciente-avatar" src="${imagenMedico}" data-fallback="${hora.sexo === 'M' ? 'src/images/ejemplo_dr.jpg' : 'src/images/ejemplo_dra.jpg'}" alt="Foto perfil">
                    <div>
                        <h3>${escaparTextoConsentimiento(medico)}</h3>
                        <p>${escaparTextoConsentimiento(especialidad)}${tipo_especialidad ? ' · ' + escaparTextoConsentimiento(tipo_especialidad) : ''}</p>
                        ${sub_tipo_especialidad ? `<small>${escaparTextoConsentimiento(sub_tipo_especialidad)}</small>` : ''}
                    </div>
                    <span class="cita-estado ${estadoClase}"${estiloEstado}>${escaparTextoConsentimiento(estadoHora)}</span>
                </div>

                <div class="cita-paciente-datos">
                    <div><img src="src/images/calendario.svg" alt=""><span>${fecha}</span></div>
                    <div><img src="src/images/hora.svg" alt=""><span>${horaInicio} - ${horaTermino}</span></div>
                    <div class="ancho"><img src="src/images/ubicacion.svg" alt=""><span>${escaparTextoConsentimiento(hora.nombre_lugar_atencion || 'Sin lugar')}</span></div>
                    ${hora.direccion_lugar_atencion ? `<p>${escaparTextoConsentimiento(hora.direccion_lugar_atencion)} ${escaparTextoConsentimiento(hora.numero_dir_lugar_atencion || '')}</p>` : ''}
                </div>

                ${botonesHtml}
                ${botonAnularHtml}
                ${botonVideoHtml}
            </article>
        `;
    });

    $('#lista-horas').html(htmlHoras);
};

const solicitarMisHorasMedicas = (forzar) => {
    var datos = {};
    datos.id_paciente = _SESSION('id_usuario');

    cargando(1);

    var api = new Api("paciente", "agenda");
    api.request(
        datos,
        function (resp) {
            LOG('mis horas estado:' + resp.estado);

            // Las horas anuladas/canceladas no se muestran ni cuentan en los totales.
            citasPacienteRegistros = resp.estado == 1
                ? horasVigentes(resp.horas)
                : [];

            actualizarContadoresCitas();
            renderizarCitasPaciente();
            cargando(0);
        },
        function (resp) {
            console.error('Error cargando horas médicas:', resp);
            cargando(0);
            msg('Horas Médicas', 'Error al cargar horas médicas', 'error');
            $('#lista-horas').html(`
                <div class="citas-vacio error">
                    <strong>No fue posible cargar tus citas</strong>
                    <button type="button" data-role="none" onclick="solicitarMisHorasMedicas(true)">Reintentar</button>
                </div>
            `);
        },
        "GET",
        null,
        forzar === true ? {cacheTtl: 0} : undefined
    );
}

const guardarAtencion = () => {
    // Recopilar datos del formulario
    const datos = {
        id_paciente: _SESSION('id_usuario'),
        rut_profesional: $.trim($('#rut_profesional').val()),
        nombre_profesional: $.trim($('#nombre_profesional').val()),
        correo_profesional: $.trim($('#correo_profesional').val()),
        telefono_profesional: $.trim($('#telefono_profesional').val()),
        especialidad: $.trim($('#esp_profesional').val()),
        tipo_especialidad: $.trim($('#tipo_esp_profesional').val()),
        sub_tipo_especialidad: $.trim($('#sub_tipo_esp_profesional').val()),
        diagnosticos: $.trim($('#diagnosticos').val()),
        examenes: $.trim($('#examenes').val()),
        medicamentos: $.trim($('#medicamentos').val()),
        rut_dependiente: $.trim($('#rut_dependiente').val()), // Por si es un dependiente
        token: "mobile-original-" + Date.now()
    };

    // Validaciones básicas
    if (!datos.rut_profesional || !datos.nombre_profesional || !datos.correo_profesional) {
        msg('Atención Médica', 'Debe completar RUT, nombre y correo del profesional', 'warning');
        return;
    }

    if (!datos.diagnosticos && !datos.examenes && !datos.medicamentos) {
        msg('Atención Médica', 'Debe completar al menos un campo: diagnósticos, exámenes o medicamentos', 'warning');
        return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(datos.correo_profesional)) {
        msg('Atención Médica', 'Ingrese un correo electrónico válido', 'warning');
        return;
    }

    cargando(1);

    var api = new Api("paciente", "ficha-atencion-app");
    api.request(
        datos,
        function (resp) {
            console.log('Respuesta guardar atención:', resp);

            if (resp.estado == 1) {
                msg('Atención Médica', 'Atención guardada correctamente', 'success');
                limpiarFormularioAtencion();
            } else {
                msg('Atención Médica', resp.mensaje || 'Error al guardar la atención', 'error');
            }
            cargando(0);
        },
        function (resp) {
            console.error('Error guardando atención:', resp);
            cargando(0);
            msg('Atención Médica', 'Error de conexión al guardar la atención', 'error');
        },
        "POST");
}

const solicitarEspecialidades = (select) => {
    var datos = {};
    cargando(1);
    var api = new Api("profesionales", "especialidades");
    api.request(
        datos,
        function (resp) {
            LOG('especialidades estado:' + resp.estado);
            if (resp.estado == 1 && resp.especialidades) {
                let opciones = '<option value="">Seleccione especialidad</option>';
                resp.especialidades.forEach(esp => {
                    opciones += `<option value="${esp.id}">${esp.nombre}</option>`;
                });
                $(`#${select}`).html(opciones);
            } else {
                $(`#${select}`).html('<option value="">No hay especialidades</option>');
            }
            cargando(0);
        },
        function (resp) {
            console.error('Error cargando especialidades:', resp);
            cargando(0);
            msg('Especialidades', 'Error al cargar especialidades', 'error');
            $(`#${select}`).html('<option value="">Error al cargar especialidades</option>');
        },
        "GET");
}

const cargarTipoEspecialidad = (select, selectIdEspecialidad) => {
    const idEspecialidad = $(`#${selectIdEspecialidad}`).val();
    if (!idEspecialidad) {
        $(`#${select}`).html('<option value="">Seleccione especialidad primero</option>');
        return;
    }

    var datos = { id_especialidad: idEspecialidad };
    cargando(1);
    var api = new Api("profesionales", "tipo_especialidades");
    api.request(
        datos,
        function (resp) {
            LOG(resp);
            LOG('tipo especialidades estado:' + resp.estado);
            if (resp.estado == 1 && resp.tipo_especialidades) {
                let opciones = '<option value="">Seleccione tipo de especialidad</option>';
                resp.tipo_especialidades.forEach(tipo => {
                    opciones += `<option value="${tipo.id}">${tipo.nombre}</option>`;
                });
                $(`#${select}`).html(opciones);
            } else {
                $(`#${select}`).html('<option value="">No hay tipos de especialidades</option>');
            }
            cargando(0);
        },
        function (resp) {
            console.error('Error cargando tipo-especialidades:', resp);
            cargando(0);
            msg('Tipo-Especialidades', 'Error al cargar tipo-especialidades', 'error');
            $(`#${select}`).html('<option value="">Error al cargar tipo-especialidades</option>');
        },
        "GET"
    );
}

const cargarSubTipoEspecialidad = (select,selectIdTipoEspecialidad) => {
    const idTipoEspecialidad = $(`#${selectIdTipoEspecialidad}`).val();

    if (!idTipoEspecialidad) {
        $(`#${select}`).html('<option value="">Seleccione tipo-especialidad primero</option>');
        return; // Salir temprano de la función
    }

    var datos = { id_tipo_especialidad: idTipoEspecialidad };
    cargando(1);

    var api = new Api("profesionales", "sub_tipo_especialidades");
    api.request(
        datos,
        function (resp) {
            LOG('sub tipo especialidades estado:' + resp.estado);
            if (resp.estado == 1 && resp.sub_tipo_especialidades && resp.sub_tipo_especialidades.length > 0) {
                let opciones = '<option value="">Seleccione sub-tipo especialidad</option>';
                resp.sub_tipo_especialidades.forEach(subtipo => {
                    opciones += `<option value="${subtipo.id}">${subtipo.nombre}</option>`;
                });
                $(`#${select}`).html(opciones);
            } else {
                $(`#${select}`).html('<option value="">No hay sub-tipo especialidades disponibles</option>');
            }
            cargando(0);
        },
        function (resp) {
            console.error('Error cargando sub-tipo especialidades:', resp);
            cargando(0);
            msg('Sub-Tipo Especialidades', 'Error al cargar sub-tipo especialidades', 'error');
            $(`#${select}`).html('<option value="">Error al cargar datos</option>');
        },
        "GET"
    );
}

var modalidadesAgendaContexto = null;
var prestacionesAgendaContexto = null;

const seleccionarLugarAtencion = (idLugar, idProfesional, nombreLugar) => {
    setSession('id_lugar_seleccionado', idLugar);
    setSession('id_profesional_seleccionado', idProfesional);
    setSession('nombre_lugar_seleccionado', nombreLugar);
    setSession('tipo_agenda_seleccionado', '');
    setSession('tipo_hora_medica_seleccionado', '');
    setSession('id_procedimiento_seleccionado', '');
    setSession('nombre_procedimiento_seleccionado', '');

    cargando(1);
    var api = new Api('profesionales', 'tipos_agenda_lugar_atencion');
    api.request(
        {id_profesional: idProfesional, id_lugar: idLugar},
        function(resp) {
            var modalidades = resp.registros || [];
            cargando(0);

            if (!modalidades.length) {
                mostrarSinFechasDisponibles();
                return;
            }

            if (modalidades.length === 1) {
                if (modalidades[0].tipo_hora_medica === 'E') {
                    modalidadesAgendaContexto = {
                        modalidades: modalidades,
                        idLugar: idLugar,
                        idProfesional: idProfesional,
                        nombreLugar: nombreLugar
                    };
                    cargarPrestacionesAgenda(
                        modalidades[0],
                        idLugar,
                        idProfesional,
                        nombreLugar
                    );
                    vista('seleccionar_fecha_hora', 'fade');
                    return;
                }
                seleccionarTipoAgenda(
                    modalidades[0].id,
                    modalidades[0].tipo_hora_medica,
                    modalidades[0].nombre,
                    idLugar,
                    idProfesional,
                    nombreLugar
                );
                return;
            }

            mostrarTiposAgendaDisponibles(modalidades, idLugar, idProfesional, nombreLugar);
        },
        function() {
            cargando(0);
            msg('Modalidad de atención', 'No fue posible cargar las modalidades disponibles.', 'error');
        },
        'GET'
    );
};

// Íconos de modalidad: cruz de salud (presencial) y filmadora (telemedicina).
const iconoModalidadPresencial = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M9 3.5h6V9h5.5v6H15v5.5H9V15H3.5V9H9z"/></svg>';
const iconoModalidadVideo = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="13" height="12" rx="2.5"/><path d="M15.5 10.2l5-3v9.6l-5-3z"/></svg>';

const mostrarTiposAgendaDisponibles = (modalidades, idLugar, idProfesional, nombreLugar) => {
    const nombreMedico = getSession('nombre_medico_seleccionado');
    const especialidadMedico = getSession('especialidad_medico_seleccionado');
    modalidadesAgendaContexto = {
        modalidades: modalidades,
        idLugar: idLugar,
        idProfesional: idProfesional,
        nombreLugar: nombreLugar
    };
    const tarjetas = modalidades.map(function(modalidad, indice) {
        const esTelemedicina = Number(modalidad.id) === 3;
        return `
            <button type="button" class="modalidad-agenda-card"
                onclick="seleccionarModalidadAgendaPorIndice(${indice})">
                <span class="modalidad-agenda-icono">${esTelemedicina ? iconoModalidadVideo : iconoModalidadPresencial}</span>
                <span class="modalidad-agenda-texto">
                    <strong>${escaparTextoAgenda(modalidad.nombre)}</strong>
                    <small>${escaparTextoAgenda(modalidad.descripcion)}</small>
                </span>
                <span class="modalidad-agenda-flecha">›</span>
            </button>`;
    }).join('');

    $('#seleccionar_fecha_hora .top-titulos').html(`
        <p class="letra-bold color-azul-oscuro size20 text-center">¿Cómo quieres atenderte?</p>
        ${htmlCardProfesionalAgenda(nombreMedico, especialidadMedico, nombreLugar)}
        <div class="btn-app4 text-center size14 mb20" onclick="vista('lugares_atencion');">Volver a lugares</div>
    `);
    $('#lista-fechas').html(`
        <div class="modalidades-agenda-contenedor">
            <p>Selecciona una modalidad de atención</p>
            ${tarjetas}
        </div>
    `);
    vista('seleccionar_fecha_hora', 'fade');
};

const seleccionarModalidadAgendaPorIndice = (indice) => {
    if (!modalidadesAgendaContexto || !modalidadesAgendaContexto.modalidades[indice]) return;
    const modalidad = modalidadesAgendaContexto.modalidades[indice];

    if (modalidad.tipo_hora_medica === 'E') {
        cargarPrestacionesAgenda(
            modalidad,
            modalidadesAgendaContexto.idLugar,
            modalidadesAgendaContexto.idProfesional,
            modalidadesAgendaContexto.nombreLugar
        );
        return;
    }

    seleccionarTipoAgenda(
        modalidad.id,
        modalidad.tipo_hora_medica,
        modalidad.nombre,
        modalidadesAgendaContexto.idLugar,
        modalidadesAgendaContexto.idProfesional,
        modalidadesAgendaContexto.nombreLugar
    );
};

const cargarPrestacionesAgenda = (modalidad, idLugar, idProfesional, nombreLugar) => {
    cargando(1);
    var api = new Api('profesionales', 'prestaciones_lugar_atencion');
    api.request(
        {id_profesional: idProfesional, id_lugar: idLugar},
        function(resp) {
            cargando(0);
            const prestaciones = Array.isArray(resp.registros) ? resp.registros : [];
            if (!prestaciones.length) {
                msg(
                    'Exámenes y procedimientos',
                    'Este profesional todavía no tiene prestaciones activas configuradas en este lugar.',
                    'warning'
                );
                return;
            }

            prestacionesAgendaContexto = {
                prestaciones: prestaciones,
                modalidad: modalidad,
                idLugar: idLugar,
                idProfesional: idProfesional,
                nombreLugar: nombreLugar
            };

            const tarjetas = prestaciones.map(function(prestacion, indice) {
                const codigo = prestacion.codigo
                    ? `<small>Código: ${escaparTextoAgenda(prestacion.codigo)}</small>`
                    : '';
                const valor = prestacion.valor !== null
                    ? `<small>Valor: $${Number(prestacion.valor).toLocaleString('es-CL')}</small>`
                    : '';

                return `
                    <button type="button" class="modalidad-agenda-card"
                        onclick="seleccionarPrestacionAgendaPorIndice(${indice})">
                        <span class="modalidad-agenda-icono">+</span>
                        <span class="modalidad-agenda-texto">
                            <strong>${escaparTextoAgenda(prestacion.nombre)}</strong>
                            <small>${escaparTextoAgenda(prestacion.tipo_nombre)}</small>
                            ${codigo}
                            ${valor}
                        </span>
                        <span class="modalidad-agenda-flecha">›</span>
                    </button>`;
            }).join('');

            $('#lista-fechas').html(`
                <div class="modalidades-agenda-contenedor">
                    <p>Selecciona el examen o procedimiento</p>
                    ${tarjetas}
                    <button type="button" class="btn-app4 text-center size14 mt20"
                        onclick="mostrarTiposAgendaDisponibles(
                            modalidadesAgendaContexto.modalidades,
                            modalidadesAgendaContexto.idLugar,
                            modalidadesAgendaContexto.idProfesional,
                            modalidadesAgendaContexto.nombreLugar
                        )">
                        Volver a modalidades
                    </button>
                </div>
            `);
        },
        function() {
            cargando(0);
            msg('Exámenes y procedimientos', 'No fue posible cargar las prestaciones.', 'error');
        },
        'GET'
    );
};

const seleccionarPrestacionAgendaPorIndice = (indice) => {
    if (!prestacionesAgendaContexto || !prestacionesAgendaContexto.prestaciones[indice]) return;
    const prestacion = prestacionesAgendaContexto.prestaciones[indice];
    const modalidad = prestacionesAgendaContexto.modalidad;

    setSession('id_procedimiento_seleccionado', prestacion.id_procedimiento);
    setSession('nombre_procedimiento_seleccionado', prestacion.nombre);

    seleccionarTipoAgenda(
        modalidad.id,
        modalidad.tipo_hora_medica,
        modalidad.nombre,
        prestacionesAgendaContexto.idLugar,
        prestacionesAgendaContexto.idProfesional,
        prestacionesAgendaContexto.nombreLugar
    );
};

const seleccionarTipoAgenda = (tipoAgenda, tipoHoraMedica, nombreModalidad, idLugar, idProfesional, nombreLugar) => {
    setSession('tipo_agenda_seleccionado', tipoAgenda);
    setSession('tipo_hora_medica_seleccionado', tipoHoraMedica);
    setSession('nombre_modalidad_seleccionada', nombreModalidad);
    cargarFechasAgendaSeleccionada(idLugar, idProfesional, nombreLugar);
};

const volverDesdeFechasAgenda = () => {
    if (
        getSession('tipo_hora_medica_seleccionado') === 'E'
        && prestacionesAgendaContexto
    ) {
        cargarPrestacionesAgenda(
            prestacionesAgendaContexto.modalidad,
            prestacionesAgendaContexto.idLugar,
            prestacionesAgendaContexto.idProfesional,
            prestacionesAgendaContexto.nombreLugar
        );
        return;
    }

    vista('lugares_atencion');
};

const escaparTextoAgenda = (valor) => $('<div>').text(valor == null ? '' : String(valor)).html();

// De "MÉDICOS - ESPECIALIDADES MÉDICAS - Oftalmología" deja solo "Oftalmología".
const especialidadCortaAgenda = (especialidad) => {
    const partes = String(especialidad || '').split(' - ').map(p => p.trim()).filter(Boolean);
    return partes.length ? partes[partes.length - 1] : 'Especialidad no informada';
};

// Fotos de los profesionales listados, para mostrarlas al agendar.
const fotosProfesionalesAgenda = {};

// Card del profesional usada en todos los pasos de Agendar hora (lugar y badges son opcionales).
const htmlCardProfesionalAgenda = (nombre, especialidad, lugar, badges) => {
    const listaBadges = (badges || []).filter(Boolean);
    const fallbackFoto = getSession('foto_fallback_medico_seleccionado') || 'src/images/ejemplo_dr.jpg';
    const foto = getSession('foto_medico_seleccionado') || fallbackFoto;
    return `
        <div class="agenda-profesional-card">
            <img class="agenda-profesional-foto" src="${escaparTextoAgenda(foto)}" data-fallback="${escaparTextoAgenda(fallbackFoto)}" alt="Foto del profesional">
            <strong class="agenda-profesional-nombre">${escaparTextoAgenda(nombre)}</strong>
            <span class="medico-especialidad-badge">${escaparTextoAgenda(especialidadCortaAgenda(especialidad))}</span>
            ${lugar ? `<span class="agenda-profesional-lugar"><img width="12" src="src/images/ubicacion.svg" alt="">${escaparTextoAgenda(lugar)}</span>` : ''}
            ${listaBadges.length ? `<div class="agenda-profesional-badges">${listaBadges.map(b => `<span class="agenda-modalidad-seleccionada">${escaparTextoAgenda(b)}</span>`).join('')}</div>` : ''}
        </div>`;
};

const cargarFechasAgendaSeleccionada = (idLugar, idProfesional, nombreLugar) => {
    console.log('Lugar de atención seleccionado ID:', idLugar);

    // Obtener datos del médico desde la sesión
    const nombreMedico = getSession('nombre_medico_seleccionado');
    const especialidadMedico = getSession('especialidad_medico_seleccionado');

    // Guardar en sesión el ID del lugar seleccionado y su nombre
    setSession('id_lugar_seleccionado', idLugar);
    setSession('id_profesional_seleccionado', idProfesional);
    setSession('nombre_lugar_seleccionado', nombreLugar);

    var datos = {
        id_profesional: idProfesional,
        id_lugar: idLugar,
        tipo_agenda: getSession('tipo_agenda_seleccionado')
    };

    cargando(1);

    var api = new Api("profesionales", "dias_laborales_lugar_atencion");
    api.request(
        datos,
        function (resp) {
            LOG('dias laborales estado:' + resp.estado);
            console.log(resp);

            if (resp.estado == 1 && resp.registros) {
                // Procesar días laborales
                const diasLaborales = resp.registros.horario_agenda_laboral.split(',').map(d => parseInt(d));

                // Generar fechas disponibles para los próximos 30 días
                const fechasDisponibles = generarFechasDisponibles(diasLaborales, 30);

                if (fechasDisponibles.length > 0) {
                    // Card del profesional con la modalidad (y prestación, si aplica) como badges centrados.
                    const nombreProcedimiento = getSession('nombre_procedimiento_seleccionado');
                    $('#seleccionar_fecha_hora .top-titulos').html(`
                        ${htmlCardProfesionalAgenda(nombreMedico, especialidadMedico, nombreLugar,
                            [getSession('nombre_modalidad_seleccionada'), nombreProcedimiento])}
                        <div class="btn-app4 text-center size14 mb20" onclick="volverDesdeFechasAgenda();">
                            ${getSession('tipo_hora_medica_seleccionado') === 'E'
                                ? 'Volver a prestaciones'
                                : 'Volver a lugares'}
                        </div>
                    `);

                    let htmlHoras = `
                    <div class="agenda-paso-card">
                        <p class="agenda-paso-titulo"><span>1</span> Selecciona una fecha disponible</p>
                        <input type="hidden" id="fecha_seleccionada" value="">
                        <div id="agenda-calendario" class="agenda-calendario"></div>
                        <p id="agenda-fecha-elegida" class="agenda-fecha-elegida">Toca un día destacado para ver sus horarios.</p>
                    </div>
                    <div id="horarios-disponibles"></div>
                    `;

                    $('#lista-fechas').html(htmlHoras);
                    iniciarCalendarioAgenda(fechasDisponibles);

                    vista('seleccionar_fecha_hora', 'fade');
                } else {
                    mostrarSinFechasDisponibles();
                }
            } else {
                mostrarSinFechasDisponibles();
            }
            cargando(0);
        },
        function (resp) {
            console.error('Error cargando días laborales:', resp);
            cargando(0);
            msg('Error', 'Error al cargar días laborales', 'error');
        },
        "GET"
    );
}

const generarFechasDisponibles = (diasLaborales, cantidadDias) => {
    const fechasDisponibles = [];
    const hoy = new Date();
    const nombresDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                         'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    for (let i = 1; i <= cantidadDias; i++) { // Empezar desde mañana
        const fecha = new Date(hoy);
        fecha.setDate(hoy.getDate() + i);

        const diaSemana = fecha.getDay(); // 0=Domingo, 1=Lunes, etc.

        // Verificar si el día está en los días laborales
        if (diasLaborales.includes(diaSemana)) {
            const dia = fecha.getDate().toString().padStart(2, '0');
            const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
            const año = fecha.getFullYear();

            fechasDisponibles.push({
                valor: `${año}-${mes}-${dia}`,
                texto: `${nombresDias[diaSemana]} ${dia} de ${nombresMeses[fecha.getMonth()]} ${año}`
            });
        }
    }

    return fechasDisponibles;
}

// ===== Calendario de fechas disponibles (reemplaza al select) =====
let agendaCalendario = { disponibles: {}, meses: [], indiceMes: 0 };
let agendaHoraSeleccionada = null;

const iniciarCalendarioAgenda = (fechasDisponibles) => {
    const disponibles = {};
    const meses = [];
    fechasDisponibles.forEach(fecha => {
        disponibles[fecha.valor] = fecha.texto;
        const mes = fecha.valor.slice(0, 7);
        if (meses.indexOf(mes) === -1) meses.push(mes);
    });
    agendaCalendario = { disponibles: disponibles, meses: meses, indiceMes: 0 };
    agendaHoraSeleccionada = null;
    renderizarCalendarioAgenda();
};

const cambiarMesCalendarioAgenda = (paso) => {
    const nuevo = agendaCalendario.indiceMes + paso;
    if (nuevo < 0 || nuevo >= agendaCalendario.meses.length) return;
    agendaCalendario.indiceMes = nuevo;
    renderizarCalendarioAgenda();
};

const renderizarCalendarioAgenda = () => {
    const mesClave = agendaCalendario.meses[agendaCalendario.indiceMes];
    if (!mesClave) return;
    const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const [anio, mes] = mesClave.split('-').map(Number);
    const primerDia = new Date(anio, mes - 1, 1);
    const diasEnMes = new Date(anio, mes, 0).getDate();
    const desfase = (primerDia.getDay() + 6) % 7; // Semana comienza el lunes
    const seleccionada = $('#fecha_seleccionada').val();
    const hoy = new Date();
    const claveHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

    let celdas = '';
    for (let i = 0; i < desfase; i++) celdas += '<span class="agenda-cal-vacio"></span>';
    for (let dia = 1; dia <= diasEnMes; dia++) {
        const clave = `${mesClave}-${String(dia).padStart(2, '0')}`;
        const disponible = Object.prototype.hasOwnProperty.call(agendaCalendario.disponibles, clave);
        const clases = ['agenda-cal-dia'];
        if (disponible) clases.push('disponible');
        if (clave === seleccionada) clases.push('seleccionado');
        if (clave === claveHoy) clases.push('hoy');
        celdas += disponible
            ? `<button type="button" data-role="none" class="${clases.join(' ')}" onclick="seleccionarFechaCalendarioAgenda('${clave}')" aria-label="${escaparTextoAgenda(agendaCalendario.disponibles[clave])}">${dia}</button>`
            : `<span class="${clases.join(' ')}" aria-disabled="true">${dia}</span>`;
    }

    const total = agendaCalendario.meses.length;
    const indice = agendaCalendario.indiceMes;
    $('#agenda-calendario').html(`
        <div class="agenda-cal-cabecera">
            <button type="button" data-role="none" class="agenda-cal-nav" onclick="cambiarMesCalendarioAgenda(-1)" ${indice === 0 ? 'disabled' : ''} aria-label="Mes anterior">‹</button>
            <strong>${nombresMeses[mes - 1]} ${anio}</strong>
            <button type="button" data-role="none" class="agenda-cal-nav" onclick="cambiarMesCalendarioAgenda(1)" ${indice >= total - 1 ? 'disabled' : ''} aria-label="Mes siguiente">›</button>
        </div>
        <div class="agenda-cal-semana"><span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sá</span><span>Do</span></div>
        <div class="agenda-cal-grid">${celdas}</div>
        <div class="agenda-cal-leyenda"><span><i class="disponible"></i>Disponible</span><span><i class="seleccionado"></i>Seleccionado</span></div>
    `);
};

const seleccionarFechaCalendarioAgenda = (clave) => {
    $('#fecha_seleccionada').val(clave);
    agendaHoraSeleccionada = null;
    renderizarCalendarioAgenda();
    $('#agenda-fecha-elegida').html(`Fecha elegida: <strong>${escaparTextoAgenda(agendaCalendario.disponibles[clave] || fechaEsp(clave))}</strong>`);
    cargarHorasDisponibles();
};

const seleccionarHoraAgenda = (boton) => {
    $('#horarios-disponibles .btn-hora-disponible').removeClass('seleccionada').attr('aria-pressed', 'false');
    $(boton).addClass('seleccionada').attr('aria-pressed', 'true');
    agendaHoraSeleccionada = { id: boton.getAttribute('data-id'), hora: boton.getAttribute('data-hora') };
    $('#btn-reservar-hora').prop('disabled', false).text(`Reservar hora de las ${agendaHoraSeleccionada.hora}`);
};

const reservarHoraSeleccionada = () => {
    const fecha = $('#fecha_seleccionada').val();
    if (!agendaHoraSeleccionada || !fecha) {
        msg('Horario', 'Debe seleccionar un horario', 'warning');
        return;
    }
    confirmarHoraMedica(agendaHoraSeleccionada.id, fecha, agendaHoraSeleccionada.hora);
};

const cargarHorasDisponibles = () => {
    const fechaSeleccionada = $('#fecha_seleccionada').val();

    if (!fechaSeleccionada) {
        msg('Fecha', 'Debe seleccionar una fecha', 'warning');
        return;
    }

    const datos = {
        id_profesional: getSession('id_profesional_seleccionado'),
        id_lugar: getSession('id_lugar_seleccionado'),
        fecha: fechaSeleccionada,
        tipo_agenda: getSession('tipo_agenda_seleccionado')
    };

    cargando(1);

    var api = new Api("profesionales", "horas_disponibles_profesional_lugar_atencion");
    api.request(
        datos,
        function (resp) {
            if (resp.estado == 1 && resp.horarios && resp.horarios.length > 0) {
                agendaHoraSeleccionada = null;
                const botones = resp.horarios.map((horario, indice) => {
                    const horaTexto = horaSinSegundos(horario.hora);
                    return `<button type="button" data-role="none" class="btn-hora-disponible"
                        data-id="${escaparTextoAgenda(horario.id)}" data-hora="${escaparTextoAgenda(horaTexto)}"
                        onclick="seleccionarHoraAgenda(this)">${escaparTextoAgenda(horaTexto)}</button>`;
                }).join('');

                $('#horarios-disponibles').html(`
                    <div class="agenda-paso-card">
                        <p class="agenda-paso-titulo"><span>2</span> Elige un horario</p>
                        <div class="agenda-horas-grid">${botones}</div>
                        <button type="button" data-role="none" id="btn-reservar-hora" class="agenda-reservar-btn" disabled
                            onclick="reservarHoraSeleccionada()">Selecciona un horario</button>
                    </div>
                `);
                const tarjetaHoras = document.getElementById('horarios-disponibles');
                if (tarjetaHoras && tarjetaHoras.scrollIntoView) {
                    tarjetaHoras.scrollIntoView({behavior: 'smooth', block: 'start'});
                }
            } else {
                $('#horarios-disponibles').html(`
                    <div class="agenda-paso-card text-center">
                        <p class="size16 color-azul mb0">No hay horarios disponibles para esta fecha</p>
                        <p class="agenda-fecha-elegida">Prueba con otro día del calendario.</p>
                    </div>
                `);
            }
            cargando(0);
        },
        function (resp) {
            console.error('Error cargando horarios:', resp);
            cargando(0);
            msg('Error', 'Error al cargar horarios disponibles', 'error');
        },
        "GET"
    );
}

const mostrarSinFechasDisponibles = () => {
    $('#lista-fechas').html(`
        <div class="card-button-dos mb20">
            <div class="row">
                <div class="col-xs-12 text-center pt20 pb20">
                    <p class="size18 color-azul">No hay fechas disponibles</p>
                    <p class="size14">Este profesional no tiene días laborales asignados</p>
                </div>
            </div>
        </div>
    `);
    msg('Días Laborales', 'No hay días laborales disponibles para este lugar de atención', 'warning');
}

// Función auxiliar para limpiar el formulario después de guardar
const limpiarFormularioAtencion = () => {
    $('#rut_profesional').val('');
    $('#nombre_profesional').val('');
    $('#correo_profesional').val('');
    $('#telefono_profesional').val('');
    $('#esp_profesional').val('');
    $('#tipo_esp_profesional').html('<option value="">Seleccione especialidad primero</option>');
    $('#sub_tipo_esp_profesional').html('<option value="">Seleccione tipo-especialidad primero</option>');
    $('#diagnosticos').val('');
    $('#examenes').val('');
    $('#medicamentos').val('');
    $('#rut_dependiente').val('');

    // Ocultar el div del dependiente si estaba visible
    $('#div_paciente_dependiente').addClass('hidden');
}

const limpiarFormularioBusquedaMedico = () => {
    $('#especialidad').val(0);
    $('#tipoespecialidad').html('<option value="">Seleccione especialidad primero</option>');
    $('#subtipoespecialidad').html('<option value="">Seleccione tipo-especialidad primero</option>');
    $('#region').val(0);
    $('#ciudad').html('<option value="">Seleccione región primero</option>');
}

// "2026-05-14", "2026-05-14T20:26:38" o "2026-05-14 20:26:38" → "14-05-2026".
const fechaEsp = (fecha) =>{
    var fecha_ = String(fecha).trim().split(/[T ]/);
    fecha_ = fecha_[0].split('-');
    return fecha_[2]+'-'+fecha_[1]+'-'+fecha_[0];
}

// Igual que fechaEsp, pero agrega la hora sin segundos: "14-05-2026 20:26".
const fechaHoraEsp = (fecha) => {
    var partes = String(fecha).trim().split(/[T ]/);
    var hora = (partes[1] || '').match(/^(\d{1,2}):(\d{2})/);
    return fechaEsp(fecha) + (hora ? ' ' + ('0' + hora[1]).slice(-2) + ':' + hora[2] : '');
}

// Quita los segundos de cualquier hora "HH:MM:SS" dentro de un texto → "HH:MM".
const horaSinSegundos = (texto) => String(texto).replace(/\b(\d{1,2}:\d{2}):\d{2}\b/g, '$1');

const enviarCorreoValidarEquipo = () => {

    var datos = {};

    datos.id_user = _SESSION('id_usuario');
    datos.uuid = $('#uuid').val();
        
    var api = new Api("mobile-authorization", "device/activation-request");
    api.request(
        datos,
        function (resp) {
            LOG('correo de registro de equipo:'+resp.envio_correo);
            if (resp.envio_correo.estado == 1) {
                msg('Correo de activación', 'Correo Enviado', 'success');  
            }else{
                msg('Correo de activación', 'Problemas al enviar el correo', 'error');
            }            

        },
        function (resp) {             
            msg('Correo de activación', 'Problemas al enviar el correo', 'error');
        },
        "POST");

}
const openReceta = (url) => {
    console.log("Click detectado. URL:", url);
    if (!cordova.InAppBrowser) {
        console.log("InAppBrowser no disponible");
    } else {
        // cordova.InAppBrowser.open(url, '_blank', 'location=yes');
        // console.log("Intento de abrir InAppBrowser");
          const gviewUrl = "https://docs.google.com/gview?embedded=true&url=" + encodeURIComponent(url);
        cordova.InAppBrowser.open(gviewUrl, '_blank', 'location=yes');
    }
}

const formatearRut = (rut) => {
    // Eliminar puntos, guiones y espacios
    rut = rut.replace(/[^0-9kK]/g, '');

    if (rut.length < 2) return rut;

    // Separar número del dígito verificador
    const cuerpo = rut.slice(0, -1);
    const dv = rut.slice(-1).toUpperCase();

    // Formatear el cuerpo con puntos
    let cuerpoFormateado = '';
    for (let i = cuerpo.length; i > 0; i -= 3) {
        const inicio = Math.max(0, i - 3);
        const grupo = cuerpo.slice(inicio, i);
        cuerpoFormateado = grupo + (cuerpoFormateado ? '.' + cuerpoFormateado : '');
    }

    return cuerpoFormateado + (dv ? '-' + dv : '');
}

const calcularDV = (rut) => {
    let suma = 0;
    let multiplicador = 2;

    // Calcular suma
    for (let i = rut.length - 1; i >= 0; i--) {
        suma += parseInt(rut.charAt(i)) * multiplicador;
        multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }

    const resto = suma % 11;
    const dv = 11 - resto;

    if (dv === 11) return '0';
    if (dv === 10) return 'K';
    return dv.toString();
}

const validarRut = (rutCompleto) => {
    if (!rutCompleto || rutCompleto.length < 3) return false;

    const rutLimpio = rutCompleto.replace(/[^0-9kK]/g, '');
    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1).toUpperCase();

    if (cuerpo.length < 1 || !/^\d+$/.test(cuerpo)) return false;

    return calcularDV(cuerpo) === dv;
}

// Aplicar formato al campo RUT
const aplicarFormatoRut = () => {
    const campoRut = $('#rut_profesional');

    campoRut.on('input', function() {
        const valorActual = $(this).val();
        const rutFormateado = formatearRut(valorActual);
        $(this).val(rutFormateado);
    });

    campoRut.on('blur', function() {
        const rutCompleto = $(this).val();
        const rutLimpio = rutCompleto.replace(/[^0-9kK]/g, '');

        if (rutLimpio.length >= 2) {
            const cuerpo = rutLimpio.slice(0, -1);
            const dvCalculado = calcularDV(cuerpo);
            const rutConDV = formatearRut(cuerpo + dvCalculado);
            $(this).val(rutConDV);

            // Validar RUT
            if (!validarRut(rutConDV)) {
                $(this).addClass('error');
                msg('RUT Inválido', 'El RUT ingresado no es válido', 'warning');
            } else {
                $(this).removeClass('error');
            }
        }
    });
}

const cancelarHoraMedica = async (idHora) => {
    if (!idHora) {
        msg('Anular Hora', 'ID de hora inválido', 'warning');
        return;
    }

    const confirmado = await confirmarMedsdi(
        '¿Anular esta hora?',
        'La cita será anulada y dejará de aparecer como una hora activa.',
        {
            icon: 'warning',
            confirmButtonText: 'Sí, continuar',
            cancelButtonText: 'Volver',
            confirmButtonColor: '#c94755'
        }
    );

    if (!confirmado) {
        return;
    }

    if (typeof confirmarBiometriaAccionApp !== 'function') {
        await swalMedsdi(
            'Confirmación biométrica',
            'No fue posible iniciar la validación biométrica.',
            'error'
        );
        return;
    }

    const validacionBiometrica = await confirmarBiometriaAccionApp(
        'Confirma tu huella para anular esta hora médica.'
    );

    if (!validacionBiometrica.ok) {
        const mensaje = validacionBiometrica.motivo === 'no_habilitada'
            ? 'Activa primero la huella desde Mi perfil → Seguridad.'
            : (validacionBiometrica.mensaje || 'No fue posible validar tu identidad.');

        await swalMedsdi(
            'Hora no anulada',
            mensaje,
            validacionBiometrica.motivo === 'cancelada' ? 'info' : 'warning'
        );
        return;
    }

    const datos = {
        id_hora: idHora,
        token: "mobile-original-" + Date.now()
    };

    cargando(1);

    var api = new Api("paciente", "anular_hora_medica");
    api.request(
        datos,
        function (resp) {
            if (resp.estado == 1) {
                swalMedsdi(
                    'Hora anulada',
                    'La hora médica fue anulada correctamente.',
                    'success'
                );
                solicitarMisHorasMedicas(true);
            } else {
                msg('Error', resp.msj || 'Error al anular la hora', 'error');
            }
            cargando(0);
        },
        function (resp) {
            console.error('Error anulando hora:', resp);
            cargando(0);
            msg('Error', 'Error de conexión al anular la hora', 'error');
        },
        "POST"
    );
}

const confirmarHoraMedica = async (idHora, fecha, hora) => {

    const confirmado = await confirmarMedsdi(
        'Confirmar reserva',
        `¿Deseas agendar esta hora médica para el ${fecha} a las ${hora}?`,
        {
            icon: 'question',
            confirmButtonText: 'Sí, continuar',
            cancelButtonText: 'Elegir otra hora',
            confirmButtonColor: '#1450bd'
        }
    );

    if (!confirmado) {
        return;
    }

    // Segundo factor antes de enviar la reserva al servidor.
    if (typeof confirmarBiometriaAccionApp !== 'function') {
        await swalMedsdi(
            'Confirmación biométrica',
            'No fue posible iniciar la validación biométrica. Actualiza la aplicación e inténtalo nuevamente.',
            'error'
        );
        return;
    }

    const validacionBiometrica = await confirmarBiometriaAccionApp(
        `Confirma tu huella para reservar la hora del ${fecha} a las ${hora}.`
    );

    if (!validacionBiometrica.ok) {
        const mensaje = validacionBiometrica.motivo === 'no_habilitada'
            ? 'Activa primero la huella desde Mi perfil → Seguridad para poder confirmar reservas.'
            : (validacionBiometrica.mensaje || 'No fue posible validar tu identidad.');

        await swalMedsdi(
            'Reserva no confirmada',
            mensaje,
            validacionBiometrica.motivo === 'cancelada' ? 'info' : 'warning'
        );
        return;
    }

    const datos = {
        id_profesional: getSession('id_profesional_seleccionado'),
        id_lugar: getSession('id_lugar_seleccionado'),
        tipo_agenda: getSession('tipo_agenda_seleccionado'),
        tipo_hora_medica: getSession('tipo_hora_medica_seleccionado') || 'C',
        id_procedimiento: getSession('id_procedimiento_seleccionado') || null,
        examen: getSession('nombre_procedimiento_seleccionado') || '',
        id_hora: idHora,
        fecha: fecha,
        hora: hora,
        token: "mobile-original-" + Date.now()
    };

    cargando(1);

    var api = new Api("paciente", "agendar_hora_medica");
    api.request(
        datos,
        function (resp) {
            console.log('Respuesta confirmar hora:', resp);

            if (resp.estado == 1) {
                msg('Hora Confirmada', 'La hora ha sido confirmada correctamente', 'success');
            } else {
                msg('Error', resp.msj || 'Error al confirmar la hora', 'error');
            }

            cargando(0);
            solicitarMisHorasMedicas();
        },
        function (resp) {
            console.error('Error confirmando hora:', resp);
            cargando(0);
            var mensaje = resp && resp.responseJSON && resp.responseJSON.msj
                ? resp.responseJSON.msj
                : 'No fue posible confirmar la hora.';
            msg('Confirmar Hora', mensaje, 'error');
        },
        "POST");
}

const confirmarHoraMedicaAgendada = async (idHora) => {
    if (!idHora) {
        msg('Confirmar Hora', 'ID de hora inválido', 'warning');
        return;
    }

    const confirmado = await confirmarMedsdi(
        'Confirmar asistencia',
        '¿Deseas confirmar esta hora médica?',
        {
            icon: 'question',
            confirmButtonText: 'Sí, continuar',
            cancelButtonText: 'Ahora no',
            confirmButtonColor: '#31bebe'
        }
    );

    if (!confirmado) {
        return;
    }

    if (typeof confirmarBiometriaAccionApp !== 'function') {
        await swalMedsdi(
            'Confirmación biométrica',
            'No fue posible iniciar la validación biométrica.',
            'error'
        );
        return;
    }

    const validacionBiometrica = await confirmarBiometriaAccionApp(
        'Confirma tu huella para confirmar esta hora médica.'
    );

    if (!validacionBiometrica.ok) {
        const mensaje = validacionBiometrica.motivo === 'no_habilitada'
            ? 'Activa primero la huella desde Mi perfil → Seguridad.'
            : (validacionBiometrica.mensaje || 'No fue posible validar tu identidad.');

        await swalMedsdi(
            'Hora no confirmada',
            mensaje,
            validacionBiometrica.motivo === 'cancelada' ? 'info' : 'warning'
        );
        return;
    }

    const datos = {
        id_hora: idHora,
        token: "mobile-original-" + Date.now()
    };

    cargando(1);

    var api = new Api("paciente", "confirmar_hora_medica");
    api.request(
        datos,
        function (resp) {
            if (resp.estado == 1) {
                swalMedsdi(
                    'Hora confirmada',
                    'Tu asistencia quedó confirmada correctamente.',
                    'success'
                );
                solicitarMisHorasMedicas(true);
            } else {
                msg('Error', resp.msj || 'Error al confirmar la hora', 'error');
            }
            cargando(0);
        },
        function (resp) {
            console.error('Error confirmando hora:', resp);
            cargando(0);
            msg('Error', 'Error de conexión al confirmar la hora', 'error');
        },
        "POST"
    );
}

const dameRegiones = (select) => {
    var datos = {};
    cargando(1);
    var api = new Api("paciente", "dame_regiones");
    api.request(
        datos,
        function (resp) {
            LOG('regiones estado:' + resp.estado);
            if (resp.estado == 1 && resp.regiones) {
                let opciones = '<option value="">Seleccione región</option>';
                resp.regiones.forEach(region => {
                    opciones += `<option value="${region.id}">${region.nombre}</option>`;
                });
                $('#region').html(opciones);
            } else {
                $('#region').html('<option value="">No hay regiones</option>');
            }
            cargando(0);
        },
        function (resp) {
            console.error('Error cargando regiones:', resp);
            cargando(0);
            msg('Regiones', 'Error al cargar regiones', 'error');
            $('#region').html('<option value="">Error al cargar regiones</option>');
        },
        "GET");
}

const dameCiudades = (select, selectIdRegion) => {
    const idRegion = $(`#${selectIdRegion}`).val();
    if (!idRegion) {
        $(`#${select}`).html('<option value="">Seleccione región primero</option>');
        return;
    }

    var datos = { id_region: idRegion };
    cargando(1);
    var api = new Api("paciente", "dame_ciudades");
    api.request(
        datos,
        function (resp) {
            LOG('provincias estado:' + resp.estado);
            if (resp.estado == 1 && resp.ciudades) {
                let opciones = '<option value="">Seleccione provincia</option>';
                resp.ciudades.forEach(ciudad => {
                    opciones += `<option value="${ciudad.id}">${ciudad.nombre}</option>`;
                });
                $(`#${select}`).html(opciones);
            } else {
                $(`#${select}`).html('<option value="">No hay ciudades</option>');
            }
            cargando(0);
        },
        function (resp) {
            console.error('Error cargando provincias:', resp);
            cargando(0);
            msg('Provincias', 'Error al cargar provincias', 'error');
            $(`#${select}`).html('<option value="">Error al cargar provincias</option>');
        },
        "GET");
}

var profesionalesBusquedaCache = [];

const agendarProfesionalDesdeBusqueda = (indice) => {
    const prof = profesionalesBusquedaCache[indice];
    if (!prof) return;
    const nombre = [prof.nombre, prof.apellido_uno, prof.apellido_dos]
        .filter(Boolean).join(' ').trim() || 'Profesional';
    const especialidad = [
        textoDatoProfesional(prof.especialidad) || prof.nombre_especialidad,
        textoDatoProfesional(prof.tipo_especialidad) || prof.nombre_tipo_especialidad,
        textoDatoProfesional(prof.sub_tipo_especialidad) || prof.nombre_sub_tipo_especialidad
    ].filter(Boolean).filter(function(valor, posicion, lista) {
        return lista.indexOf(valor) === posicion;
    }).join(' - ') || 'Especialidad no informada';
    agendarHora(prof.id, nombre, especialidad);
};

const buscarProfesionales = () => {

    // validar que se haya seleccionado una especialidad
    if (!$('#especialidad').val()) {
        msg('Búsqueda', 'Debe seleccionar una especialidad para buscar profesionales', 'warning');
        return;
    }
    // validar que se haya seleccionado una región
    if (!$('#region').val()) {
        msg('Búsqueda', 'Debe seleccionar una región para buscar profesionales', 'warning');
        return;
    }


    const datos = {
        id_especialidad: $('#especialidad').val(),
        id_tipo_especialidad: $('#tipoespecialidad').val(),
        id_sub_tipo_especialidad: $('#subtipoespecialidad').val(),
        id_region: $('#region').val(),
        id_ciudad: $('#ciudad').val(),
        nombre_profesional: $.trim($('#nombre_profesional_busqueda').val()),
        token: "mobile-original-" + Date.now()
    };
    setSession('origen_seleccion_profesional', 'mis_medicos_buscados');
    cargando(1);
    var api = new Api("profesionales", "buscar_profesionales");
    api.request(
        datos,
        function (resp) {
            LOG('buscar profesionales estado:' + resp.estado);
            console.log(resp.profesionales);
            vista('mis_medicos_buscados', 'fade');
            $('#resumen-profesionales-encontrados').text(
                resp.total_resultados === 1
                    ? 'Encontramos 1 profesional'
                    : 'Encontramos ' + Number(resp.total_resultados || 0) + ' profesionales'
            );
            if (resp.estado == 1 && resp.profesionales && resp.profesionales.length > 0) {
                profesionalesBusquedaCache = resp.profesionales;
                let htmlProfesionales = '';
                resp.profesionales.forEach((prof, indiceProfesional) => {
                    if (prof.img_profesional) {
                        var fotoPerfil = prof.img_profesional;
                    } else if(prof.foto_perfil && prof.foto_perfil!=''){
                        var fotoPerfil = MEDSDI_WEB_URL + '/storage/'+prof.foto_perfil;
                    }else{
                        if(prof.sexo && prof.sexo=='F'){
                            var fotoPerfil = 'src/images/ejemplo_dra.jpg';
                        }else{
                            var fotoPerfil = 'src/images/ejemplo_dr.jpg';
                        }
                    }
                    fotosProfesionalesAgenda[prof.id] = {
                        src: fotoPerfil,
                        fallback: prof.sexo === 'F' ? 'src/images/ejemplo_dra.jpg' : 'src/images/ejemplo_dr.jpg'
                    };
                    const nombreCompleto = [
                        prof.nombre,
                        prof.apellido_uno,
                        prof.apellido_dos
                    ].filter(Boolean).join(' ').trim() || 'Profesional';
                    const especialidadCompleta = [
                        textoDatoProfesional(prof.especialidad) || prof.nombre_especialidad,
                        textoDatoProfesional(prof.tipo_especialidad) || prof.nombre_tipo_especialidad,
                        textoDatoProfesional(prof.sub_tipo_especialidad) || prof.nombre_sub_tipo_especialidad
                    ].filter(Boolean).filter(function (valor, indice, lista) {
                        return lista.indexOf(valor) === indice;
                    }).join(' - ') || 'Especialidad no informada';
                    const lugarAtencion = textoDatoProfesional(prof.nombre_lugar_atencion)
                        || textoDatoProfesional(prof.lugar_atencion)
                        || textoDatoProfesional(prof.direccion)
                        || 'Lugar de atención por confirmar';
                    // Todo lo que aparece en la card comienza con mayúscula (nombre y apellidos por palabra).
                    const nombreCard = escaparTextoConsentimiento(
                        nombreCompleto.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m, sep, letra) => sep + letra.toUpperCase())
                    );
                    const especialidadCard = escaparTextoConsentimiento(
                        especialidadCompleta.split(' - ').map(primeraMayuscula).join(' - ')
                    );
                    const lugarCard = escaparTextoConsentimiento(primeraMayuscula(lugarAtencion));

                    htmlProfesionales += `
                    <div class="card-button-dos mb20">
                        <div class="row">
                            <div class="col-xs-3 text-center">
                                <a href="javascript:void(0)" onclick="damePerfilMedico(${prof.id})"> <img class="img-circulo" width="70" src="${fotoPerfil}" data-fallback="${prof.sexo === 'F' ? 'src/images/ejemplo_dra.jpg' : 'src/images/ejemplo_dr.jpg'}" alt="Foto perfil"> </a>
                            </div>
                            <div class="col-xs-9">
                                <p class="size16 color-azul mb5">${nombreCard}</p>
                                <p class="letra-small mb5">${especialidadCard}</p>
                                <p class="letra-small mb5"><img class="mr10" width="15" src="src/images/ubicacion.svg">${lugarCard}</p>
                                <button type="button" data-role="none" class="btn-agendar-hora" onclick="agendarProfesionalDesdeBusqueda(${indiceProfesional})">Agendar hora</button>
                            </div>
                        </div>
                    </div>
                    `;
                });
                $('#lista-medicos-buscados').html(htmlProfesionales);
            } else {
                $('#lista-medicos-buscados').html(`
                    <div class="card-button-dos mb20">
                        <div class="row">
                            <div class="col-xs-12 text-center pt20 pb20">
                                <p class="size18 color-azul">No se encontraron profesionales</p>
                                <p class="size14">Intente con otros filtros de búsqueda</p>
                            </div>
                        </div>
                    </div>
                `);
            }
            cargando(0);
        },
        function (resp) {
            console.error('Error buscando profesionales:', resp);
            cargando(0);
            msg('Error', 'Error al buscar profesionales', 'error');
            $('#lista-medicos-buscados').html(`
                <div class="card-button-dos mb20">
                    <div class="row">
                        <div class="col-xs-12 text-center pt20 pb20">
                            <p class="size18 color-rojo">Error al buscar profesionales</p>
                            <div class="btn-app4 mt10" onclick="buscarProfesionales()">Reintentar</div>
                        </div>
                    </div>
                </div>
            `);
        },
        "POST");
}

var listLogDeviceRequestId = 0;
var autorizacionesRegistros = [];
var autorizacionesFiltroActivo = 'pendientes';

const textoEstadoAutorizacion = (reg) => {
    if (!reg) {
        return '';
    }

    const candidatos = [
        reg.estado_texto,
        reg.estado_nombre,
        reg.nombre_estado,
        reg.status,
        reg.decision,
        reg.resultado,
        reg.respuesta
    ];

    // Si "estado" ya viene como texto descriptivo, también lo consideramos.
    if (typeof reg.estado === 'string') {
        candidatos.push(reg.estado);
    }

    candidatos.push(
        $('<div>').html(reg.msg_html || '').text()
    );

    return candidatos
        .filter(function(valor) {
            return valor !== null && typeof valor !== 'undefined' && String(valor).trim() !== '';
        })
        .join(' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
};

const obtenerEstadoAutorizacion = (reg) => {
    const estadoNumerico = Number(reg && reg.estado);

    // El backend usa: 0 pendiente, 1 autorizada, 2 rechazada,
    // 3 cancelada y 4 expirada. Esta fuente es más confiable que inferir el
    // estado desde el texto HTML de la tarjeta.
    if (estadoNumerico === 0) {
        return 'pendientes';
    }

    if (estadoNumerico === 1) {
        return 'aprobadas';
    }

    if ([2, 3, 4].indexOf(estadoNumerico) !== -1) {
        return 'rechazadas';
    }

    const texto = textoEstadoAutorizacion(reg);

    // Primero detectar estados definitivos.
    if (
        texto.indexOf('rechazad') !== -1 ||
        texto.indexOf('denegad') !== -1 ||
        texto.indexOf('rechazo') !== -1 ||
        texto.indexOf('cancelad') !== -1 ||
        texto.indexOf('expirad') !== -1
    ) {
        return 'rechazadas';
    }

    if (
        texto.indexOf('aprobada') !== -1 ||
        texto.indexOf('aprobado') !== -1 ||
        texto.indexOf('aceptada') !== -1 ||
        texto.indexOf('aceptado') !== -1 ||
        texto.indexOf('autorizada') !== -1 ||
        texto.indexOf('autorizado') !== -1
    ) {
        return 'aprobadas';
    }

    if (
        texto.indexOf('pendiente') !== -1 ||
        texto.indexOf('por responder') !== -1 ||
        texto.indexOf('esperando respuesta') !== -1
    ) {
        return 'pendientes';
    }

    /*
     * Compatibilidad con registros antiguos:
     * si el backend no entrega un nombre de estado explícito, estas entradas
     * corresponden a solicitudes que todavía requieren acción del usuario.
     */
    return 'pendientes';
};

const actualizarContadoresAutorizaciones = () => {
    const contadores = {
        todas: autorizacionesRegistros.length,
        pendientes: 0,
        aprobadas: 0,
        rechazadas: 0
    };

    autorizacionesRegistros.forEach(function(reg) {
        const estado = obtenerEstadoAutorizacion(reg);
        if (Object.prototype.hasOwnProperty.call(contadores, estado)) {
            contadores[estado]++;
        }
    });

    $('#autorizaciones_count_todas').text(contadores.todas);
    $('#autorizaciones_count_pendientes').text(contadores.pendientes);
    $('#autorizaciones_count_aprobadas').text(contadores.aprobadas);
    $('#autorizaciones_count_rechazadas').text(contadores.rechazadas);

    return contadores;
};

const renderizarAutorizaciones = () => {
    const $lista = $('#list_log_reg');
    const filtro = autorizacionesFiltroActivo || 'pendientes';

    const registrosFiltrados = autorizacionesRegistros.filter(function(reg) {
        return filtro === 'todas' || obtenerEstadoAutorizacion(reg) === filtro;
    });

    // Construimos un solo bloque HTML. Evita múltiples append/reflows en Android WebView.
    var html = registrosFiltrados.map(function(reg) {
        var estado = obtenerEstadoAutorizacion(reg);
        // Las horas se muestran como HH:MM, sin segundos.
        var contenido = horaSinSegundos(String(reg.msg_html || '').trim());
        if (!contenido) return '';

        // El backend ya entrega el HTML de cada tarjeta. Envolvemos una sola vez
        // para conservar el estado requerido por los filtros sin crear objetos jQuery.
        return '<div class="autorizacion-render-item" data-estado-autorizacion="' +
            escaparTextoConsentimiento(estado) + '">' + contenido + '</div>';
    }).join('');

    if (!html) {
        const etiquetasVacias = {
            todas: 'todas las autorizaciones',
            pendientes: 'autorizaciones pendientes',
            aprobadas: 'autorizaciones aprobadas',
            rechazadas: 'autorizaciones rechazadas'
        };
        html = '<li class="autorizaciones-vacio">No hay ' + etiquetasVacias[filtro] + ' para mostrar.</li>';
    }

    $lista.html(html);

    const etiquetas = {
        todas: 'todas las autorizaciones',
        pendientes: 'autorizaciones pendientes',
        aprobadas: 'autorizaciones aprobadas',
        rechazadas: 'autorizaciones rechazadas'
    };

    $('#autorizaciones_filtro_resumen').text(
        registrosFiltrados.length + ' ' +
        (registrosFiltrados.length === 1 ? 'registro' : 'registros') +
        ' · ' + etiquetas[filtro]
    );
};

const filtrarAutorizaciones = (filtro) => {
    const filtrosPermitidos = ['todas', 'pendientes', 'aprobadas', 'rechazadas'];

    if (filtrosPermitidos.indexOf(filtro) === -1) {
        filtro = 'pendientes';
    }

    autorizacionesFiltroActivo = filtro;

    $('#autorizaciones_sdi .autorizaciones-filtro')
        .removeClass('active')
        .filter('[data-filtro="' + filtro + '"]')
        .addClass('active');

    $('#autorizaciones_btn_filtro').toggleClass('con-filtro', filtro !== 'todas');
    cerrarFiltroAutorizaciones();

    renderizarAutorizaciones();
};

// Botón de filtro + hoja inferior con los estados (vista Mis autorizaciones).
const abrirFiltroAutorizaciones = () => { $('#autorizaciones_filtro_sheet').addClass('sheet-abierta'); };
const cerrarFiltroAutorizaciones = () => { $('#autorizaciones_filtro_sheet').removeClass('sheet-abierta'); };

var listLogDeviceEnCurso = false;
var listLogDeviceUltimaCarga = 0;
var listLogDeviceCacheMs = 10000;

const list_log_device = (forzar) => {

    var ahora = Date.now();
    forzar = forzar === true;

    // Evitar solicitudes simultáneas.
    if (listLogDeviceEnCurso) {
        console.log('[MED-SDI] list_log_device ya está en ejecución.');
        return;
    }

    // Evitar recargas repetidas durante navegación normal.
    if (
        !forzar &&
        listLogDeviceUltimaCarga &&
        (ahora - listLogDeviceUltimaCarga) < listLogDeviceCacheMs
    ) {
        console.log('[MED-SDI] Se omite recarga repetida de autorizaciones.');
        renderizarAutorizaciones();
        return;
    }

    listLogDeviceEnCurso = true;
    var requestId = ++listLogDeviceRequestId;

    $('#list_log_reg').html(
        '<p class="text-center color-gris mt20">Cargando autorizaciones...</p>'
    );
    $('#autorizaciones_filtro_resumen').text('Actualizando autorizaciones...');

    var api = new Api("mobile-authorization", "requests");

    api.request(
        {},
        function (resp) {
            listLogDeviceEnCurso = false;

            if (requestId !== listLogDeviceRequestId) {
                return;
            }

            listLogDeviceUltimaCarga = Date.now();

            LOG('list log device:' + resp.estado);
            console.log('[MED-SDI] Autorizaciones respuesta:', resp);

            autorizacionesRegistros = (
                resp.estado == 1 && Array.isArray(resp.registros)
            ) ? resp.registros : [];

            actualizarContadoresAutorizaciones();
            filtrarAutorizaciones(autorizacionesFiltroActivo);
        },
        function (xhr, status, error) {
            listLogDeviceEnCurso = false;

            if (requestId !== listLogDeviceRequestId) {
                return;
            }

            console.error('[MED-SDI] AUTORIZACIONES ERROR', {
                status: xhr ? xhr.status : null,
                responseText: xhr ? xhr.responseText : null,
                responseJSON: xhr ? xhr.responseJSON : null,
                ajaxStatus: status,
                error: error,
                api: typeof MEDSDI_API_URL !== 'undefined' ? MEDSDI_API_URL : ''
            });

            var mensaje = 'No fue posible cargar las autorizaciones.';

            if (xhr && xhr.status === 429) {
                listLogDeviceUltimaCarga = Date.now();
                mensaje = 'Se realizaron demasiadas solicitudes. Espera unos segundos antes de volver a actualizar.';
            } else if (xhr && xhr.status === 401) {
                mensaje = 'Tu sesión expiró. Inicia sesión nuevamente.';
            } else if (xhr && xhr.responseJSON && xhr.responseJSON.message) {
                mensaje = xhr.responseJSON.message;
            } else if (xhr && xhr.status) {
                mensaje += ' HTTP ' + xhr.status;
            } else {
                mensaje += ' El servidor no respondió.';
            }

            // No borramos autorizaciones ya cargadas por un error temporal.
            if (!autorizacionesRegistros.length) {
                actualizarContadoresAutorizaciones();

                $('#autorizaciones_filtro_resumen').text('');
                $('#list_log_reg').html(
                    '<li class="autorizaciones-vacio color-rojo">' +
                        escaparTextoConsentimiento(mensaje) +
                    '</li>'
                );
            } else {
                $('#autorizaciones_filtro_resumen').text(
                    'No se pudo actualizar. Mostrando la última información disponible.'
                );
                renderizarAutorizaciones();
            }

            msg(
                'Mis autorizaciones',
                mensaje,
                xhr && xhr.status === 429 ? 'warning' : 'error'
            );
        },
        "GET"
    );
};


const getSession = (key) => {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
}
var accion_log_actual = null;

function abrir_autorizacion_log(id_log, accion, btn) {

    accion_log_actual = accion;

    let msg = $(btn)
        .closest('.log-card')
        .find('.msg_estado_log')
        .html() || '';

    // El detalle, el ID y el PIN pertenecen exclusivamente a #autorizacion.
    // Antes se reutilizaban IDs presentes en otras páginas y el .html(msg)
    // podía eliminar el input del PIN por la estructura HTML mal cerrada.
    $('#autorizacion #id_log_autorizacion').val(id_log);
    $('#autorizacion #log_reg_autorizacion_detalle').html(msg);
    $('#autorizacion #password_').val('');

    vista('autorizacion', 'fade');

    setTimeout(function () {
        $('#autorizacion #password_').trigger('focus');
    }, 250);
}

document.addEventListener('error', function(ev) {
    var img = ev.target;
    if (!img || img.tagName !== 'IMG' || img.dataset.avatarRespaldo) return;
    if (!img.matches('.dashboard-user img, #perfil_menu_foto, #perfil_app_foto_preview')) return;
    img.dataset.avatarRespaldo = '1';
    img.src = 'src/images/avatar-generico.svg';
}, true);
