import makeDrawUtils from './drawUtils';
import deprecations from './deprecations';
import type * as OpenCV from '../..';
import misc from './misc';

export default function (cv: typeof OpenCV) {
  makeDrawUtils(cv);
  misc(cv);
  deprecations(cv);
  return cv;
}
