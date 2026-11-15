const makeDrawUtils = require('./drawUtils')
const deprecations  = require('./deprecations')
const misc = require('./misc').default

module.exports = function(cv) {
  const {
    drawTextBox,
    drawDetection
  } = makeDrawUtils(cv)

  cv.drawTextBox = drawTextBox
  cv.drawDetection = drawDetection

  misc(cv)
  deprecations(cv)

  return cv
}
