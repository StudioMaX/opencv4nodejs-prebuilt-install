# opencv4nodejs-prebuilt-install

![Tested](https://github.com/udarrr/opencv4nodejs-prebuilt-install/workflows/Tests/badge.svg)
![Released](https://github.com/udarrr/opencv4nodejs-prebuilt-install/workflows/Create%20tagged%20release/badge.svg)
![Supported node versions](https://img.shields.io/badge/node-18%2C%2020%2C%20%2022%2C%2023%2C%2024%2C%2025%2C%2026-green)
![Supported electron versions](https://img.shields.io/badge/electron-23%2C%2024%2C%2025-green)

### Simple installation Opencv versions for node with pre-compiled bindings

Cross-platform!

#### Supports

- Windows, Linux , MacOS
- node 18,20,22,23,24,25,26
- electron 23,24,25
- currently arh x64 (possible M1, arm64 and others if were available hosts with the type of processes)

## How to install

``` bash
npm i opencv4nodejs-prebuilt-install
```

check supporting platforms and processes!

- prebuilt in node_modules/opencv4nodejs-prebuilt-install/build

## Quick Start with prebuild

``` javascript
const cv = require('opencv4nodejs-prebuilt-install');
```

## With TypeScript

``` javascript
import * as cv from 'opencv4nodejs-prebuilt-install'
```

## Local compiling

Set your own properties inside of package.json for opencv4nodejs up to 4.6.0 depends on necessary versions and flags

```nodejs
  "opencv4nodejs": {
    "autoBuildWithoutContrib": 1,
    "autoBuildOpencvVersion": "4.6.0",
    "autoBuildFlags": "-DBUILD_opencv_world=1 -DBUILD_LIST=core,highgui,videoio -DOPENCV_FORCE_3RDPARTY_BUILD=ON -DBUILD_PNG=ON -DBUILD_TIFF=ON -DBUILD_JASPER=ON -DBUILD_JPEG=ON -DBUILD_ZLIB=ON -DBUILD_OPENEXR=ON -DWITH_FFMPEG=OFF -DWITH_GSTREAMER=ON -DWITH_VTK=OFF",
    "disableAutoBuild": 1
  },
```

- Then for building opencv for current processor

```nodejs
npm run create_opencvlib
```

Result in folder osOpencvWorlds/\*/\*.tar

- and then for building opencv for current node with have been prepared files for processor

```nodejs
npm run create_opencvnode_prebuild
```

Result in folder opencv/build/bin for windows or in opencv/build/lib for linux and darwin

## Verify a prebuild and create a test release

To check a prebuild for the current Node version and platform before uploading it:

```bash
npm run test:prebuild -- path/to/opencv4nodejs-prebuilt-install-v4.6.0-test.1-node-vABI-platform-arch.tar.gz
```

The check packs the npm package, installs it in a temporary project, serves the supplied prebuild over a local HTTP server, verifies the installed files match the archive, and loads the addon. It requires network access for npm dependencies; it does not publish anything.

For a GitHub test release, set the package version to a new version containing `-test.`, for example `4.6.0-test.1`, update `package-lock.json`, commit and push the changes, then push the matching tag `v4.6.0-test.1`. The `v4.6.*` tag push starts the release workflow; creating a GitHub Release alone does not start it. The workflow marks `-test.` releases as prereleases, builds OpenCV and the Node/Electron prebuilds, and skips npm publication. The OpenCV archive URL and prebuild URL both depend on the package version, so the tag and package version must match. You can also create the prerelease yourself for the same tag; the workflow updates its assets.

Other `v4.6.*` tags retain the existing behavior, including publishing to npm after the build jobs succeed. The separate `vcv4.6.*` workflow builds OpenCV archives only.

Each Node prebuild job also installs the test dependencies without lifecycle scripts and runs the Mocha suite and external memory tracking checks against the freshly built local addon before uploading it. `TEST_MODULE_LIST` requires `core`, `highgui`, `calib3d`, `features2d`, `imgproc`, `io` and `xfeatures2d` for the current OpenCV build configuration. The test output lists unavailable or disabled module suites; `objdetect` remains disabled, and some individual tests, including `VideoWriter`, are pending. On Linux, the MP4 `VideoCapture` suite is pending when OpenCV reports that neither FFmpeg nor GStreamer was built in. The Electron jobs currently build and upload their binaries without running this Node test suite.

## Add bindings to native methods of opencv

Create fork of the repo and add necessary changes then create poll request to the repo and i will recreate libs

For example i was able to add method invert recently

- added to core.cc

```typescript
Nan::SetMethod(target, "invert", Invert);
Nan::SetMethod(target, "invertAsync", InvertAsync);

NAN_METHOD(Core::Invert) {
 FF::syncBinding<CoreBindings::Invert>("Core", "Invert", info);
}

NAN_METHOD(Core::InvertAsync) {
 FF::asyncBinding<CoreBindings::Invert>("Core", "Invert", info);
}
```

- added to core.h

```typescript
 static NAN_METHOD(Invert);
 static NAN_METHOD(InvertAsync);
```

- added to coreBinding.h

```typescript
 class Invert : public CvClassMethodBinding<Mat> {
 public:
  void createBinding(std::shared_ptr<FF::Value<cv::Mat>> self) {
         auto flags = opt<FF::IntConverter>("flags", 0);
   auto dst = ret<Mat::Converter>("dst");

   executeBinding = [=]() {
    cv::invert(self->ref(), dst->ref(), flags->ref());
   };
  };
 };
```

- added to cv.d.ts

```typescript
export function invert(mat: Mat, flags?: number): Mat;
export function invertAsync(mat: Mat, flags?: number): Promise<Mat>;
```
