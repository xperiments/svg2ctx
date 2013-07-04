var StringImage = (function () {
    function StringImage() {
    }
    StringImage.initialize = function () {
        StringImage.canvas = document.createElement('canvas');
        StringImage.ctx = StringImage.canvas.getContext('2d');
        return true;
    };

    StringImage.dec2hex = function (i) {
        var hex = i.toString(16);
        hex = "000000".substr(0, 6 - hex.length) + hex;
        return hex;
    };
    StringImage.hexToRgb = function (hex) {
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
    StringImage.rgbToHex = function (r, g, b) {
        return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1, 7);
    };
    StringImage.encode = function (str, width) {
        if (typeof width === "undefined") { width = 256; }
        var len = str.length;
        var square = Math.ceil(Math.sqrt(len / 3));
        var height = Math.ceil((len / 3) / width);
        var imageData = StringImage.ctx.createImageData(width, height);
        var lengthHeader = StringImage.hexToRgb(StringImage.dec2hex(len));
        var pixelCount = 0;

        StringImage.canvas.width = width;
        StringImage.canvas.height = height;

        StringImage.setPixel(imageData, pixelCount % width, Math.floor(pixelCount / width), lengthHeader);
        pixelCount++;

        var pixel = { r: 0, g: 0, b: 0 };
        for (var i = 0, total = str.length; i < total; i += 3) {
            pixel.r = str.charCodeAt(i);
            pixel.g = str.charCodeAt(i + 1);
            pixel.b = str.charCodeAt(i + 2);
            StringImage.setPixel(imageData, pixelCount % width, Math.floor(pixelCount / width), pixel);
            pixelCount++;
        }
        StringImage.ctx.putImageData(imageData, 0, 0);
        return StringImage.canvas;
    };
    StringImage.decodeFromImage = function (image) {
        StringImage.canvas.width = image.width;
        StringImage.canvas.height = image.height;
        StringImage.ctx.drawImage(image, 0, 0);
        return StringImage.decode(StringImage.ctx.getImageData(0, 0, image.width, image.height));
    };
    StringImage.decode = function (imageData) {
        var data = imageData.data;
        var hexLength = StringImage.rgbToHex(imageData.data[0], imageData.data[1], imageData.data[2]);
        var lengthHeader = parseInt(hexLength, 16);
        var str = "";

        var isFirefox = typeof InstallTrigger !== 'undefined';
        if (isFirefox) {
            var fromCharCode = [];
            for (var i = 0; i < 256; i++) {
                fromCharCode.push(String.fromCharCode(i));
            }

            var index = 0;
            for (var i = 0, totali = Math.floor(lengthHeader / 3) * 3; i < totali; i += 3) {
                str += fromCharCode[data[4 + index]];
                str += fromCharCode[data[4 + index + 1]];
                str += fromCharCode[data[4 + index + 2]];
                index += 4;
            }
            for (var e = 0, total = (lengthHeader % 3); e < total; e++) {
                str += fromCharCode[data[4 + index]];
                index++;
            }
        } else {
            var index = 0;
            for (var i = 0, totali = Math.floor(lengthHeader / 3) * 3; i < totali; i += 3) {
                str += String.fromCharCode(data[4 + index]);
                str += String.fromCharCode(data[4 + index + 1]);
                str += String.fromCharCode(data[4 + index + 2]);
                index += 4;
            }
            for (var e = 0, total = (lengthHeader % 3); e < total; e++) {
                str += String.fromCharCode(data[4 + index]);
                index++;
            }
        }

        return str;
    };
    StringImage.setPixel = function (imageData, x, y, pixel) {
        var index = ((x + y * imageData.width) * 4);
        imageData.data[index + 0] = pixel.r;
        imageData.data[index + 1] = pixel.g;
        imageData.data[index + 2] = pixel.b;
        imageData.data[index + 3] = 255;
    };
    StringImage.initialized = StringImage.initialize();
    return StringImage;
})();
