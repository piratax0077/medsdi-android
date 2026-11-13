const load_animate = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="display: inline-block; padding-top: 8px;" width="25px" height="25px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid"><rect x="17.5" y="30" width="15" height="40" fill="#93dbe9"> <animate attributeName="y" repeatCount="indefinite" dur="1s" calcMode="spline" keyTimes="0;0.5;1" values="18;30;30" keySplines="0 0.5 0.5 1;0 0.5 0.5 1" begin="-0.2s"></animate> <animate attributeName="height" repeatCount="indefinite" dur="1s" calcMode="spline" keyTimes="0;0.5;1" values="64;40;40" keySplines="0 0.5 0.5 1;0 0.5 0.5 1" begin="-0.2s"></animate></rect><rect x="42.5" y="30" width="15" height="40" fill="#689cc5"> <animate attributeName="y" repeatCount="indefinite" dur="1s" calcMode="spline" keyTimes="0;0.5;1" values="20.999999999999996;30;30" keySplines="0 0.5 0.5 1;0 0.5 0.5 1" begin="-0.1s"></animate> <animate attributeName="height" repeatCount="indefinite" dur="1s" calcMode="spline" keyTimes="0;0.5;1" values="58.00000000000001;40;40" keySplines="0 0.5 0.5 1;0 0.5 0.5 1" begin="-0.1s"></animate></rect><rect x="67.5" y="30" width="15" height="40" fill="#5e6fa3"> <animate attributeName="y" repeatCount="indefinite" dur="1s" calcMode="spline" keyTimes="0;0.5;1" values="20.999999999999996;30;30" keySplines="0 0.5 0.5 1;0 0.5 0.5 1"></animate> <animate attributeName="height" repeatCount="indefinite" dur="1s" calcMode="spline" keyTimes="0;0.5;1" values="58.00000000000001;40;40" keySplines="0 0.5 0.5 1;0 0.5 0.5 1"></animate></rect></svg>`;

var historial_index = 0;
var historial_pages = [];

document.addEventListener("deviceready", onDeviceReady, false);

// Si la foto de un profesional no carga, se muestra la imagen por defecto.
// Usa data-fallback cuando existe; si no, la imagen genérica de profesional.
document.addEventListener('error', function (evento) {
    var img = evento.target;
    if (!img || img.tagName !== 'IMG' || img.dataset.fallbackAplicado === '1') return;
    var src = img.getAttribute('src') || '';
    if (!img.dataset.fallback && src.indexOf('/storage/') === -1) return;
    img.dataset.fallbackAplicado = '1';
    img.src = img.dataset.fallback || 'src/images/ejemplo_dr.jpg';
}, true);
window.onscroll = () => { headerFixed(); };
window.onload = () =>{
    init('login','none');
    initVariablesGlobales();
};

function onDeviceReady() {
    if (typeof actualizarBotonLoginBiometricoApp === 'function') {
        actualizarBotonLoginBiometricoApp();
    }

    // El plugin cordova-plugin-device no expone `device` en Browser.
    if (typeof device === 'undefined') {
        LOG('Información del dispositivo no disponible en esta plataforma.');
        return;
    }

    LOG('model: '+device.model);
    LOG('cordova: '+device.cordova);
    LOG('model: '+device.model);
    LOG('platform: '+device.platform);
    LOG('uuid: '+device.uuid);
    LOG('version: '+device.version);
    LOG('manufacturer: '+device.manufacturer);
    LOG('isVirtual: '+device.isVirtual);
    LOG('serial: '+device.serial);
    $('#uuid').val(device.uuid);    
    $('#model_device').val(device.model);
    setSession('uuid',device.uuid);
    setSession('model_device',device.model);

    // Si Android restauró una sesión existente, vuelve a asociar el token FCM
    // con el usuario actualmente autenticado (paciente o profesional).
    registrarNotificacionesDeSesion();

    document.addEventListener('resume', registrarNotificacionesDeSesion, false);
    document.addEventListener('backbutton', manejarBotonAtrasApp, false);
}

const manejarBotonAtrasApp = (event) => {
    const pagina = $.mobile && $.mobile.activePage ? $.mobile.activePage.attr('id') : '';
    if (pagina === 'control-reposo-paciente' || pagina === 'control-reposo-profesional') {
        if (event) event.preventDefault();
        if ($('#reposo_config_sidebar').hasClass('abierto')) {
            cerrar_config_reposo();
            return;
        }
        volverInicioSegunRol();
    }
};

function registrarNotificacionesDeSesion() {
    if (!_SESSION('authToken')) {
        return;
    }

    if (typeof inicializarNotificacionesPush === 'function') {
        inicializarNotificacionesPush();
    }
}

// Respond to back/forward navigation
$( window ).on( "navigate", function( event, data ){
    event.preventDefault();
    /*
    console.log(data.state.foo);
	if ( data.state.foo ) {
        // Make use of the arbitrary data stored
       
    }
    
    if(data.state.foo==undefined)
    return false; 

	if ( data.state.direction == "back" ) {
        // Make use of the directional information        
        //window.history.back();     
        vista(data.state.foo);   
    }
    */ 

});

const LOG = (text) =>
{
    $('#contenedor-log').append(`<li>${text}</li>`);
}

const initVariablesGlobales = () =>{
    // Migración automática desde versiones que guardaban la contraseña de la
    // cuenta en el localStorage del WebView.
    localStorage.removeItem('pass');
    localStorage.removeItem('user_password');
    localStorage.removeItem('login_password');
    
    var variables = `
    <input type="hidden" id="uuid" value="0" />
    <input type="hidden" id="model_device" value="" />
    <input type="hidden" id="id_usuario" value="1" />
    <input type="hidden" id="user_usuario" value="1" />
    <input type="hidden" id="pass_usuario" value="1" />
    <input type="hidden" id="pass_device" value="0" />
    `;
    $('body').append(variables);

    // Restaura las credenciales del dispositivo al iniciar la app.
    // Sin esto, pass_device conserva el valor inicial "0" hasta que
    // checkDevice termine su consulta al servidor.
    $('#uuid').val(localStorage.getItem('uuid') || '0');
    $('#model_device').val(localStorage.getItem('model_device') || '');
    $('#pass_device').val(localStorage.getItem('password') || '');
}

const _SESSION = (key) => {
    return localStorage.getItem(key);
    //return $('#'+key).val();
}


const setSession = (key,value) => {
    localStorage.setItem(key, value);
    //$('#'+key).val(value);
}

const obtenerUuidDispositivo = () => {
    var uuid = String(localStorage.getItem('uuid') || $('#uuid').val() || '');

    uuid = $.trim(uuid);
    // Versiones anteriores llegaron a persistir valores serializados inválidos.
    // Nunca deben enviarse al backend como identificadores reales.
    if (/^(null|undefined|0)$/i.test(uuid)) {
        uuid = '';
        localStorage.removeItem('uuid');
        $('#uuid').val('0');
    }
    var esCordovaBrowser = typeof cordova !== 'undefined' && cordova.platformId === 'browser';
    if ((!uuid || uuid === '0') && esCordovaBrowser) {
        var identificador = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
        uuid = 'browser-' + identificador;
        $('#model_device').val('Chrome local');
        localStorage.setItem('model_device', 'Chrome local');
    }
    if (!uuid || uuid === '0') {
        return '';
    }

    $('#uuid').val(uuid);
    localStorage.setItem('uuid', uuid);
    return uuid;
};


const backHistorial = () => {
    //window.history.back();    
    if(historial_index>0)
    {
        historial_index= historial_index -2;
        let vista_sel = historial_pages[historial_index];
        vista(vista_sel);        
        historial_pages.slice(historial_pages.length-1,1);
    }
}


const historial = (url) => {

    historial_pages.push(url);
    historial_index++;    
    //var stateObj = { foo: url };
    //history.pushState(stateObj, url); // DEV
    //history.pushState(stateObj, url,url); // DEFAULT
}

const headerFixed = () => {    
    var headerApp = $('#header');
    var scrollY = window.scrollY;        
    if(scrollY<50)
    {
        if(scrollY==0)
        //$('.barra_menu').remove();
        headerApp.removeClass('sticky');
    }else{        
        if($('.barra_menu').length==0)
        //$('.ui-content').prepend('<div class="barra_menu"></div>');
        headerApp.addClass('sticky');
    }
}

const verMenu = () =>{
    $("#menu").trigger( "updatelayout" );
}


const init = (nombre,transition = 'slide') => {
    
    historial(nombre);
    $.mobile.pageContainer.pagecontainer("change", "#"+nombre, { reload : false,changeHash :false , reverse: false });
    /*
    $.mobile.changePage( getPhoneGapPath()+"view/"+nombre+".html", {
        //$.mobile.changePage( nombre+".html", {
        transition: transition,
        reverse: false,
        changeHash: false
    });*/
    
}


/* slide - slideup - none - fade */ 
const vista = (nombre,transition = 'slide') => {       
    historial(nombre);
    $.mobile.pageContainer.pagecontainer("change", "#"+nombre, { reload : false,changeHash :false ,reverse: false });
    /*
    $.mobile.changePage( getPhoneGapPath()+"view/"+nombre+".html", { 
    //$.mobile.changePage( nombre+".html", {
        transition: transition,
        reverse: false,
        changeHash: false
    });*/
    
}

const cambiar_tab_sdi = (tab, elemento) => {

    $('.sdi-tab').removeClass('active');
    $('.sdi-tab-content').removeClass('active');

    $(elemento).addClass('active');

    if (tab === 'autorizaciones') {
        $('#content_autorizaciones').addClass('active');
    }

    if (tab === 'reposo') {
        $('#content_reposo').addClass('active');

        // list_control_reposo();
    }
}

const abrirDependiente = () => {
    var div_dependiente = $('#div_paciente_dependiente');
    div_dependiente.removeClass('hidden');
}

const getPhoneGapPath = () => {  
    'use strict';
    var path = window.location.pathname;
    var phoneGapPath = path.substring(0, path.lastIndexOf('/') + 1);
    return phoneGapPath;
};

const showHiddenBlock = (hidden,show) => {
    for(key in hidden)
    $('#'+hidden[key]).addClass('hidden').removeClass('fade-in');
    for(key in show)
    $('#'+show[key]).addClass('fade-in').removeClass('hidden');
}

var medsdiCargandoContador = 0;

const cargando = (estado) => {
    if (estado) {
        medsdiCargandoContador++;

        // Si ya hay un loader visible, no lo recreamos.
        if (medsdiCargandoContador > 1) {
            return;
        }

        $.mobile.loading('show', {
            text: '',
            textVisible: true,
            theme: 'z',
            html: `
            <div class="cont_cargando medsdi-loader-global" role="status" aria-live="polite">
                <svg class="medsdi-loader-anillo" xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#e3f6f6" stroke-width="8"/>
                    <circle class="medsdi-loader-arco" cx="60" cy="60" r="52" fill="none" stroke="#31bebe" stroke-width="8" stroke-linecap="round" stroke-dasharray="90 237"/>
                </svg>
                <span class="medsdi-loader-texto">Cargando</span>
            </div>`
        });
        return;
    }

    medsdiCargandoContador = Math.max(0, medsdiCargandoContador - 1);

    if (medsdiCargandoContador === 0) {
        $.mobile.loading('hide');
    }
};

const formato_miles = (num,iva) => {
    var num = parseInt(num);
    if(isNaN(num))
    { return 0;}
    else
    {
        var cadena = ""; var aux;
        var cont = 1,m,k;
        if(num<0)
        {aux=1;}
        else
        {aux=0;}

        num=num.toString();

        for(m=num.length-1; m>=0; m--)
        {
            cadena = num.charAt(m) + cadena;

            if(cont%3 == 0 && m >aux)
            {cadena = "." + cadena;}
            else
            {cadena = cadena;}

            if(cont== 3)
            {cont = 1;}
            else
            {cont++;}

        }

        cadena = cadena.replace(/.,/,",");
        var resultado = '';
        if(iva){
            //resultado = cadena+' + IVA';
            resultado = cadena;
        }else{
            resultado = cadena;
        }
        return resultado;
    }

}


const numerDepato = (number, piso) => {
    var width = 2;
    var numberOutput = Math.abs(number); /* Valor absoluto del nÃºmero */
    var length = number.toString().length; /* Largo del nÃºmero */
    var zero = "0"; /* String de cero */
    var n = '';
    var p = '';

    if (width <= length) {
        n = numberOutput.toString();
    } else {
        n = ((zero.repeat(width - length)) + numberOutput.toString());
    }

    var pisoOutput = Math.abs(piso); /* Valor absoluto del nÃºmero */
    var lengthp = piso.toString().length; /* Largo del nÃºmero */

    if (width <= lengthp) {
        p = pisoOutput.toString();
    } else {
        p = ((zero.repeat(width - lengthp)) + pisoOutput.toString());
    }
    return parseInt(p+''+n);
}


const monedaPesos = (moneda) => {
    //console.log(parseFloat(moneda).toFixed(2).replace('.', ",").replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1."));
    return parseFloat(moneda).toFixed(0).replace('.', ",").replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1.");
}

function formatearRutBusqueda(input) {

    let valor = input.value;

    let limpio = valor
        .replace(/\./g, '')
        .replace(/-/g, '')
        .replace(/\s/g, '')
        .toUpperCase();

    // Si no parece RUT, no tocar el valor
    if (!/^\d{1,8}[0-9K]?$/.test(limpio)) {
        return;
    }

    if (limpio.length < 2) {
        input.value = limpio;
        return;
    }

    let cuerpo = limpio.slice(0, -1);
    let dv = limpio.slice(-1);

    input.value = cuerpo + '-' + dv;
}

// Formatea automáticamente el RUT en el buscador de “Mis pacientes”.
// Se usa delegación porque la app navega entre páginas con jQuery Mobile.
$(document).on('input', '#mis_pacientes_buscar', function () {
    formatearRutBusqueda(this);
});

const armar_tabla_head = (datos, div_taget) => {
    var html = '<table class="table table-responsive  table-hover size10" id="' + div_taget + '">';
    html += '<thead>';
    html += '<tr>';
    for (var i = 0; i < datos.length; i++)
        html += '<th class="gaccion-' + datos[i][1] +'">' + datos[i][0] + '</th>';
    html += '</tr>';
    html += '</thead>';
    html += '<tbody>';

    return html;
}



const fecha_eng = (fecha) => {
    if(fecha == null || fecha == '')return false;
    var fecha_mod = fecha.split('-');
    return fecha_mod[2]+'-'+fecha_mod[1]+'-'+fecha_mod[0];
}

const removeNull = (registros) => {

    for(var key in registros)
    {
        for(var valor in registros[key])
        {
            if(registros[key][valor]==null)
                registros[key][valor] = '';
        }
    }
    return registros;
}



const revisarDigito = ( dvr ) => {
    dv = dvr + ""
    if ( dv != '0' && dv != '1' && dv != '2' && dv != '3' && dv != '4' && dv != '5' && dv != '6' && dv != '7' && dv != '8' && dv != '9' && dv != 'k'  && dv != 'K')
    {
        alert("Debe ingresar un digito verificador valido");
        window.document.form1.rut.focus();
        window.document.form1.rut.select();
        return false;
    }
    return true;
}

const revisarDigito2 = ( crut ,div) => {
    largo = crut.length;
    if ( largo < 2 )
    {
        //error("Debe ingresar el rut completo");
        msg('RUT', 'Debe ingresar el rut completo', 'error');
        $('#'+div).focus();
        $('#'+div).select();
        return false;
    }
    if ( largo > 2 )
        rut = crut.substring(0, largo - 1);
    else
        rut = crut.charAt(0);
    dv = crut.charAt(largo-1);
    revisarDigito( dv );

    if ( rut == null || dv == null )
        return 0;

    var dvr = '0';
    suma = 0;
    mul  = 2;

    for (i= rut.length -1 ; i >= 0; i--)
    {
        suma = suma + rut.charAt(i) * mul;
        if (mul == 7)
            mul = 2;
        else
            mul++;
    }
    res = suma % 11;
    if (res==1)
        dvr = 'k';
    else if (res==0)
        dvr = '0';
    else
    {
        dvi = 11-res;
        dvr = dvi + ""
    }
    if ( dvr != dv.toLowerCase() )
    {
        //error("EL rut es incorrecto");
        msg('RUT', 'EL rut es incorrecto', 'error');
        $('#'+div).focus();
        $('#'+div).select();
        return false
    }

    return true
}

const Rut = (texto,div) =>{
    var tmpstr = "";
    for ( i=0; i < texto.length ; i++ )
        if ( texto.charAt(i) != ' ' && texto.charAt(i) != '.' && texto.charAt(i) != '-' )
            tmpstr = tmpstr + texto.charAt(i);
    texto = tmpstr;
    largo = texto.length;

    if ( largo < 2 )
    {
        //error("Debe ingresar el rut completo");
        msg('RUT', 'Debe ingresar el rut completo', 'error');
        $('#'+div).focus();
        $('#'+div).select();
        return false;
    }

    for (i=0; i < largo ; i++ )
    {
        if ( texto.charAt(i) !="0" && texto.charAt(i) != "1" && texto.charAt(i) !="2" && texto.charAt(i) != "3" && texto.charAt(i) != "4" && texto.charAt(i) !="5" && texto.charAt(i) != "6" && texto.charAt(i) != "7" && texto.charAt(i) !="8" && texto.charAt(i) != "9" && texto.charAt(i) !="k" && texto.charAt(i) != "K" )
        {
            //error("El valor ingresado no corresponde a un R.U.T valido");
            msg('RUT', 'El valor ingresado no corresponde a un R.U.T valido', 'error');
            $('#'+div).focus();
            $('#'+div).select();
            return false;
        }
    }

    var invertido = "";
    for ( i=(largo-1),j=0; i>=0; i--,j++ )
        invertido = invertido + texto.charAt(i);
    var dtexto = "";
    dtexto = dtexto + invertido.charAt(0);
    dtexto = dtexto + '-';
    cnt = 0;

    for ( i=1,j=2; i<largo; i++,j++ )
    {
        //alert("i=[" + i + "] j=[" + j +"]" );
        if ( cnt == 3 )
        {
            dtexto = dtexto + '.';
            j++;
            dtexto = dtexto + invertido.charAt(i);
            cnt = 1;
        }
        else
        {
            dtexto = dtexto + invertido.charAt(i);
            cnt++;
        }
    }

    invertido = "";
    for ( i=(dtexto.length-1),j=0; i>=0; i--,j++ )
        invertido = invertido + dtexto.charAt(i);

    $('#'+div).val(invertido.toUpperCase());

    if ( revisarDigito2(texto,div) )
        return true;

    return false;
}

const validarEmail = (valor) => {
    var estado = 0;
    if (/^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i.test(valor)){
        estado=0;
    } else {
        estado=1;
    }

    return estado;
}

const abrirControlReposoProfesional = () => {
    if (localStorage.getItem('rolActivo') !== 'Profesional') {
        msg('Control de reposo', 'Esta herramienta está disponible únicamente para el perfil profesional.', 'warning');
        volverInicioSegunRol();
        return;
    }
    cerrar_config_reposo();
    vista('control-reposo-profesional', 'fade');
    cargar_controles_reposo();
};

// Sidebar de configuración del control de reposo (profesional)
const abrir_config_reposo = () => {
    $('#reposo_config_fondo, #reposo_config_sidebar').addClass('abierto');
    $('#reposo_config_sidebar').attr('aria-hidden', 'false');
    $('#control-reposo-profesional').addClass('reposo-sidebar-abierto');
};

const cerrar_config_reposo = () => {
    $('#reposo_config_fondo, #reposo_config_sidebar').removeClass('abierto');
    $('#reposo_config_sidebar').attr('aria-hidden', 'true');
    $('#control-reposo-profesional').removeClass('reposo-sidebar-abierto');
};

let controlReposoPacienteSeleccionado = null;
let controlReposoPacienteActivo = null;
let controlReposoFotoBase64 = null;

const reposoApi = (metodo, datos, callback, method = 'GET') => {
    const api = new Api('rest-controls', metodo);
    api.request(datos || {}, callback, function (xhr) {
        let mensaje = 'No fue posible completar la operación.';
        try { mensaje = JSON.parse(xhr.responseText).message || mensaje; } catch (e) {}
        msg('Control de reposo', mensaje, 'error');
    }, method, false, 30000);
};

const buscar_pacientes_reposo = () => {
    const query = $.trim($('#reposo_buscar_paciente').val() || '');
    reposoApi('patients', {q: query}, function (pacientes) {
        const contenedor = $('#reposo_resultados_pacientes').empty();
        if (!pacientes || !pacientes.length) {
            contenedor.html('<p class="reposo-aviso">No hay pacientes con licencias emitidas por este profesional.</p>');
            return;
        }
        pacientes.forEach(function (paciente) {
            const boton = $('<button type="button" class="reposo-paciente-opcion"></button>');
            boton.append($('<strong></strong>').text(paciente.name));
            boton.append($('<span></span>').text(`${paciente.rut} · Licencia hasta ${paciente.ends_at || 'sin fecha'}${paciente.address ? ' · ' + paciente.address : ''}`));
            boton.on('click', function () { seleccionar_paciente_reposo(paciente); });
            contenedor.append(boton);
        });
    });
};

const seleccionar_paciente_reposo = (paciente) => {
    controlReposoPacienteSeleccionado = paciente;
    $('#reposo_licencia_id').val(paciente.license_id);
    $('#reposo_paciente_resumen, #reposo_paciente_sidebar').text(`${paciente.name} (${paciente.rut})`);
    $('#reposo_fecha_resumen').text(paciente.ends_at || 'Sin fecha configurada');
    $('#reposo_direccion').val(paciente.address || '');
    $('#reposo_resultados_pacientes .reposo-paciente-opcion').removeClass('seleccionado');
    $('#reposo_resultados_pacientes .reposo-paciente-opcion').filter(function () {
        return $(this).text().indexOf(paciente.rut) !== -1;
    }).addClass('seleccionado');
};

const guardar_config_reposo = () => {
    const licenciaId = $('#reposo_licencia_id').val();
    if (!licenciaId) {
        msg('Control de reposo', 'Selecciona primero un paciente con licencia.', 'warning');
        return;
    }
    if ($('#reposo_activo').val() !== '1') {
        msg('Control de reposo', 'Selecciona “Sí” en activar control de reposo.', 'warning');
        return;
    }
    reposoApi('', {
        license_id: Number(licenciaId),
        radius_km: Number($('#reposo_radio_km').val()),
        frequency_hours: Number($('#reposo_frecuencia').val()),
        verify_medications: $('#reposo_control_medicamentos').val() === '1',
        verify_location: $('#reposo_control_ubicacion').val() === '1',
        base_address: $.trim($('#reposo_direccion').val() || ''),
        notes: $.trim($('#reposo_observaciones').val() || '')
    }, function (respuesta) {
        $('#reposo_estado_guardado').html(`<div class="reposo-aviso exito">Solicitud enviada. ${respuesta.notification_sent ? 'El paciente fue notificado.' : 'El paciente aún no tiene notificaciones activas.'}</div>`);
        msg('Control de reposo', 'Configuración guardada correctamente.', 'success');
    }, 'POST');
};

const cargar_controles_reposo = () => {
    if (localStorage.getItem('rolActivo') === 'Profesional') {
        buscar_pacientes_reposo();
        reposoApi('', {}, function (respuesta) {
            render_controles_reposo_profesional(respuesta.controls || []);
        });
        return;
    }
    reposoApi('', {}, function (respuesta) {
        controlReposoPacienteActivo = respuesta.controls && respuesta.controls.length ? respuesta.controls[0] : null;
        if (!controlReposoPacienteActivo) {
            msg('Control de reposo', 'No tienes solicitudes de control pendientes.', 'info');
            volverInicioSegunRol();
            return;
        }
        mostrar_control_reposo_paciente(controlReposoPacienteActivo);
        vista('control-reposo-paciente', 'fade');
    });
};

const render_controles_reposo_profesional = (controles) => {
    const contenedor = $('#reposo_controles_lista').empty();
    if (!controles.length) {
        contenedor.html('<p class="reposo-aviso">Aún no hay controles configurados.</p>');
        return;
    }
    const estados = {pending_acceptance: 'Pendiente de aceptación', active: 'Activo', rejected: 'Rechazado', completed: 'Finalizado'};
    controles.forEach(function (control) {
        const verificaciones = control.checkins || [];
        const ultima = verificaciones.length ? verificaciones[0] : null;
        const tarjeta = $('<div class="reposo-control-item"></div>');
        tarjeta.append($('<div class="reposo-control-cabecera"></div>')
            .append($('<strong></strong>').text(control.patient || 'Paciente'))
            .append($('<span class="reposo-badge"></span>').addClass(control.status === 'active' ? 'activo' : '').text(estados[control.status] || control.status)));
        tarjeta.append($('<small></small>').text(`Licencia #${control.license_id} · hasta ${control.ends_at || 'sin fecha'}`));
        tarjeta.append($('<p></p>').text(ultima
            ? `Última verificación: ${ultima.captured_at || ''} · ${ultima.status === 'outside_radius' ? 'fuera del radio permitido' : 'recibida correctamente'}`
            : 'Todavía no hay verificaciones enviadas.'));
        contenedor.append(tarjeta);
    });
};

const mostrar_control_reposo_paciente = (control) => {
    $('#reposo_paciente_profesional').text(control.professional || 'Profesional tratante');
    $('#reposo_paciente_indicaciones').text(control.notes || 'Revisa y acepta las condiciones para comenzar.');
    const fechaHasta = control.ends_at ? new Date(control.ends_at).toLocaleDateString('es-CL') : 'Sin fecha';
    const estados = {pending_acceptance: 'PENDIENTE', active: 'ACTIVO', rejected: 'RECHAZADO', completed: 'FINALIZADO'};
    $('#reposo_paciente_estado').text(estados[control.status] || control.status).attr('data-status', control.status);
    $('#reposo_paciente_detalle').html(`
        <div class="reposo-item"><span class="reposo-label">Licencia</span><span class="reposo-value">#${control.license_id}</span></div>
        <div class="reposo-item"><span class="reposo-label">Reposo hasta</span><span class="reposo-value">${fechaHasta}</span></div>
        <div class="reposo-item"><span class="reposo-label">Frecuencia</span><span class="reposo-value">Cada ${control.frequency_hours} hora(s)</span></div>
        <div class="reposo-item"><span class="reposo-label">Ubicación</span><span class="reposo-value">${control.verify_location ? `Sí, radio ${control.radius_km} km` : 'No solicitada'}</span></div>
        <div class="reposo-item"><span class="reposo-label">Fotografía</span><span class="reposo-value">${control.verify_medications ? 'Solicitada' : 'No solicitada'}</span></div>`);
    const activo = control.status === 'active';
    $('#reposo_decision_acciones').toggle(!activo);
    $('#reposo_checkin_panel').toggle(activo);
    $('#reposo_foto').toggle(!!control.verify_medications);
    $('#reposo_foto_boton').toggle(!!control.verify_medications);
};

const obtener_ubicacion_reposo = () => new Promise(function (resolve, reject) {
    if (!navigator.geolocation) return reject(new Error('Geolocalización no disponible.'));
    navigator.geolocation.getCurrentPosition(function (position) {
        resolve({latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy_meters: position.coords.accuracy});
    }, function () { reject(new Error('Debes permitir el acceso a tu ubicación.')); }, {enableHighAccuracy: true, timeout: 20000, maximumAge: 0});
});

const decidir_control_reposo = async (decision) => {
    if (!controlReposoPacienteActivo) return;
    let ubicacion = {};
    try {
        if (decision === 'accept' && controlReposoPacienteActivo.verify_location) ubicacion = await obtener_ubicacion_reposo();
    } catch (error) { msg('Ubicación requerida', error.message, 'warning'); return; }
    reposoApi(`${controlReposoPacienteActivo.id}/decision`, Object.assign({decision: decision}, ubicacion), function (respuesta) {
        controlReposoPacienteActivo = respuesta.control;
        mostrar_control_reposo_paciente(controlReposoPacienteActivo);
        msg('Control de reposo', decision === 'accept' ? 'Control aceptado. Ya puedes realizar la verificación.' : 'Solicitud rechazada.', 'success');
        if (decision === 'reject') volverInicioSegunRol();
    }, 'POST');
};

$(document).on('change', '#reposo_foto', function () {
    const archivo = this.files && this.files[0];
    controlReposoFotoBase64 = null;
    $('#reposo_foto_nombre').text(archivo ? archivo.name : 'Usar la cámara del teléfono');
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = function (evento) {
        controlReposoFotoBase64 = evento.target.result;
        $('#reposo_foto_preview').attr('src', controlReposoFotoBase64).show();
    };
    lector.readAsDataURL(archivo);
});

const enviar_verificacion_reposo = async () => {
    if (!controlReposoPacienteActivo || !$('#reposo_consentimiento').prop('checked')) {
        msg('Consentimiento', 'Debes autorizar expresamente el envío de esta verificación.', 'warning');
        return;
    }
    if (controlReposoPacienteActivo.verify_medications && !controlReposoFotoBase64) {
        msg('Fotografía requerida', 'Toma una fotografía antes de enviar.', 'warning');
        return;
    }
    let ubicacion = {};
    try { if (controlReposoPacienteActivo.verify_location) ubicacion = await obtener_ubicacion_reposo(); }
    catch (error) { msg('Ubicación requerida', error.message, 'warning'); return; }
    reposoApi(`${controlReposoPacienteActivo.id}/checkins`, Object.assign(ubicacion, {
        photo: controlReposoFotoBase64,
        consent: true
    }), function (respuesta) {
        const fuera = respuesta.checkin.status === 'outside_radius';
        $('#reposo_paciente_resultado').html(`<div class="reposo-aviso ${fuera ? '' : 'exito'}">Verificación enviada ${fuera ? 'fuera del radio configurado' : 'correctamente'}.</div>`);
        $('#reposo_consentimiento').prop('checked', false);
        $('#reposo_foto').val('');
        $('#reposo_foto_nombre').text('Usar la cámara del teléfono');
        $('#reposo_foto_preview').hide();
        controlReposoFotoBase64 = null;
    }, 'POST');
};
