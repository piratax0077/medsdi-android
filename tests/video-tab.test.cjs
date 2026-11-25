const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('../www/src/js/video/pestana.js'), 'utf8');

function harness() {
    const nodes = new Map();
    const events = {};
    const requests = [];
    let role = 'Paciente';
    let token = 'session';
    function node(selector) {
        if (selector === context.document) return {on(event, page, handler) { events[event] = handler; }};
        const element = {
            children: [], attrs: {}, value: '',
            empty() { this.children = []; return this; },
            text(value) { this.value = value; return this; },
            toggle(value) { this.visible = value; return this; },
            addClass(value) { this.classes = value; return this; },
            attr(key, value) { this.attrs[key] = value; return this; },
            appendTo(parent) { parent.append(this); return this; },
            append(child) { this.children.push(child); return this; },
        };
        if (selector.startsWith('<')) return element;
        if (!nodes.has(selector)) nodes.set(selector, element);
        return nodes.get(selector);
    }
    const context = {
        document: {}, URL, $: node, localStorage: {getItem: () => role},
        medsdiGetAuthToken: () => token, horasVigentes: input => input || [],
        fechaEsp: value => value,
        medsdiVideoEndpoint(url) {
            const endpoint = new URL(url, 'https://app.example.invalid');
            if (endpoint.origin !== 'https://app.example.invalid') throw Error();
            return endpoint.href;
        },
        Api: class {
            constructor(module, method) { this.module = module; this.method = method; }
            request(body, success, fail, verb, data, options) {
                requests.push({module: this.module, method: this.method, body, success, fail, verb, options});
            }
        },
        vista: page => { context.page = page; }, proximoTipoAutorizacion: null,
    };
    vm.createContext(context);
    vm.runInContext(source, context);
    return {events, requests, node, context,
        role: value => { role = value; }, token: value => { token = value; },
        permission: type => vm.runInContext('abrirAutorizacionesVideollamada(' + type + ')', context)};
}

test('lista solo telemedicina y abre únicamente el acceso autorizado del rol', () => {
    const h = harness();
    h.events.pageshow();
    const request = h.requests[0];
    assert.equal(request.module, 'paciente');
    assert.equal(request.options.cacheTtl, 0);
    const call = {es_telemedicina: true, puede_conectarse: true, profesional: '<b>Prueba</b>'};
    request.success({horas: [
        {es_telemedicina: false},
        {...call, video_url: '/api/agenda/videollamada/1/paciente/acceso'},
        {...call, video_url: '/api/agenda/videollamada/1/profesional/acceso'},
        {...call, video_url: 'https://other.example.invalid/acceso'},
        {...call, puede_conectarse: false, video_url: '/api/agenda/videollamada/1/paciente/acceso'},
    ]});
    const cards = h.node('#videollamadas-lista').children;
    assert.equal(cards.length, 4);
    assert.equal(cards[0].children[0].value, '<B>PRUEBA</B>');
    assert.equal(cards[0].children[3].attrs['data-video-endpoint'], 'https://app.example.invalid/api/agenda/videollamada/1/paciente/acceso');
    assert.deepEqual(cards.slice(1).map(card => card.children.length), [3, 3, 3]);
});

test('la pestaña descarta respuestas tardías al salir o cambiar de cuenta', () => {
    const h = harness();
    h.role('Profesional');
    h.events.pageshow();
    assert.equal(h.requests[0].module, 'profesional');
    assert.equal(h.node('#videollamadas-fmu').visible, false);
    h.events.pagehide();
    h.requests[0].success({registros: [{es_telemedicina: true}]});
    assert.equal(h.node('#videollamadas-lista').children.length, 0);
    h.events.pageshow();
    h.token('another');
    h.requests[1].success({registros: [{es_telemedicina: true}]});
    assert.equal(h.node('#videollamadas-lista').children.length, 0);
});

test('las autorizaciones abren el circuito existente con el tipo correspondiente', () => {
    const h = harness();
    h.permission(4);
    assert.equal(h.context.page, 'autorizaciones_sdi');
    assert.equal(h.context.proximoTipoAutorizacion, 4);
    h.permission(2);
    assert.equal(h.context.proximoTipoAutorizacion, 2);
    h.token('');
    h.permission(4);
    assert.equal(h.context.proximoTipoAutorizacion, 2);
});
