/**
 * @param titulo
 * @param texto
 * @param tipo : success, info, error, warning
 * @param position: 0-bottom-left, 1-bottom-right, 2-bottom-center, 3-top-left, 4-top-right, 5-top-center, 6-mid-center
 */
   function msg(titulo,texto,tipo,id_position) {

    // Todas las notificaciones se muestran abajo (posición 1, centrada por CSS),
    // sin importar la posición que se pida.
    id_position = 1;

    var position = ['bottom-left', 'bottom-right', 'bottom-center', 'top-left', 'top-right', 'top-center', 'mid-center'];

    $.toast({
           heading: titulo,
           text: texto,
           position: position[id_position],// bottom-left or bottom-right or bottom-center or top-left or top-right or top-center or mid-center
           loaderBg: '#ff6849',
           icon: tipo,
           hideAfter: 6000,
           stack: 6
       });
   }

