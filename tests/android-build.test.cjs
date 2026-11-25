const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const prepare = require('../scripts/prepare-android-security.cjs');
const patches = require('../scripts/android-security-patches.json');
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
test('native security patches match reviewed source and apply idempotently', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'medichile-native-test-'));
  try {
    const base = path.join(root,'platforms/android/app/src/main/java');
    for (const patch of patches) {
      // Usar bytes revisados del plugin de origen para comprobar el contrato antes del parche.
      const relativePlugin = patch.path.includes('biometric/') ? 'cordova-plugin-fingerprint-aio' : patch.path.includes('dialogs/') ? 'cordova-plugin-dialogs' : 'cordova-plugin-firebasex-messaging';
      const pluginFile = path.join(__dirname,'../node_modules',relativePlugin,'src/android',path.basename(patch.path));
      const restored = fs.readFileSync(pluginFile,'utf8').replace(/\r\n/g,'\n');
      assert.equal(hash(restored),patch.before);
      fs.mkdirSync(path.dirname(path.join(base,patch.path)),{recursive:true});
      fs.writeFileSync(path.join(base,patch.path),restored);
    }
    prepare({opts:{projectRoot:root}});
    prepare({opts:{projectRoot:root}});
    for(const patch of patches) assert.equal(hash(fs.readFileSync(path.join(base,patch.path),'utf8')),patch.after);
    const target=path.join(base,patches[0].path);
    fs.appendFileSync(target,'\n// cambio no revisado');
    const changed=fs.readFileSync(target,'utf8');
    assert.throws(()=>prepare({opts:{projectRoot:root}}),/Revisar cambio de plugin/);
    assert.equal(fs.readFileSync(target,'utf8'),changed);
    assert.match(fs.readFileSync(path.join(root,'platforms/android/app/build-extras.gradle'),'utf8'),/abortOnError true/);
  } finally {
    assert.equal(path.dirname(root),os.tmpdir());
    assert.ok(path.basename(root).startsWith('medichile-native-test-'));
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('Cordova loads the security hook through its JavaScript adapter',()=>{
  const root=path.join(__dirname,'..');
  const xml=fs.readFileSync(path.join(root,'config.xml'),'utf8');
  assert.match(xml,/<hook type="after_prepare" src="scripts\/prepare-android-security\.js"/);
  assert.equal(require('../scripts/prepare-android-security.js'),prepare);
});
