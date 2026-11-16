import type * as openCV from '../..';
import type { Mat, Rect, TextLine, DrawDetectionParams } from '../..';

export default function (cv: typeof openCV): void {
  // The native Point and Vec factories dispatch to their dimensional types.
  const Point = cv.Point as unknown as typeof cv.Point2
  const Vec = cv.Vec as unknown as typeof cv.Vec3
  function reshapeRectAtBorders(rect: Rect, imgDim: Mat) {
    const x = Math.min(Math.max(0, rect.x), imgDim.cols)
    const y = Math.min(Math.max(0, rect.y), imgDim.rows)
    const width = Math.min(rect.width, imgDim.cols - x)
    const height = Math.min(rect.height, imgDim.rows - y)
    return new cv.Rect(x, y, width, height)
  }

  function getDefaultTextParams() {
    return { fontType: cv.FONT_HERSHEY_SIMPLEX, fontSize: 0.8, thickness: 2, lineType: cv.LINE_4 }
  }

  function insertText(boxImg: Mat, text: string, origin: { x: number, y: number }, opts: TextLine) {
    const { fontType, fontSize, color, thickness, lineType } = Object.assign(
      {}, getDefaultTextParams(), { color: new Vec(255, 255, 255) }, opts
    )
    boxImg.putText(text, new Point(origin.x, origin.y), fontType, fontSize, color, thickness, lineType, 0)
    return boxImg
  }

  function getTextSize(text: string, opts: TextLine) {
    const { fontType, fontSize, thickness } = Object.assign({}, getDefaultTextParams(), opts)
    const { size, baseLine } = cv.getTextSize(text, fontType, fontSize, thickness)
    return { width: size.width, height: size.height, baseLine }
  }

  function getMaxWidth(textLines: TextLine[]): number {
    return textLines.reduce((maxWidth, textLine) => {
      const width = getTextSize(textLine.text, textLine).width
      return maxWidth < width ? width : maxWidth
    }, 0)
  }

  function getLineHeight(textLine: TextLine): number {
    return getTextSize(textLine.text, textLine).height
  }

  function getTextHeight(textLines: TextLine[]): number {
    return textLines.reduce((height, textLine) => height + getLineHeight(textLine), 0)
  }

  cv.drawTextBox = function drawTextBox(img: Mat, upperLeft: { x: number, y: number }, textLines: TextLine[], alpha: number): Mat {
    const padding = 10
    const linePadding = 10
    const { x, y } = upperLeft
    const width = getMaxWidth(textLines) + (2 * padding)
    const height = getTextHeight(textLines) + (2 * padding) + ((textLines.length - 1) * linePadding)
    const rect = reshapeRectAtBorders(new cv.Rect(x, y, width, height), img)

    const boxImg = img.getRegion(rect).mul(alpha)
    let pt = new Point(padding, padding)
    textLines.forEach((textLine) => {
      const opts = Object.assign({}, getDefaultTextParams(), textLine)
      pt = pt.add(new Point(0, getLineHeight(textLine)))
      insertText(boxImg, textLine.text, pt, opts)
      pt = pt.add(new Point(0, linePadding))
    })
    boxImg.copyTo(img.getRegion(rect))
    return img
  }

  cv.drawDetection = function drawDetection(img: Mat, inputRect: Rect, opts: DrawDetectionParams = {}): Rect {
    const rect = inputRect.toSquare()
    const { x, y, width, height } = rect
    const segmentLength = width / (opts.segmentFraction || 6)
    const upperLeft = new Point(x, y)
    const bottomLeft = new Point(x, y + height)
    const upperRight = new Point(x + width, y)
    const bottomRight = new Point(x + width, y + height)
    const drawParams = Object.assign({}, { thickness: 2 }, opts)

    img.drawLine(upperLeft, upperLeft.add(new Point(0, segmentLength)), drawParams)
    img.drawLine(upperLeft, upperLeft.add(new Point(segmentLength, 0)), drawParams)
    img.drawLine(bottomLeft, bottomLeft.add(new Point(0, -segmentLength)), drawParams)
    img.drawLine(bottomLeft, bottomLeft.add(new Point(segmentLength, 0)), drawParams)
    img.drawLine(upperRight, upperRight.add(new Point(0, segmentLength)), drawParams)
    img.drawLine(upperRight, upperRight.add(new Point(-segmentLength, 0)), drawParams)
    img.drawLine(bottomRight, bottomRight.add(new Point(0, -segmentLength)), drawParams)
    img.drawLine(bottomRight, bottomRight.add(new Point(-segmentLength, 0)), drawParams)
    return rect
  }
}
