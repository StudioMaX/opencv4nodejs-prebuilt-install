import { TestContext } from '../model';
import ioTests from './ioTests';
import VideoCaptureTests from './VideoCaptureTests';
import VideoWriterTests from './VideoWriterTests';

export default (args: TestContext) => {
  describe('io', () => ioTests(args));
  if (!process.env.DOCKER_BUILD && !process.env.BINDINGS_DEBUG) {
    const buildInfo = args.cv.getBuildInformation();
    const linuxVideoBackendUnavailable = process.platform === 'linux'
      && !/^\s*(FFMPEG|GStreamer):\s+YES\b/im.test(buildInfo);
    if (linuxVideoBackendUnavailable) {
      console.log('Skipping VideoCapture: OpenCV was built without FFmpeg and GStreamer on Linux');
    }
    (linuxVideoBackendUnavailable ? describe.skip : describe)('VideoCapture', () => VideoCaptureTests(args));
    // TODO: fix unlink EBUSY
    describe.skip('VideoWriter', () => VideoWriterTests(args));
  }
};
