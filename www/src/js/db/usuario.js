
function actualizarEstado(id_usuario){
	query('UPDATE usuario SET estado = 1 WHERE id_usuario=?', [id_usuario], 
		function (tx, response){
			if (response.rows.length >= 1) {		
                console.log('Estado de usuario actualizado.');		
			}
		}, function (tx, response) {
			console.log('Fallo el cambio de estado del usuario.');
			console.log(tx);
			console.log(response);
		}
	);
}

const checkSesionUsuario = () =>{
    query('SELECT * FROM usuario WHERE estado=?', [1], 
    function (tx, response){
        if (response.rows.length >= 1) {		
            console.log('Usuario Activo.');		
            console.log(response);

            var usuarioi = response.rows[0];
            sesionUsuario(usuarioi);        

            vista('home');

        }
    }, function (tx, response) {
        console.log('Fallo el cambio de estado del usuario.');
        console.log(tx);
        console.log(response);
    }
    );

}

const checkSesionUsuario2 = () =>{
    // Ya no se reconstruye una sesión usando una contraseña persistida.
    // Laravel/Sanctum decide si authToken sigue vigente; si expiró, se solicita
    // un login normal o biométrico.
    return false;
}

const loginOut = () =>{
    query('UPDATE usuario SET estado = 0', [], 
    function (tx, response){
        if (response.rowsAffected == 1) {
            console.log('Exito LoginOut');
            localStorage.clear();
        }else{
            console.log('problema al login out');
        }
    }, function (tx, response) {
        console.log('Fallo el cambio de estado del usuario.');
        console.log(tx);
        console.log(response);
    }
    );

}


const sesionUsuarioInit = (usuario) => {

    //console.log(usuario);

    var usuarioi = {
        'id_usuario': usuario.id,
        'id_tipo_usuario': '',
        'email': usuario.email,
        'nombre': usuario.name,
        'apellido': '',
        'rut':  '',
        'avatar': '',
        // La foto se asigna después, según el rol que el usuario seleccione.
        'foto_perfil': '',
        'sexo' : usuario.sexo || ''
    }
           
    localStorage.removeItem('foto_perfil');
    localStorage.removeItem('foto_perfil_url');
    sesionUsuario(usuarioi);
    actualizarHeaderUsuario();
    /*

    query('SELECT * FROM usuario WHERE id_usuario =?', [usuario.id], 
		function (tx, response){
            
			if (response.rows.length >= 1) {		                
                actualizarEstado(usuario.id);          
                
                var usuarioi = response.rows[0];
                sesionUsuario(usuarioi);        
            }else{

                query('INSERT INTO usuario (id_usuario,id_persona,nombre,apellido,rut,email,avatar,estado)VALUES(?,?,?,?,?,?,?,?)', [usuario.id,usuario.id_persona,usuario.persona.nombre,usuario.persona.apellido_materno,usuario.persona.rut,usuario.persona.email,'',1], 
                function (tx, response){
                    
                    if (response.rowsAffected == 1) {		                
                        console.log('Usuario Activado.');         

                        var usuarioi = {
                            'id': usuario.id,
                            'id_persona': usuario.id_persona,
                            'email': usuario.persona.email,
                            'nombre': usuario.persona.nombre,
                            'apellido': usuario.persona.apellido_materno,
                            'rut':  usuario.persona.rut,
                            'avatar': ''    
                        }
                               
                        sesionUsuario(usuarioi);
                    }else{
                        console.log('Problema al activar el usuario.');     
                    }
                    
                    }, function (tx, response) {
                        console.log('Fallo al activar el usuario.');
                        console.log(tx);
                        console.log(response);
                    }
                );
            }
            
		}, function (tx, response) {
			console.log('Fallo el cambio de estado del usuario.');
			console.log(tx);
			console.log(response);
		}
    );
    */
}

const sesionUsuario = (usuario) => {

    //console.log(usuario);

    const {id_usuario,id_persona,id_tipo_usuario,email,nombre,apellido,rut,avatar,foto_perfil,sexo} = usuario;

    /*
    localStorage.setItem('id_usuario', id_usuario);
    localStorage.setItem('id_persona', id_persona); 
    localStorage.setItem('email', email); 
    localStorage.setItem('nombre', nombre); 
    localStorage.setItem('apellido', apellido); 
    localStorage.setItem('rut', rut);                        
    localStorage.setItem('avatar', avatar);    
    */
   setSession('id_usuario', id_usuario);
   //setSession('id_persona', id_persona);
   //setSession('id_tipo_usuario', id_tipo_usuario); 
   setSession('email', email); 
   setSession('nombre', nombre); 
   
   //setSession('apellido', apellido); 
   //setSession('rut', rut);                        
   //setSession('avatar', avatar);
   setSession('foto_perfil',  foto_perfil);
    setSession('sexo',  sexo);
}

const cerrarSesion = () => {
    const sessionToken = medsdiGetAuthToken();
    if (sessionToken) {
        // La limpieza local no depende de la disponibilidad de la red.
        fetch(MEDSDI_API_URL + '/mobile-authorization/logout', {
            method: 'POST', headers: {Accept: 'application/json', Authorization: 'Bearer ' + sessionToken}
        }).catch(function() {});
    }
    medsdiClearAuthToken();
    if (typeof borrarLoginRecordado === 'function') borrarLoginRecordado();
    $('#pass_device, #password_desbloqueo, #password_, #desafio_clave_web').val('');

    // La identidad física del teléfono no pertenece a la sesión del usuario.
    // Se conserva para poder asociar el mismo equipo a otra cuenta.
    const datosDispositivo = {
        uuid: localStorage.getItem('uuid'),
        model_device: localStorage.getItem('model_device'),
        fcmToken: localStorage.getItem('fcmToken')
    };
    const configuracionBiometrica = {};
    for (var indice = 0; indice < localStorage.length; indice++) {
        var claveBiometrica = localStorage.key(indice);
        if (claveBiometrica && (claveBiometrica.indexOf('biometria_') === 0)) {
            configuracionBiometrica[claveBiometrica] = localStorage.getItem(claveBiometrica);
        }
    }

    localStorage.clear();

    Object.keys(datosDispositivo).forEach(function (clave) {
        if (datosDispositivo[clave]) {
            localStorage.setItem(clave, datosDispositivo[clave]);
        }
    });
    Object.keys(configuracionBiometrica).forEach(function (clave) {
        if (configuracionBiometrica[clave]) {
            localStorage.setItem(clave, configuracionBiometrica[clave]);
        }
    });

    $('#user, #pass').val('');
    if (typeof actualizarBotonLoginBiometricoApp === 'function') {
        actualizarBotonLoginBiometricoApp();
    }
    vista('login','slide');
}

const actualizarHeaderUsuario = () => {
    const nombre = _SESSION('nombre') || 'Usuario';
    const sexo = _SESSION('sexo') || 'O';
    var foto_perfil = _SESSION('foto_perfil') || '';
    var foto_perfil_url = _SESSION('foto_perfil_url') || '';

    if (foto_perfil_url) {
        foto_perfil = foto_perfil_url;
    } else if (foto_perfil && !/^(https?:|data:|blob:|file:)/i.test(foto_perfil)) {
        var baseWeb = typeof MEDSDI_API_URL !== 'undefined'
            ? MEDSDI_API_URL.replace(/\/api\/?$/, '')
            : (typeof MEDSDI_WEB_URL !== 'undefined' ? MEDSDI_WEB_URL : 'https://medichile.cl');
        foto_perfil = baseWeb + '/storage/' + foto_perfil.replace(/^\/+/, '');
    }

    if(foto_perfil=='') {
        foto_perfil = 'src/images/avatar-generico.svg';
    }

    // Mantener sincronizados los encabezados antiguos y los nuevos dashboards.
    // Formato visual: "Nombre I." (primer nombre + inicial del primer apellido).
    const partes = $.trim(nombre).split(/\s+/);
    const nombreCorto = partes.length > 1
        ? partes[0] + ' ' + partes[partes.length - 1].charAt(0).toUpperCase() + '.'
        : partes[0];
    $('.header .row h2 span, .dashboard-user h2 span').text(nombreCorto).attr('title', nombre);
    // Rol visible sobre el nombre en los encabezados interiores (se dibuja por CSS).
    $('.header .row h2').attr('data-rol', localStorage.getItem('rolActivo') === 'Profesional' ? 'Profesional' : 'Paciente');
    $('.header .row h2 img, .dashboard-user h2 img').attr('src', foto_perfil);
}
