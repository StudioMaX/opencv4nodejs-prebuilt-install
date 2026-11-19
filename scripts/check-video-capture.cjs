const path = require('path');

const packageDir = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const iterations = Number(process.argv[3] || 20);
if (!Number.isInteger(iterations) || iterations < 1) throw new Error('iterations must be a positive integer');

const cv = require(packageDir);
if (!cv || !cv.modules.io) throw new Error('OpenCV video I/O is unavailable');
const video = path.resolve(__dirname, '..', 'data', 'traffic.mp4');
// CAP_PROP_BACKEND is OpenCV property 42; the binding does not export it.
const backendProperty = cv.CAP_PROP_BACKEND === undefined ? 42 : cv.CAP_PROP_BACKEND;
let failures = 0;

function describeFrame(frame) {
  return { rows: frame.rows, cols: frame.cols, type: frame.type, empty: frame.empty };
}

function checkFrame(frame) {
  return !frame.empty && frame.rows === 360 && frame.cols === 640 && frame.type === cv.CV_8UC3;
}

async function main() {
  console.log('Video diagnostic:', JSON.stringify({
    node: process.version, platform: process.platform, arch: process.arch,
    opencv: cv.getVersionString(), video, iterations,
    avfoundationBackend: cv.CAP_AVFOUNDATION,
  }));
  console.log(cv.getBuildInformation());

  for (let i = 1; i <= iterations; i++) {
    let cap;
    try {
      cap = new cv.VideoCapture(video);
      const backend = cap.get(backendProperty);
      const sync = cap.read();
      const asyncFrame = await cap.readAsync();
      const ok = checkFrame(sync) && checkFrame(asyncFrame);
      if (!ok) failures++;
      console.log(JSON.stringify({ iteration: i, backend, sync: describeFrame(sync), async: describeFrame(asyncFrame), ok }));
    } catch (error) {
      failures++;
      console.error(JSON.stringify({ iteration: i, error: String(error) }));
    } finally {
      if (cap) cap.release();
    }
  }
  console.log(`Video diagnostic: ${failures} failed of ${iterations} iterations`);
  if (failures) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
