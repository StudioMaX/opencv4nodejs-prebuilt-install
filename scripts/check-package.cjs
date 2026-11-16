const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run this check with npm run test:package');

const originalManifest = fs.readFileSync(path.join(root, 'package.json'));
const backupPath = path.join(root, 'package.json.backup');
assert(!fs.existsSync(backupPath), 'package.json.backup already exists; preserve or restore it before packing');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'opencv-package-check-'));

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${result.error || result.stderr || result.stdout}`);
  }
  return result.stdout;
}

try {
  run(process.execPath, [npm, 'pack', '--pack-destination', temp], root);
  assert(fs.readFileSync(path.join(root, 'package.json')).equals(originalManifest), 'package.json was not restored');
  assert(!fs.existsSync(backupPath), 'temporary package.json.backup was not removed');

  const archives = fs.readdirSync(temp).filter((file) => file.endsWith('.tgz'));
  assert.strictEqual(archives.length, 1, 'expected one npm archive');
  const archive = path.join(temp, archives[0]);
  const consumer = path.join(temp, 'consumer');
  fs.mkdirSync(consumer);
  fs.writeFileSync(path.join(consumer, 'package.json'), JSON.stringify({ name: 'package-consumer', version: '1.0.0', private: true }));
  run(process.execPath, [npm, 'install', '--ignore-scripts', '--no-audit', '--no-fund', archive, '@types/node@^22'], consumer);

  const packageDir = path.join(consumer, 'node_modules', '@stdmx', 'opencv4nodejs-prebuilt-install');
  const manifest = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
  assert.strictEqual(manifest.scripts.install, 'prebuild-install || exit 0');
  assert(fs.existsSync(path.join(packageDir, manifest.main)), 'package entrypoint is missing');
  assert(fs.existsSync(path.join(packageDir, manifest.typings)), 'TypeScript entrypoint is missing');
  assert(fs.existsSync(path.join(packageDir, 'lib', 'src', 'misc.js')), 'runtime helpers are missing');
  assert(fs.existsSync(path.join(packageDir, 'lib', 'haarcascades', 'haarcascade_frontalface_default.xml')), 'Haar cascades are missing');
  assert(fs.existsSync(path.join(packageDir, 'lib', 'lbpcascades', 'lbpcascade_frontalface.xml')), 'LBP cascades are missing');
  function checkRuntimeFiles(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) checkRuntimeFiles(file);
      else assert(/\.(?:js|xml)$/.test(entry.name), `unexpected file in packaged lib: ${file}`);
    }
  }
  checkRuntimeFiles(path.join(packageDir, 'lib'));

  const debug = spawnSync(process.execPath, ['-e', "require('@stdmx/opencv4nodejs-prebuilt-install')"], {
    cwd: consumer,
    encoding: 'utf8',
    env: { ...process.env, OPENCV4NODES_DEBUG_REQUIRE: '1', NODE_OPTIONS: '' },
  });
  assert.strictEqual(debug.status, 0, `debug load failed: ${debug.stderr}`);
  assert.match(debug.stderr, /require path is .*opencv4nodejs/);
  assert.match(debug.stderr, /failed to require cv with exception: .*opencv4nodejs/);
  assert.doesNotMatch(debug.stderr, /Cannot find module ['"]npmlog/);

  fs.writeFileSync(path.join(consumer, 'index.ts'), [
    "import cv, { Mat } from '@stdmx/opencv4nodejs-prebuilt-install';",
    'const image: Mat = new cv.Mat(2, 2, cv.CV_8UC1);',
    'console.log(image.rows, cv.getVersionString());',
  ].join('\n'));
  const tsc = require.resolve('typescript/bin/tsc');
  run(process.execPath, [tsc, '--noEmit', '--strict', '--skipLibCheck', '--esModuleInterop', '--moduleResolution', 'node', 'index.ts'], consumer);
  console.log('Packed package installs and typechecks; package.json was restored.');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
