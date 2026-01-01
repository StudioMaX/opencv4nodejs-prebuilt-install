import * as fs from "fs";
import * as path from "path";

import { OpencvPatchRule } from './types';
import { isWin, spawn } from "./utils";
import { opencvVersion } from "./env";
import { dirs } from "./dirs";

const log = require("npmlog");

export const opencvPatches: OpencvPatchRule[] = [
  {
    introducedIn: '4.4.0',
    patches: [
      'pr17023-openexr.patch', // https://github.com/opencv/opencv/pull/17023
      'pr17157-protobuf.patch', // https://github.com/opencv/opencv/pull/17157
    ],
  },
  {
    introducedIn: '4.5.1',
    patches: [
      'pr18589-protobuf.patch', // https://github.com/opencv/opencv/pull/18589
      'pr18672-protobuf.patch', // https://github.com/opencv/opencv/pull/18672
    ],
  },
  {
    introducedIn: '4.5.4',
    patches: [
      'pr20386-protobuf.patch', // https://github.com/opencv/opencv/pull/20386
    ],
  },
  {
    introducedIn: '4.5.5',
    patches: [
      'https://github.com/opencv/opencv/commit/d934bb15b0c44b0ac50f2b2556393d9f4f28a620.patch', // https://github.com/opencv/opencv/pull/20998
    ],
  },
  {
    introducedIn: '4.10.0',
    patches: [
      'pr25123-zlib.patch', // https://github.com/opencv/opencv/pull/25123
      'pr25580-libpng.patch', // https://github.com/opencv/opencv/pull/25580
    ],
  },
]

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)

  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0
    const nb = pb[i] ?? 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  return 0
}

export async function applyOpencvPatches() {
  const currentVersion = opencvVersion();

  log.info("install", "checking OpenCV patches for version %s", currentVersion);

  for (const rule of opencvPatches) {
    // if the version is >= the one where the patch already exists, skip it
    if (compareVersions(currentVersion, rule.introducedIn) >= 0) {
      continue;
    }

    for (const patchRef of rule.patches) {
      const isRemote = patchRef.startsWith("https://");
      const patchFileName = path.basename(patchRef);
      const patchPath = path.join(dirs.opencvSrc, patchFileName);

      log.info(
        "install",
        "applying patch (%s): %s",
        isRemote ? "remote" : "local",
        patchRef
      );

      if (isRemote) {
        // download the patch
        if (isWin()) {
          await spawn(
            "powershell",
            [
              "-Command",
              `Invoke-WebRequest -Uri "${patchRef}" -OutFile "${patchFileName}"`,
            ],
            {cwd: dirs.opencvSrc}
          );
        } else {
          await spawn(
            "curl",
            ["-L", patchRef, "-o", patchFileName],
            {cwd: dirs.opencvSrc}
          );
        }
      } else {
        const localPatchPath = path.isAbsolute(patchRef)
          ? patchRef
          : path.join(dirs.patchesDir, patchRef);

        if (!fs.existsSync(localPatchPath)) {
          throw new Error(`Local patch not found: ${localPatchPath}`);
        }

        fs.copyFileSync(localPatchPath, patchPath);
      }

      // check that the patch is applicable
      await spawn("git", ["apply", "--check", patchFileName, "-v"], {
        cwd: dirs.opencvSrc,
      });

      // apply
      await spawn("git", ["apply", patchFileName, "-v"], {
        cwd: dirs.opencvSrc,
      });

      // delete the patch file
      fs.unlinkSync(patchPath);
    }
  }
}

