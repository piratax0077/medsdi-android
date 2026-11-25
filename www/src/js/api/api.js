"use strict";

// Backend centralizado. Durante las pruebas se puede alternar desde la consola:
// medsdiSetBackend('cloud');
// medsdiSetBackend('legacy');
var MEDSDI_IS_LOCAL = (
    window.location.protocol === 'http:' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
);
var MEDSDI_BACKENDS = {
    local: 'http://medsdi.test',
    legacy: 'https://med-sdi.cl',
    cloud: 'https://medichile.cl'
};
// En Android / producción se fuerza Cloud para evitar que una instalación
// anterior conserve "medsdiBackend=legacy" en localStorage.
var MEDSDI_BACKEND = MEDSDI_IS_LOCAL
    ? 'local'
    : 'cloud';

// Limpiar una selección antigua guardada por versiones previas.
if (!MEDSDI_IS_LOCAL) {
    localStorage.removeItem('medsdiBackend');
}

var MEDSDI_WEB_URL = MEDSDI_BACKENDS[MEDSDI_BACKEND];
var MEDSDI_API_URL = MEDSDI_WEB_URL + '/api';

function medsdiSetBackend(backend) {
    if (!MEDSDI_BACKENDS[backend] || backend === 'local') {
        throw new Error('Backend MED-SDI no válido: ' + backend);
    }

    localStorage.setItem('medsdiBackend', backend);
    localStorage.removeItem('authToken');
    location.reload();
}

/**
 * Created by Paul on 24/09/2018.
 */

// Gestor global de peticiones. Evita GET duplicados simultáneos y corta
// temporalmente nuevas peticiones cuando Laravel responde 429.
var MEDSDI_REQUEST_STATE = {
    inflight: {},
    cache: {},
    cooldownUntil: 0
};

// Loader global: todas las peticiones API reales muestran espera.
// GET servidos desde caché o reutilizados no abren un loader nuevo.
const medsdiGlobalLoadingStart = () => {
    if (typeof cargando === 'function') {
        cargando(1);
    }
};

const medsdiGlobalLoadingEnd = () => {
    if (typeof cargando === 'function') {
        cargando(0);
    }
};

const medsdiCacheTtl = (url) => {
    var path = String(url || '');
    // El estado puede cambiar al aprobar/revocar el equipo; siempre se consulta
    // al backend para no mantener por minutos un rechazo ya resuelto.
    if (path.indexOf('/mobile-authorization/device') !== -1) return 0;
    if (path.indexOf('/mobile-2fa/challenges') !== -1) return 30 * 1000;
    if (path.indexOf('/perfil/datos') !== -1) return 60 * 1000;
    if (path.indexOf('/paciente/dame_regiones') !== -1) return 30 * 60 * 1000;
    if (path.indexOf('/paciente/dame_ciudades') !== -1) return 10 * 60 * 1000;
    return 8 * 1000;
};

const medsdiClearGetCache = () => {
    MEDSDI_REQUEST_STATE.cache = {};
};

// Las respuestas autenticadas pertenecen a una sesión concreta. Incluir una
// huella del token evita reutilizar datos de la cuenta anterior en el mismo
// teléfono (especialmente el estado de mobile-authorization/device).
const medsdiRequestKey = (method, url, token) => {
    var sessionKey = token
        ? String(token).slice(-24)
        : 'public';
    return String(method || 'GET').toUpperCase() + ' ' + url + ' session:' + sessionKey;
};

const medsdiRetryAfterMs = (xhr) => {
    if (!xhr || typeof xhr.getResponseHeader !== 'function') return 60000;
    var retryAfter = parseInt(xhr.getResponseHeader('Retry-After') || '0', 10);
    return retryAfter > 0 ? retryAfter * 1000 : 60000;
};

var datosRequest = /** @class */ (function () {
    function datosRequest(modulo_, metodo_, data_, debug_) {
        if (debug_ === void 0) { debug_ = false; }
        this.modulo = modulo_;
        this.metodo = metodo_;
        this.data = data_;
        this.debug = debug_;
    }
    return datosRequest;
}());
var Api = /** @class */ (function () {
    function Api(modulo, metodo) {
        this.url_ = MEDSDI_API_URL;
        this.type_ = "POST";
        this.modulo_ = modulo;
        this.metodo_ = metodo;
    }

    Api.prototype.request = function (data, callback, errorcallback, methodSend, debug, _timeout) {
        if (_timeout == undefined) _timeout = 15000;

        callback = typeof callback === 'function' ? callback : function () {};
        errorcallback = typeof errorcallback === 'function' ? errorcallback : function () {};
        methodSend = String(methodSend || 'GET').toUpperCase();

        var headers = {'Accept': 'application/json'};
        var needsAuth = this.needsAuth();
        var token = localStorage.getItem('authToken');

        if (token && needsAuth) {
            headers['X-Auth-Token'] = token;
        } else if (needsAuth && !token) {
            errorcallback({status: 401, responseText: 'No token available'});
            return;
        }

        var requestData;
        var contentType = false;
        var processData = true;
        var url = (this.url_ + '/' + this.modulo_ + '/' + this.metodo_).replace(/\/+$/, '');

        if (methodSend === 'GET') {
            if (data && Object.keys(data).length > 0) {
                var params = new URLSearchParams(data).toString();
                url += '?' + params;
            }
            requestData = undefined;
        } else {
            headers['Content-Type'] = 'application/json';
            requestData = JSON.stringify(data || {});
            contentType = 'application/json';
            processData = false;
        }

        var requestKey = medsdiRequestKey(methodSend, url, needsAuth ? token : null);
        var now = Date.now();

        if (MEDSDI_REQUEST_STATE.cooldownUntil > now) {
            var waitSeconds = Math.ceil((MEDSDI_REQUEST_STATE.cooldownUntil - now) / 1000);
            console.warn('[MED-SDI] API en cooldown por 429. Restan ' + waitSeconds + 's.');
            errorcallback({status: 429, responseText: 'Rate limit cooldown', retry_after: waitSeconds}, 'ratelimit', 'Too Many Requests');
            return;
        }

        // Reutilizar GET recientes. Reduce navegación repetitiva y presión sobre Laravel.
        if (methodSend === 'GET' && MEDSDI_REQUEST_STATE.cache[requestKey]) {
            var cached = MEDSDI_REQUEST_STATE.cache[requestKey];
            if ((now - cached.createdAt) < cached.ttl) {
                console.log('[MED-SDI] GET desde caché:', url);
                setTimeout(function () { callback(cached.response); }, 0);
                return null;
            }
            delete MEDSDI_REQUEST_STATE.cache[requestKey];
        }

        // Si el mismo GET ya está viajando al servidor, compartimos la respuesta.
        if (methodSend === 'GET' && MEDSDI_REQUEST_STATE.inflight[requestKey]) {
            MEDSDI_REQUEST_STATE.inflight[requestKey].success.push(callback);
            MEDSDI_REQUEST_STATE.inflight[requestKey].error.push(errorcallback);
            console.log('[MED-SDI] GET duplicado reutilizado:', url);
            return MEDSDI_REQUEST_STATE.inflight[requestKey].xhr;
        }

        if (methodSend === 'GET') {
            MEDSDI_REQUEST_STATE.inflight[requestKey] = {
                success: [callback],
                error: [errorcallback],
                xhr: null
            };
        }

        var startedAt = Date.now();
        medsdiGlobalLoadingStart();

        var xhrRequest = $.ajax({
            type: methodSend,
            url: url,
            data: requestData,
            dataType: 'json',
            headers: headers,
            contentType: contentType,
            processData: processData,
            success: function (response) {
                console.log('[MED-SDI] ' + methodSend + ' ' + url + ' OK en ' + (Date.now() - startedAt) + 'ms');

                if (methodSend === 'GET') {
                    MEDSDI_REQUEST_STATE.cache[requestKey] = {
                        response: response,
                        createdAt: Date.now(),
                        ttl: medsdiCacheTtl(url)
                    };
                } else {
                    // Cualquier escritura puede invalidar datos previamente cacheados.
                    medsdiClearGetCache();
                }

                if (methodSend === 'GET' && MEDSDI_REQUEST_STATE.inflight[requestKey]) {
                    var listeners = MEDSDI_REQUEST_STATE.inflight[requestKey].success.slice();
                    delete MEDSDI_REQUEST_STATE.inflight[requestKey];
                    listeners.forEach(function (fn) { fn(response); });
                } else {
                    callback(response);
                }
            },
            error: function (xhr, status, error) {
                console.error('[MED-SDI] ' + methodSend + ' ' + url + ' ERROR', xhr.status, status, error);

                if (xhr.status === 429) {
                    MEDSDI_REQUEST_STATE.cooldownUntil = Date.now() + medsdiRetryAfterMs(xhr);
                }

                if (xhr.status === 401) {
                    localStorage.removeItem('authToken');
                    if (typeof vista === 'function') vista('login', 'fade');
                }

                if (methodSend === 'GET' && MEDSDI_REQUEST_STATE.inflight[requestKey]) {
                    var listeners = MEDSDI_REQUEST_STATE.inflight[requestKey].error.slice();
                    delete MEDSDI_REQUEST_STATE.inflight[requestKey];
                    listeners.forEach(function (fn) { fn(xhr, status, error); });
                } else {
                    errorcallback(xhr, status, error);
                }
            },
            complete: function () {
                medsdiGlobalLoadingEnd();

                if (methodSend === 'GET' && MEDSDI_REQUEST_STATE.inflight[requestKey] && !MEDSDI_REQUEST_STATE.inflight[requestKey].xhr) {
                    delete MEDSDI_REQUEST_STATE.inflight[requestKey];
                }
            },
            timeout: _timeout
        });

        if (methodSend === 'GET' && MEDSDI_REQUEST_STATE.inflight[requestKey]) {
            MEDSDI_REQUEST_STATE.inflight[requestKey].xhr = xhrRequest;
        }

        return xhrRequest;
    };

    // *** CAMBIO IMPORTANTE: Agregar la nueva ruta a protectedRoutes ***
    Api.prototype.needsAuth = function() {
        var protectedRoutes = [
            'paciente/mi_ficha_medica',
            'paciente/mis_profesionales',
            'paciente/mis_horas_medicas',
            'paciente/agenda',
            'profesional/agenda',
            'profesional/mis_pacientes',
            'perfil/datos',
            'perfil/foto',
            'perfil/clave-dispositivo',
            'paciente/mis_examenes',
            'paciente/mis_recetas',
            'paciente/mis_consentimientos',
            'paciente/ficha_atencion_app',           // *** NUEVA RUTA ***
            'paciente/ficha-atencion-app',           // *** POR SI ACASO ***
            'profesionales/buscar_profesionales',
            'paciente/agendar_hora_medica',
            'paciente/anular_hora_medica',
            'paciente/confirmar_hora_medica'
            ,'mensajes/'
            ,'mensajes'
            ,'mensajes/leer'
            // Agregar aquí cualquier otra ruta que requiera autenticación
        ];

        var currentRoute = this.modulo_ + '/' + this.metodo_;
        return protectedRoutes.includes(currentRoute)
            || currentRoute.indexOf('mensajes') === 0
            || currentRoute.indexOf('mobile-authorization/') === 0
            || currentRoute.indexOf('mobile-2fa/') === 0
            || currentRoute.indexOf('rest-controls') === 0;
    };

    // Resto del código igual...
    Api.prototype.help = function () {
        console.log("\n        -- Inicializar Datos --\n        Ej: var datos = {nombre:'prueba'};\n        -- Incializamos la Api -- Paramentros(modulo:string,metodo:string)\n        Ej: var api = new Api(\"adicionales\",\"obtenerCoberturas\");\n        -- Ejecutamos un REQUEST -- Parametros(datos:Object,funcion callback,metodo de envio \"GET\" o \"POST\")\n        Ej: api.request(datos,function(resp:any){console.log(resp)},\"GET\")\n      ");
    };

    Object.defineProperty(Api.prototype, "url", {
        get: function () { return this.url_; },
        set: function (url__) { this.url_ = url__; },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Api.prototype, "type", {
        get: function () { return this.type_; },
        set: function (type__) { this.type_ = type__; },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Api.prototype, "modulo", {
        get: function () { return this.modulo_; },
        set: function (modulo__) { this.modulo_ = modulo__; },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Api.prototype, "metodo", {
        get: function () { return this.metodo_; },
        set: function (metodo__) { this.metodo_ = metodo__; },
        enumerable: true,
        configurable: true
    });

    return Api;
}());
