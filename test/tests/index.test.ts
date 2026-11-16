/* eslint-disable no-console */
import chai, { expect } from 'chai';
import cv from '@u4/opencv4nodejs';
import chaiArrays from 'chai-arrays';
import coreTestSuite from './core';
import imgprocTestSuite from './imgproc';
import calib3dTestSuite from './calib3d';
import features2dTestSuite from './features2d';
import ioTestSuite from './io';
import dnnTestSuite from './dnn';
import machinelearningTestSuite from './machinelearning';
import faceTestSuite from './face';
import objdetectTestSuite from './objdetect';
import photoTestSuite from './photo';
import textTestSuite from './text';
import trackingTestSuite from './tracking';
import videoTestSuite from './video';
import xfeatures2dTestSuite from './xfeatures2d';
import ximgprocTestSuite from './ximgproc';
import imgHashTestSuite from './img_hash';
import { TestContext } from './model';

chai.use(chaiArrays);

const modules = [
  'core', 'imgproc', 'calib3d', 'features2d', 'io',
  'dnn', 'ml', 'objdetect', 'photo', 'video',
];

const xmodules = [
  'face', 'text', 'tracking', 'xfeatures2d', 'ximgproc', 'img_hash',
];

describe('cv', () => {
  const toTest: {[key: string]: boolean} = {
    core: true,
    imgproc: true,
    calib3d: true,
    features2d: true,
    io: true,
    dnn: true,
    machinelearning: true,
    objdetect: false, // to fix
    photo: true,
    video: true,
    face: true,
    text: true,
    tracking: true,
    xfeatures2d: true,
    ximgproc: true,
    img_hash: true,
  };
  // phash branch only
  // Object.keys(toTest).forEach((m) => { toTest[m] = false; });
  // toTest.img_hash = true;

  // The prebuilt OpenCV distribution uses BUILD_LIST and does not include every
  // upstream module. CI can assert its full expected set via TEST_MODULE_LIST.
  let builtModules = ['core', 'imgproc', 'io'];
  if (process.env.APPVEYOR_BUILD) {
    // OpenCV installed via choco does not include contrib modules
    builtModules = modules;
  }
  if (process.env.TEST_MODULE_LIST) {
    builtModules = process.env.TEST_MODULE_LIST.split(',');
  }

  const opencvVersionString = `${cv.version.major}.${cv.version.minor}.${cv.version.revision}`;

  // no more mandatory environement version variable
  // it('OpenCV version should match', () => {
  //   expect((process.env.OPENCV_VERSION || '').substr(0, 5)).to.equal(
  //     // on osx latest opencv package for major version is installed via brew
  //     process.platform === 'darwin' ? `${cv.version.major}` : opencvVersionString
  //   )
  // })

  const ctxt = new TestContext(cv);

  before(() => {
    // force images preload
    ctxt.getTestImg();
    ctxt.getPeoplesTestImg();
  });

  // dnn module for OpenCV 3.2 and lower not supported
  if (ctxt.cvVersionLowerThan(3, 3, 0)) {
    builtModules = builtModules.filter((m) => m !== 'dnn');
  }

  console.log('envs are:');
  console.log('OPENCV_VERSION:', process.env.OPENCV_VERSION);
  console.log('TEST_MODULE_LIST:', process.env.TEST_MODULE_LIST);
  console.log('APPVEYOR_BUILD:', process.env.APPVEYOR_BUILD);
  console.log('process.platform:', process.platform);
  console.log();
  console.log('OpenCV version is:', opencvVersionString);
  console.log('compiled with the following modules:', cv.xmodules);
  console.log(`${builtModules.length} expected modules to be built:`, builtModules);
  const liveModules = Object.entries(cv.modules).filter((a) => a[1]).map((a) => a[0]);
  console.log(`${liveModules.length} visible modules:`, liveModules);
  const skippedSuites = Object.entries(toTest)
    .filter(([name, enabled]) => !enabled || !cv.modules[name as keyof typeof cv.modules])
    .map(([name, enabled]) => `${name}: ${enabled ? 'module unavailable' : 'disabled'}`);
  console.log('Skipped module suites:', skippedSuites);

  it('all modules should be built', () => {
    // xfeatures2d is optional by default, but an explicit list must be enforced.
    builtModules.filter((m) => m !== 'xfeatures2d' || process.env.TEST_MODULE_LIST)
      .forEach((m) => expect(cv.modules).to.have.property(m, true));
  });
  if (toTest.core && cv.modules.core) {
    describe('core', () => coreTestSuite(ctxt));
  }
  if (toTest.imgproc && cv.modules.imgproc) {
    describe('imgproc', () => imgprocTestSuite(ctxt));
    describe('drawing helpers', () => {
      it('sizes a text box using each line’s font settings', () => {
        const img = new cv.Mat(500, 500, cv.CV_8UC1, 100);
        const lines = [
          { text: 'large text', fontType: cv.FONT_HERSHEY_COMPLEX, fontSize: 1.7, thickness: 3 },
          { text: 'small', fontType: cv.FONT_HERSHEY_PLAIN, fontSize: 0.6, thickness: 1 },
        ];
        const sizes = lines.map((line) => cv.getTextSize(line.text, line.fontType, line.fontSize, line.thickness).size);
        const width = Math.max(...sizes.map((size) => size.width)) + 20;
        const height = sizes.reduce((sum, size) => sum + size.height, 0) + 30;

        expect(cv.drawTextBox(img, { x: 5, y: 5 }, lines, 0.5)).to.equal(img);
        expect(img.at(5 + height - 1, 5 + width - 1)).to.equal(50);
        expect(img.at(5 + height - 1, 5 + width)).to.equal(100);
        expect(img.at(5 + height, 5 + width - 1)).to.equal(100);
      });

      it('draws the square detection and returns its rectangle', () => {
        const img = new cv.Mat(120, 120, cv.CV_8UC1, 0);
        const input = new cv.Rect(20, 20, 40, 60);
        const expected = input.toSquare();
        const rect = cv.drawDetection(img, input, { color: new cv.Vec3(255, 255, 255), segmentFraction: 4 });
        expect([rect.x, rect.y, rect.width, rect.height])
          .to.deep.equal([expected.x, expected.y, expected.width, expected.height]);
        expect(img.countNonZero()).to.be.greaterThan(0);
      });
    });
  }
  if (toTest.calib3d && cv.modules.calib3d) {
    describe('calib3d', () => calib3dTestSuite(ctxt));
  }
  if (toTest.features2d && cv.modules.features2d) {
    describe('features2d', () => features2dTestSuite(ctxt));
  }
  if (toTest.io && cv.modules.io) {
    describe('io', () => ioTestSuite(ctxt));
  }
  if (toTest.dnn && cv.modules.dnn) {
    describe('dnn', () => dnnTestSuite(ctxt));
  }
  if (toTest.machinelearning && cv.modules.machinelearning) {
    describe('machinelearning', () => machinelearningTestSuite(ctxt));
  }
  if (toTest.objdetect && cv.modules.objdetect) {
    describe('objdetect', () => objdetectTestSuite(ctxt));
  }
  if (toTest.photo && cv.modules.photo) {
    describe('photo', () => photoTestSuite(ctxt));
  }
  if (toTest.video && cv.modules.video) {
    describe('video', () => videoTestSuite(ctxt));
  }
  if (toTest.face && cv.modules.face) {
    describe('face', () => faceTestSuite(ctxt));
  }
  if (toTest.text && cv.modules.text) {
    describe('text', () => textTestSuite(ctxt));
  }
  if (toTest.tracking && cv.modules.tracking) {
    describe('tracking', () => trackingTestSuite(ctxt));
  }
  if (toTest.xfeatures2d && cv.modules.xfeatures2d) {
    describe('xfeatures2d', () => xfeatures2dTestSuite(ctxt));
  }
  if (toTest.ximgproc && cv.modules.ximgproc) {
    describe('ximgproc', () => ximgprocTestSuite(ctxt));
  }
  if (toTest.img_hash && cv.modules.img_hash) {
    describe('img_hash', () => imgHashTestSuite(ctxt));
  }
});
