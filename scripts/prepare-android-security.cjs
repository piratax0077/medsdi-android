const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sha = text => crypto.createHash('sha256').update(text).digest('hex');
module.exports = function(context) {
  const root = context.opts.projectRoot;
  const android = path.join(root, 'platforms/android');
  if (!fs.existsSync(android)) return;
  const patches = require('./android-security-patches.json');
  for (const patch of patches) {
    const target = path.join(android, 'app/src/main/java', patch.path);
    let text = fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n');
    if (sha(text) === patch.after) continue;
    if (sha(text) !== patch.before) throw new Error('Revisar cambio de plugin Android: '+patch.path);
    for (const [before,after] of patch.changes) {
      if (text.split(before).length !== 2) throw new Error('Parche Android ambiguo: '+patch.path);
      text = text.replace(before,after);
    }
    if (sha(text) !== patch.after) throw new Error('Integridad del parche Android incorrecta');
    fs.writeFileSync(target,text);
  }
  const extras = path.join(android,'app/build-extras.gradle');
  const legacyPolicy = 'android { lintOptions { abortOnError true } }\n';
  // Resolver únicamente la petición dinámica heredada usando una versión ya instalada.
  // No forzar ni rebajar las versiones explícitas que soliciten otros componentes.
  const policy = legacyPolicy + `configurations.configureEach {
    resolutionStrategy.eachDependency {
        if (requested.group == 'androidx.core' && requested.name == 'core' && requested.version == '1.6.+') {
            useVersion('1.13.0')
            because('Sustituir una petición dinámica heredada por la versión validada localmente')
        }
    }
}
`;
  if (fs.existsSync(extras) && ![policy,legacyPolicy].includes(fs.readFileSync(extras,'utf8'))) throw new Error('Revisar build-extras.gradle antes de combinar políticas');
  fs.writeFileSync(extras,policy);
};
