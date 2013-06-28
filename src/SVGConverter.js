var fs = require('fs');
var path = require('path');
var argv = require('optimist').argv;
var jsmin = require('node-jsmin').jsmin;
var Canvas = require('canvas');
var UglifyJS = require('uglify-js');
var handlebars = require('handlebars');
var beautifyJs = require('node-beautify').beautifyJs;

var jsCanvas = require('./tsCanvas');
var NodeStringImage = require('./NodeStringImage');
var nodePackage = require('./../package.json');

var SVGConverterProcessMode;
(function (SVGConverterProcessMode) {
    SVGConverterProcessMode[SVGConverterProcessMode["CMD"] = 0] = "CMD";
    SVGConverterProcessMode[SVGConverterProcessMode["CODE"] = 1] = "CODE";

    SVGConverterProcessMode[SVGConverterProcessMode["CANVAS"] = 2] = "CANVAS";
})(SVGConverterProcessMode || (SVGConverterProcessMode = {}));

var SVGConverterFileTypes = (function () {
    function SVGConverterFileTypes() {
    }
    SVGConverterFileTypes.SVG = '.svg';
    SVGConverterFileTypes.JS = '.js';
    SVGConverterFileTypes.PNG = '.png';
    return SVGConverterFileTypes;
})();

var SVGConverter = (function () {
    function SVGConverter() {
    }
    SVGConverter.cmd = function () {
        var argv = require('optimist').usage('svg2ctx v' + nodePackage.version + '\nUsage: $0 -s sourceFile -d destinationFile').options('s', {
            alias: 'source',
            describe: 'Input SVG File',
            required: true
        }).options('d', {
            alias: 'destination',
            describe: 'Output destination.',
            required: true
        }).options('c', {
            alias: 'className',
            describe: 'Specifiy the full package className, ex: ex.xperiments.GraphicTest [Default: pulsar.display.(destination file name )]',
            default: '$filename$',
            required: false
        }).options('p', {
            alias: 'plain',
            describe: 'Export plain beautified code',
            default: false,
            required: false
        }).options('t', {
            alias: 'template',
            describe: 'Use Custom Javascript output template http://www.yahoo.com',
            default: 'ctxClassTemplate.tpl',
            required: false
        }).boolean(['p', 'i', 'v']).demand(['s', 'd']).argv;

        SVGConverter.package = "pulsar.display";
        SVGConverter.resultCallBack = null;
        SVGConverter.sourceFile = argv.source;
        SVGConverter.sourceFileExtension = path.extname(SVGConverter.sourceFile).toLowerCase();
        SVGConverter.destinationFile = argv.destination;
        SVGConverter.destinationFileExtension = path.extname(SVGConverter.destinationFile).toLowerCase();
        SVGConverter.className = SVGConverter.destinationFile.split(SVGConverter.destinationFileExtension)[0];
        SVGConverter.plainOutput = argv.plain;
        if (argv.c != '$filename$') {
            console.log('Class Package to export : ' + argv.c);
            var parts = argv.c.split('.');
            var className = parts.pop();
            SVGConverter.className = className;
            SVGConverter.package = parts.join('.');
        }

        SVGConverter.checkSource() && SVGConverter.svg2js(SVGConverterProcessMode.CMD);
    };

    SVGConverter.convertToCode = function (source, callback) {
        SVGConverter.resultCallBack = null;
        if (typeof callback != undefined) {
            SVGConverter.resultCallBack = callback;
        }
        SVGConverter.sourceFile = source;
        SVGConverter.sourceFileExtension = path.extname(SVGConverter.sourceFile).toLowerCase();
        SVGConverter.destinationFile = null;
        SVGConverter.destinationFileExtension = null;

        SVGConverter.checkSource() && SVGConverter.svg2js(SVGConverterProcessMode.CODE);
    };

    SVGConverter.convertToCanvas = function (source, callback) {
        SVGConverter.resultCallBack = null;
        if (typeof callback != undefined) {
            SVGConverter.resultCallBack = callback;
        }
        SVGConverter.sourceFile = source;
        SVGConverter.sourceFileExtension = path.extname(SVGConverter.sourceFile).toLowerCase();
        SVGConverter.destinationFile = null;
        SVGConverter.destinationFileExtension = null;

        SVGConverter.checkSource() && SVGConverter.svg2js(SVGConverterProcessMode.CANVAS);
    };

    SVGConverter.readCtxClassTemplate = function () {
        var template = "";
        try  {
            template = fs.readFileSync(path.resolve(__dirname, 'ctxClassTemplate.tpl'), 'utf8');
        } catch (e) {
            SVGConverter.showError((e).message);
        }
        return handlebars.compile(template, { noEscape: true });
    };

    SVGConverter.checkSource = function () {
        if (!fs.existsSync(SVGConverter.sourceFile)) {
            SVGConverter.showError('Source file ' + SVGConverter.sourceFile + ' does not exist');
        }

        if (SVGConverter.sourceFileExtension != SVGConverterFileTypes.SVG) {
            SVGConverter.showError('Source file ' + SVGConverter.sourceFile + ' is not a SVG file');
        }

        if (SVGConverter.destinationFileExtension != SVGConverterFileTypes.JS && SVGConverter.destinationFileExtension != SVGConverterFileTypes.PNG) {
            SVGConverter.showError('Destination file must be .js or .png');
        }
        return true;
    };

    SVGConverter.svg2js = function (mode) {
        var data;
        SVGConverter.xcanvas = new jsCanvas(path.basename(SVGConverter.destinationFile, SVGConverter.destinationFileExtension));
        try  {
            data = fs.readFileSync(SVGConverter.sourceFile, 'utf8');

            var onConvertedCallback;
            switch (mode) {
                case SVGConverterProcessMode.CMD:
                    onConvertedCallback = SVGConverter.onConvertedDataFromCMD;
                    break;
                case SVGConverterProcessMode.CODE:
                    onConvertedCallback = SVGConverter.onConvertedDataToCode;
                    break;
                case SVGConverterProcessMode.CANVAS:
                    onConvertedCallback = SVGConverter.onConvertedDataToCanvas;
                    break;
            }

            SVGConverter.xcanvas.compile(data, onConvertedCallback, { package: SVGConverter.package, className: SVGConverter.className });
        } catch (e) {
            SVGConverter.showError((e).message);
        }
    };

    SVGConverter.onConvertedDataFromCMD = function () {
        console.log('Converting ' + SVGConverter.sourceFile + ' to ' + SVGConverter.destinationFile);

        var code = beautifyJs(SVGConverter.ctxClassTemplate(SVGConverter.xcanvas.toTemplateData()));
        var compressed = UglifyJS.minify(jsmin(code), SVGConverter.uglifyOptions);

        if (SVGConverter.destinationFileExtension == SVGConverterFileTypes.JS) {
            code = SVGConverter.plainOutput ? code : compressed.code;
            fs.writeFileSync(SVGConverter.destinationFile, code);
        } else {
            var len = compressed.code.length / 3;
            var sqr2 = SVGConverter.getNextPowerOfTwo(Math.sqrt(len));
            var canvas = NodeStringImage.encode(compressed.code, sqr2);
            var imageData = canvas.toDataURL().replace(/^data:image\/png;base64,/, "");
            fs.writeFileSync(SVGConverter.destinationFile, imageData, 'base64');
        }
        console.log('Conversion Done!');
    };

    SVGConverter.onConvertedDataToCode = function () {
        SVGConverter.resultCallBack && SVGConverter.resultCallBack(UglifyJS.minify(SVGConverter.xcanvas.toString(), SVGConverter.uglifyOptions).code);
    };

    SVGConverter.onConvertedDataToCanvas = function () {
        var compressed = UglifyJS.minify(SVGConverter.xcanvas.toString(), SVGConverter.uglifyOptions);
        var len = compressed.code.length / 3;
        var sqr2 = SVGConverter.getNextPowerOfTwo(Math.sqrt(len));
        var canvas = NodeStringImage.encode(compressed.code, sqr2);
        SVGConverter.resultCallBack && SVGConverter.resultCallBack(canvas);
    };

    SVGConverter.getNextPowerOfTwo = function (num) {
        if (num > 0 && (num & (num - 1)) == 0) {
            return num;
        } else {
            var result = 1;
            while (result < num) {
                result <<= 1;
            }
            return result;
        }
    };

    SVGConverter.showError = function (error) {
        console.log(error);
        process.exit();
    };
    SVGConverter.plainOutput = true;

    SVGConverter.inlineImages = false;

    SVGConverter.uglifyOptions = { fromString: true, compress: { sequences: false } };

    SVGConverter.ctxClassTemplate = SVGConverter.readCtxClassTemplate();
    return SVGConverter;
})();
(module).exports = SVGConverter;
