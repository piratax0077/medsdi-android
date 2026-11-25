(() => {
    'use strict';
    const id = value => {const number=Number(value);if(!Number.isSafeInteger(number)||number<1)throw new Error('Selección incompleta');return number;};
    const make = (selection, date, time) => {
        if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('Fecha no válida');
        const mode=id(selection.mode),types={1:'C',2:'D',3:'T',4:'E',5:'E'};
        if(!types[mode])throw new Error('Agenda no válida');
        const data={id_profesional:id(selection.professional),id_lugar:id(selection.place),fecha:date,tipo_agenda:mode,tipo_hora_medica:types[mode]};
        if(mode>=4)data.id_procedimiento=id(selection.procedure);
        if(time!==undefined){if(!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time))throw new Error('Hora no válida');data.hora=time.length===5?time+':00':time;}
        return data;
    };
    window.medsdiBookingInput={availability:(selection,date)=>make(selection,date),reservation:(selection,date,time)=>make(selection,date,time)};
})();
