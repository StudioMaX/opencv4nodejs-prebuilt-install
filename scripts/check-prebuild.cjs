const assert = require('assert');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const tar = require('tar');

const root = path.resolve(__dirname, '..');
const npm = process.env.npm_execpath;
const prebuild = process.argv[2] && path.resolve(process.argv[2]);
if (!npm || !prebuild || !fs.existsSync(prebuild)) {
  throw new Error('Usage: npm run test:prebuild -- <path-to-prebuild.tar.gz>');
}
const backup = path.join(root, 'package.json.backup');
assert(!fs.existsSync(backup), 'package.json.backup already exists; preserve or restore it before packing');
const manifest = fs.readFileSync(path.join(root, 'package.json'));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'opencv-prebuild-check-'));
const server = http.createServer();
let requests = 0;

async function main() {
  const expected = path.join(temp, 'expected');
  const consumer = path.join(temp, 'consumer');
  fs.mkdirSync(expected);
  fs.mkdirSync(consumer);
  await tar.extract({ file: prebuild, cwd: expected });
  const expectedAddon = path.join(expected, 'build', 'Release', 'opencv4nodejs.node');
  assert(fs.existsSync(expectedAddon), 'prebuild has no Release addon');

  const pack = spawnSync(process.execPath, [npm, 'pack', '--pack-destination', temp], { cwd: root, encoding: 'utf8' });
  if (pack.status !== 0) throw new Error(`npm pack failed: ${pack.error || pack.stderr || pack.stdout}`);
  assert(fs.readFileSync(path.join(root, 'package.json')).equals(manifest), 'package.json was not restored');
  assert(!fs.existsSync(backup), 'temporary package.json.backup was not removed');
  const archive = fs.readdirSync(temp).filter((file) => file.endsWith('.tgz'));
  assert.strictEqual(archive.length, 1, 'expected one package archive');
  fs.writeFileSync(path.join(consumer, 'package.json'), JSON.stringify({ name: 'prebuild-consumer', version: '1.0.0', private: true }));

  server.on('request', (req, res) => {
    if (req.url !== `/${path.basename(prebuild)}`) {
      res.writeHead(404).end();
      return;
    }
    requests += 1;
    res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
    fs.createReadStream(prebuild).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const env = {
    ...process.env,
    npm_config_cache: path.join(temp, 'npm-cache'),
    npm_config_download: `http://127.0.0.1:${port}/{name}-v{version}-{runtime}-v{abi}-{platform}{libc}-{arch}.tar.gz`,
    NO_PROXY: '127.0.0.1,localhost',
    no_proxy: '127.0.0.1,localhost',
  };
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [npm, 'install', '--foreground-scripts', '--no-audit', '--no-fund', path.join(temp, archive[0])], {
      cwd: consumer, env, stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`npm install exited with ${code}`)));
  });
  assert(requests > 0, 'prebuild-install did not download the supplied archive');
  const installed = path.join(consumer, 'node_modules', '@stdmx', 'opencv4nodejs-prebuilt-install', 'build', 'Release');
  for (const file of fs.readdirSync(path.dirname(expectedAddon))) {
    const source = path.join(path.dirname(expectedAddon), file);
    if (fs.statSync(source).isFile()) {
      assert(fs.readFileSync(path.join(installed, file)).equals(fs.readFileSync(source)), `installed ${file} differs from the supplied archive`);
    }
  }
  const check = spawnSync(process.execPath, ['-e', "const cv = require('@stdmx/opencv4nodejs-prebuilt-install'); if (!cv) throw Error('addon failed to load'); const m = new cv.Mat(2, 2, cv.CV_8UC1); if (m.rows !== 2) throw Error('unexpected Mat'); console.log('OpenCV', cv.getVersionString());"], {
    cwd: consumer, encoding: 'utf8',
  });
  if (check.status !== 0) throw new Error(`addon smoke test failed: ${check.error || check.stderr || check.stdout}`);
  console.log(check.stdout.trim());
  console.log('Downloaded prebuild matches the supplied archive and loads successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
}).finally(() => {
  server.close();
  fs.rmSync(temp, { recursive: true, force: true });
});
