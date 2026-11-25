# Verificación Android local del 23 de noviembre de 2026

Se restauró cordova-android 15, JDK 17, SDK 36, build tools 36.0.0 y Gradle 8.14.2 en un entorno de prueba. APK debug compilado con una clave exclusiva de prueba. No es una versión firmada para distribución ni fue instalado en un teléfono.

El hook after_prepare scripts/prepare-android-security.cjs aplica seis parches revisados y exige hashes antes y después. Se detiene ante cambios de plugins para obligar a revisarlos de nuevo. Añade super.onActivityResult al callback biométrico sin alterar sus condiciones de éxito/error, corrige una condición sin llaves y usa una Activity como destino directo de la notificación en todas las versiones soportadas. Elimina logs con token FCM y datos de notificaciones de los archivos revisados. Exige abortOnError true en Lint. No parchear manualmente platforms: se regenera.

Verificación: 14 pruebas JavaScript, una prueba adicional del hook (aplicación, repetición, rechazo de cambio no revisado) y Android Lint con cero errores y 66 advertencias. testDebugUnitTest indica NO-SOURCE: no se ejecutaron pruebas unitarias Java. El éxito de Gradle anterior a la corrección no significaba Lint limpio: abortOnError estaba en false y había tres errores.

Instalar las dependencias del lockfile con npm ci --ignore-scripts. npm test y npm run test:android verifican las fuentes de los plugins sin requerir la plataforma generada ni compilar Android. Ejecutar después la compilación debug con configuración de prueba, :app:lintDebug y :app:testDebugUnitTest. Mantener claves y configuración de firma fuera del repositorio; no usar la clave de prueba para publicar.

Pendiente: pruebas en dispositivos reales de biometría, bloqueo/desbloqueo, expiración y revocación, cambio de cuenta, notificaciones foreground/background y adjuntos. El proveedor Firebase advierte ausencia de Web Client ID para Android Credential Manager: definirlo con la configuración oficial del proyecto si se usa ese mecanismo, sin inventar identificadores. Persisten advertencias de plugins, recursos y APIs obsoletas; no equivalen a un APK auditado ni a certificación externa.
