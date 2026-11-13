package com.medichile.textofijo;

import android.app.Activity;
import android.content.res.Configuration;
import android.content.res.Resources;
import android.os.Looper;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;

import org.apache.cordova.CordovaPlugin;

/**
 * Mantiene la letra de la app al 100 % aunque el usuario cambie el tamaño de
 * fuente del sistema (Ajustes > Pantalla > Tamaño de fuente). Sin esto, el
 * WebView de Android multiplica todos los font-size por esa escala y el diseño
 * pierde su orden. El tamaño de la letra lo controla solo la app
 * (www/src/css/estilos.css).
 *
 * Cubre dos frentes:
 *  1. El WebView principal: textZoom = 100.
 *  2. Todo lo nativo que se dibuja con el contexto de la Activity (alertas,
 *     confirmaciones y prompts de cordova-plugin-dialogs, ventana del
 *     InAppBrowser): fontScale = 1 en los recursos de la Activity.
 */
public class TextoFijo extends CordovaPlugin {

    private static final int ZOOM_TEXTO = 100;
    private static final float ESCALA_FUENTE = 1f;

    @Override
    protected void pluginInitialize() {
        fijarTexto();
    }

    @Override
    public void onResume(boolean multitasking) {
        super.onResume(multitasking);
        fijarTexto();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        fijarTexto();
    }

    private void fijarTexto() {
        Runnable aplicar = new Runnable() {
            @Override
            public void run() {
                fijarZoomWebView();
                fijarEscalaNativa();
            }
        };
        // Cordova inicia los plugins en el hilo principal; si no, se agenda ahí.
        if (Looper.myLooper() == Looper.getMainLooper()) {
            aplicar.run();
        } else {
            cordova.getActivity().runOnUiThread(aplicar);
        }
    }

    /** El WebView ignora la escala de fuente del sistema. */
    private void fijarZoomWebView() {
        View vista = webView.getView();
        if (!(vista instanceof WebView)) {
            return;
        }
        WebSettings ajustes = ((WebView) vista).getSettings();
        if (ajustes.getTextZoom() != ZOOM_TEXTO) {
            ajustes.setTextZoom(ZOOM_TEXTO);
        }
    }

    /** Los diálogos nativos (sp) también ignoran la escala de fuente del sistema. */
    @SuppressWarnings("deprecation")
    private void fijarEscalaNativa() {
        Activity actividad = cordova.getActivity();
        if (actividad == null) {
            return;
        }
        Resources recursos = actividad.getResources();
        Configuration actual = recursos.getConfiguration();
        if (actual.fontScale != ESCALA_FUENTE) {
            Configuration nueva = new Configuration(actual);
            nueva.fontScale = ESCALA_FUENTE;
            recursos.updateConfiguration(nueva, recursos.getDisplayMetrics());
        }
    }
}
