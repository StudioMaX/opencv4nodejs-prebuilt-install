"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const drawUtils_1 = require("./drawUtils");
const deprecations_1 = require("./deprecations");
const misc_1 = require("./misc");
function default_1(cv) {
    (0, drawUtils_1.default)(cv);
    (0, misc_1.default)(cv);
    (0, deprecations_1.default)(cv);
    return cv;
}
