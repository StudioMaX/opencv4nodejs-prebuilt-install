import { expect } from 'chai';
import { spawnSync } from 'child_process';
import path from 'path';

describe('External Memory Tracking', () => {
  it('reconciles allocations after garbage collection without keeping Node alive', () => {
    const result = spawnSync(process.execPath, [
      '--expose-gc', path.resolve('externalMemTracking/other/gc-accounting.cjs'),
    ], { encoding: 'utf8', timeout: 30000 });
    expect(result.error, result.stderr).to.be.undefined;
    expect(result.status, result.stderr).to.equal(0);
  });

  it('survives incremental GC while allocating and releasing matrices', () => {
    const result = spawnSync(process.execPath, [
      '--expose-gc', '--stress-incremental-marking', path.resolve('externalMemTracking/other/gc-stress.cjs'),
    ], { encoding: 'utf8', timeout: 30000 });
    expect(result.error, result.stderr).to.be.undefined;
    expect(result.status, result.stderr).to.equal(0);
  });
});
