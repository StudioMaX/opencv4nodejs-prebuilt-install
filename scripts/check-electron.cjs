const path = require('path');
const { spawnSync } = require('child_process');

const [electronDir, expectedVersion, packageDir = path.resolve(__dirname, '..')] = process.argv.slice(2);
if (!electronDir || !expectedVersion) {
  throw new Error('Usage: node scripts/check-electron.cjs <electron-install-dir> <electron-version> [package-dir]');
}

const electron = require(path.join(path.resolve(electronDir), 'node_modules', 'electron'));
const script = `
  if (process.versions.electron !== process.argv[2]) throw Error('unexpected Electron version: ' + process.versions.electron);
  const cv = require(process.argv[1]);
  if (!cv) throw Error('OpenCV addon failed to load');
  const mat = new cv.Mat(2, 3, cv.CV_8UC1, 7);
  if (mat.rows !== 2 || mat.cols !== 3 || mat.at(0, 0) !== 7) throw Error('unexpected Mat');
  console.log('Electron', process.versions.electron, 'ABI', process.versions.modules, 'OpenCV', cv.getVersionString());
`;
const result = spawnSync(electron, ['-e', script, path.resolve(packageDir), expectedVersion], {
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', NODE_OPTIONS: '', LD_LIBRARY_PATH: '' },
  stdio: 'inherit',
});
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`Electron smoke test failed: ${result.signal || result.status}`);
