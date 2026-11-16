const assert = require('assert');
const cv = require('@u4/opencv4nodejs');

async function main() {
  assert(cv.isCustomMatAllocatorEnabled(), 'external memory tracking must be enabled');
  for (let i = 0; i < 150; i += 1) {
    let image = new cv.Mat(256, 256, cv.CV_8UC3);
    let gray = await image.bgrToGrayAsync();
    assert.strictEqual(gray.rows, 256);
    image = null;
    gray = null;
    if (i % 5 === 0) global.gc();
  }
  let oldMat = new cv.Mat(256, 256, cv.CV_8UC1);
  assert(cv.dangerousDisableCustomMatAllocator());
  assert(cv.dangerousEnableCustomMatAllocator());
  let newMat = new cv.Mat(256, 256, cv.CV_8UC1);
  oldMat = null;
  newMat = null;
  global.gc();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
