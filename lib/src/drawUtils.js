"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
function default_1(cv) {
    // The native Point and Vec factories dispatch to their dimensional types.
    const Point = cv.Point;
    const Vec = cv.Vec;
    function reshapeRectAtBorders(rect, imgDim) {
        const x = Math.min(Math.max(0, rect.x), imgDim.cols);
        const y = Math.min(Math.max(0, rect.y), imgDim.rows);
        const width = Math.min(rect.width, imgDim.cols - x);
        const height = Math.min(rect.height, imgDim.rows - y);
        return new cv.Rect(x, y, width, height);
    }
    function getDefaultTextParams() {
        return { fontType: cv.FONT_HERSHEY_SIMPLEX, fontSize: 0.8, thickness: 2, lineType: cv.LINE_4 };
    }
    function insertText(boxImg, text, origin, opts) {
        const { fontType, fontSize, color, thickness, lineType } = Object.assign({}, getDefaultTextParams(), { color: new Vec(255, 255, 255) }, opts);
        boxImg.putText(text, new Point(origin.x, origin.y), fontType, fontSize, color, thickness, lineType, 0);
        return boxImg;
    }
    function getTextSize(text, opts) {
        const { fontType, fontSize, thickness } = Object.assign({}, getDefaultTextParams(), opts);
        const { size, baseLine } = cv.getTextSize(text, fontType, fontSize, thickness);
        return { width: size.width, height: size.height, baseLine };
    }
    function getMaxWidth(textLines) {
        return textLines.reduce((maxWidth, textLine) => {
            const width = getTextSize(textLine.text, textLine).width;
            return maxWidth < width ? width : maxWidth;
        }, 0);
    }
    function getLineHeight(textLine) {
        return getTextSize(textLine.text, textLine).height;
    }
    function getTextHeight(textLines) {
        return textLines.reduce((height, textLine) => height + getLineHeight(textLine), 0);
    }
    cv.drawTextBox = function drawTextBox(img, upperLeft, textLines, alpha) {
        const padding = 10;
        const linePadding = 10;
        const { x, y } = upperLeft;
        const width = getMaxWidth(textLines) + (2 * padding);
        const height = getTextHeight(textLines) + (2 * padding) + ((textLines.length - 1) * linePadding);
        const rect = reshapeRectAtBorders(new cv.Rect(x, y, width, height), img);
        const boxImg = img.getRegion(rect).mul(alpha);
        let pt = new Point(padding, padding);
        textLines.forEach((textLine) => {
            const opts = Object.assign({}, getDefaultTextParams(), textLine);
            pt = pt.add(new Point(0, getLineHeight(textLine)));
            insertText(boxImg, textLine.text, pt, opts);
            pt = pt.add(new Point(0, linePadding));
        });
        boxImg.copyTo(img.getRegion(rect));
        return img;
    };
    cv.drawDetection = function drawDetection(img, inputRect, opts = {}) {
        const rect = inputRect.toSquare();
        const { x, y, width, height } = rect;
        const segmentLength = width / (opts.segmentFraction || 6);
        const upperLeft = new Point(x, y);
        const bottomLeft = new Point(x, y + height);
        const upperRight = new Point(x + width, y);
        const bottomRight = new Point(x + width, y + height);
        const drawParams = Object.assign({}, { thickness: 2 }, opts);
        img.drawLine(upperLeft, upperLeft.add(new Point(0, segmentLength)), drawParams);
        img.drawLine(upperLeft, upperLeft.add(new Point(segmentLength, 0)), drawParams);
        img.drawLine(bottomLeft, bottomLeft.add(new Point(0, -segmentLength)), drawParams);
        img.drawLine(bottomLeft, bottomLeft.add(new Point(segmentLength, 0)), drawParams);
        img.drawLine(upperRight, upperRight.add(new Point(0, segmentLength)), drawParams);
        img.drawLine(upperRight, upperRight.add(new Point(-segmentLength, 0)), drawParams);
        img.drawLine(bottomRight, bottomRight.add(new Point(0, -segmentLength)), drawParams);
        img.drawLine(bottomRight, bottomRight.add(new Point(-segmentLength, 0)), drawParams);
        return rect;
    };
}
