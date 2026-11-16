const assert = require('assert');
const cv = require('@u4/opencv4nodejs');

async function waitFor(predicate, description) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`${description}: ${JSON.stringify(cv.getMemMetrics())}`);
}

async function main() {
  assert(cv.isCustomMatAllocatorEnabled(), 'external memory tracking must be enabled');
  const before = cv.getMemMetrics();
  let mat = new cv.Mat(2048, 2048, cv.CV_8UC1);
  let blurred = await mat.blurAsync(new cv.Size(3, 3));
  assert.strictEqual(blurred.rows, mat.rows);
  assert(cv.getMemMetrics().TotalAlloc >= before.TotalAlloc + 2048 * 2048);
  await waitFor(() => {
    const metrics = cv.getMemMetrics();
    return metrics.TotalKnownByJS === metrics.TotalAlloc;
  }, 'allocated memory was not reported to V8');
  mat = null;
  blurred = null;
  await waitFor(() => {
    global.gc();
    const metrics = cv.getMemMetrics();
    return metrics.TotalAlloc === before.TotalAlloc && metrics.TotalKnownByJS === metrics.TotalAlloc;
  }, 'released memory was not reported to V8');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
