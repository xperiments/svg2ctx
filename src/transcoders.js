var Canvas = require("canvas");
var transcoders;
(function (transcoders) {
    var StringImage = (function () {
        function StringImage() { }
        StringImage.initialize = function initialize() {
            StringImage.canvas = new Canvas();
            StringImage.ctx = StringImage.canvas.getContext('2d');
            return true;
        };
        StringImage.initialized = StringImage.initialize();
        StringImage.dec2hex = function dec2hex(i) {
            var hex = i.toString(16);
            hex = "000000".substr(0, 6 - hex.length) + hex;
            return hex;
        };
        StringImage.hexToRgb = function hexToRgb(hex) {
            var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
            hex = hex.replace(shorthandRegex, function (m, r, g, b) {
                return r + r + g + g + b + b;
            });
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        };
        StringImage.rgbToHex = function rgbToHex(r, g, b) {
            return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1, 7);
        };
        StringImage.encode = function encode(str, width) {
            if(typeof width === "undefined") {
                width = 256;
            }
            var len = str.length;
            var square = Math.ceil(Math.sqrt(len / 3));
            var height = Math.ceil((len / 3) / width);
            var imageData = StringImage.ctx.createImageData(width, height);
            var lengthHeader = StringImage.hexToRgb(StringImage.dec2hex(len));
            var pixelCount = 0;
            StringImage.canvas.width = width;
            StringImage.canvas.height = height;
            StringImage.setPixel(imageData, pixelCount % width, Math.floor(pixelCount / width), lengthHeader.r, lengthHeader.g, lengthHeader.b);
            pixelCount++;
            for(var i = 0, total = str.length; i < total; i += 3) {
                StringImage.setPixel(imageData, pixelCount % width, Math.floor(pixelCount / width), str.charCodeAt(i), str.charCodeAt(i + 1), str.charCodeAt(i + 2));
                pixelCount++;
            }
            StringImage.ctx.putImageData(imageData, 0, 0);
            return StringImage.canvas;
        };
        StringImage.decode = function decode(imageData) {
            var hex = StringImage.rgbToHex(imageData.data[0], imageData.data[1], imageData.data[2]);
            var lengthHeader = parseInt(hex, 16);
            var str = "";
            for(var i = 0; i < lengthHeader; i += 3) {
                var s = (i / 3) * 4;
                str += String.fromCharCode(imageData.data[4 + s]);
                if(imageData.data[4 + s + 1]) {
                    str += String.fromCharCode(imageData.data[4 + s + 1]);
                    if(imageData.data[4 + s + 2]) {
                        str += String.fromCharCode(imageData.data[4 + s + 2]);
                    }
                }
            }
            return str;
        };
        StringImage.setPixel = function setPixel(imageData, x, y, r, g, b) {
            var index = ((x + y * imageData.width) * 4);
            imageData.data[index + 0] = r;
            imageData.data[index + 1] = g;
            imageData.data[index + 2] = b;
            imageData.data[index + 3] = 255;
        };
        return StringImage;
    })();
    transcoders.StringImage = StringImage;    
})(transcoders || (transcoders = {}));
//@ sourceMappingURL=StringImage.js.map

module.exports = transcoders;