'use strict';

let videoTabRequest = 0;

const abrirAutorizacionesVideollamada = tipo => {
    if (![2, 4].includes(tipo) || !medsdiGetAuthToken()) return;
    proximoTipoAutorizacion = tipo;
    vista('autorizaciones_sdi');
};

const cargarPestanaVideollamadas = () => {
    const request = ++videoTabRequest;
    const token = medsdiGetAuthToken();
    const role = localStorage.getItem('rolActivo');
    const professional = role === 'Profesional';
    const $list = $('#videollamadas-lista');
    const $status = $('#videollamadas-estado');
    $list.empty();
    $('#videollamadas-fmu').toggle(!professional);
    if (!token || !['Paciente', 'Profesional'].includes(role)) {
        $status.text('Inicia sesión para consultar tus videollamadas.');
        return;
    }

    $status.text('Cargando videollamadas…');
    const current = () => request === videoTabRequest &&
        token === medsdiGetAuthToken() && role === localStorage.getItem('rolActivo');
    const failure = () => {
        if (current()) $status.text('No fue posible cargar las videollamadas. Pulsa Actualizar para reintentar.');
    };

    new Api(professional ? 'profesional' : 'paciente', 'agenda').request({}, (response) => {
        if (!current()) return;
        const calls = horasVigentes(professional ? response?.registros : response?.horas)
            .filter(call => call.es_telemedicina === true || call.es_telemedicina === 1);

        $status.text(calls.length ? '' : 'No hay videollamadas en tu agenda.');
        for (const call of calls) {
            const $card = $('<article>').addClass('cita-paciente-card');
            const name = professional ? call.paciente : call.profesional;
            $('<h3>').text(String(name || (professional ? 'Paciente' : 'Profesional')).toLocaleUpperCase('es-CL')).appendTo($card);
            $('<p>').text([fechaEsp(call.fecha_consulta), String(call.hora_inicio || '').slice(0, 5), call.lugar]
                .filter(Boolean).join(' · ')).appendTo($card);
            $('<p>').text(call.estado || '').appendTo($card);
            if (call.puede_conectarse === true && typeof call.video_url === 'string') {
                try {
                    const endpoint = medsdiVideoEndpoint(call.video_url);
                    if (!new URL(endpoint).pathname.endsWith('/' + (professional ? 'profesional' : 'paciente') + '/acceso')) throw new Error('El rol de la llamada no coincide.');
                    $('<button type="button" data-role="none">').addClass('cita-btn videollamada js-video-app')
                        .attr('data-video-endpoint', endpoint).text('Entrar a la videollamada').appendTo($card);
                } catch (error) {
                    // Se conserva el estado de la cita aunque la API devuelva un destino inválido.
                }
            }
            $list.append($card);
        }
    }, failure, 'GET', null, {cacheTtl: 0});
};

$(document).on('pageshow', '#videollamadas', cargarPestanaVideollamadas);
$(document).on('pagehide', '#videollamadas', () => {
    videoTabRequest++;
    $('#videollamadas-lista').empty();
    $('#videollamadas-estado').text('');
});
