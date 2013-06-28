var fabric = require('fabric').fabric;
var sprintf = require('sprintf-js').sprintf;
var Canvas = require("canvas");

var jsCanvas = (function () {
    function jsCanvas(objectname, width, height) {
        var _this = this;
        this.canvas = fabric.createCanvasForNode(width, height);
        this.jsctx = new jsContext2d(this.canvas, objectname);
        this.canvas.real2dContext = this.canvas.getContext('2d');
        this.canvas.getContext = function (contextId) {
            if (contextId == '2d') {
                return _this.jsctx;
            } else {
                return null;
            }
        };
    }
    jsCanvas.prototype.compile = function (svg, oncomplete, moduleInfo) {
        this.className = moduleInfo.className;
        this.package = moduleInfo.package.split('.');
        var canvas = new fabric.Canvas(this.canvas);

        fabric.loadSVGFromString(svg, function (ob, op) {
            var obj = fabric.util.groupSVGElements(ob, op).set({ left: op.width / 2, top: op.height / 2 }).scale(1);
            canvas.add(obj);
            oncomplete && oncomplete();
        });
    };

    jsCanvas.prototype.toTemplateData = function () {
        return {
            render: this.jsctx.getRenderCode(),
            images: this.jsctx.getImageCode(),
            totalImages: this.jsctx.getTotalImages(),
            gradients: this.jsctx.getGradientCode(),
            className: this.className,
            package: this.package,
            width: this.jsctx.canvas.width,
            height: this.jsctx.canvas.height
        };
    };
    return jsCanvas;
})();

var jsContext2d = (function () {
    function jsContext2d(canvas, objectname) {
        this.canvas = canvas;
        this.fieldStack = [];
        this.fieldsInvalid = false;
        this.finished = false;
        this.fn = '';
        this.output = '';
        this.outputimages = '';
        this.outputGradients = '';
        this.ngradients = 0;
        this.nimages = 0;
        this.lastFields = {
            fillStyle: null,
            strokeStyle: null,
            font: '10px sans-serif',
            lineWidth: null,
            lineCap: null,
            lineJoin: null,
            miterLimit: null,
            globalAlpha: null,
            textBaseline: null,
            textAlign: null,
            shadowBlur: null,
            shadowColor: null,
            shadowOffsetX: null,
            shadowOffsetY: null
        };

        for (var i in this.lastFields) {
            this[i] = this.lastFields[i];
        }
    }
    jsContext2d.prototype.getTotalImages = function () {
        return this.nimages;
    };
    jsContext2d.prototype.getRenderCode = function () {
        return this.output;
    };
    jsContext2d.prototype.getImageCode = function () {
        return this.outputimages;
    };
    jsContext2d.prototype.getGradientCode = function () {
        return this.outputGradients;
    };

    jsContext2d.prototype.checkFields = function () {
        for (var i in this.lastFields) {
            var last = this.lastFields[i];
            if (this.fieldsInvalid || last != this[i] || typeof (last) != typeof (this[i])) {
                if (this[i] === null || this[i] === undefined) {
                    continue;
                }
                switch (typeof this[i]) {
                    case 'boolean':
                    case 'number':
                        this.output += '\tthis.setter (ctx, "' + this.slashify(i) + '", ' + this[i] + ');\n';
                        break;
                    case 'string':
                        this.output += '\tthis.setter (ctx, "' + this.slashify(i) + '", "' + this.slashify(this[i]) + '");\n';
                        break;
                    default:
                        if (this[i].jscGradient) {
                            this.output += '\tthis.setter (ctx, "' + this.slashify(i) + '", this.gradients [' + (this[i].jscGradient - 1) + ']);\n';
                        } else {
                            console.log(i + ": don't know how to handle field " + (typeof (this[i])) + " " + this[i]);
                        }
                        break;
                }
                this.lastFields[i] = this[i];

                this.canvas.real2dContext[i] = this[i];
            }
        }
        this.fieldsInvalid = false;
    };

    jsContext2d.prototype.pushFields = function () {
        var push = {};
        for (var i in this.lastFields) {
            push[i] = this.lastFields[i];
        }
        this.fieldStack.push(push);
    };

    jsContext2d.prototype.popFields = function () {
        var pop = this.fieldStack.pop();
        for (var i in this.lastFields) {
            this.lastFields[i] = pop[i];
        }
    };

    jsContext2d.prototype.getBase64Image = function (img) {
        var canvas = new Canvas(img.width, img.height);
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        var dataURL = canvas.toDataURL("image/png");
        return dataURL;
    };

    jsContext2d.prototype.emitGradient = function (fn, args, fnprefix) {
        this.checkFields();
        var argstr = '';
        var beforestr = '';
        var nobj = 0;
        for (var i in args) {
            var arg = args[i];
            switch (typeof arg) {
                case 'boolean':
                    argstr += arg == true ? "true" : "false" + ',';
                    break;
                case 'number':
                    argstr += arg.toFixed(2) + ',';
                    break;
                case 'string':
                    argstr += '"' + this.slashify(arg) + '"' + ',';
                    break;
                default:
                    if (arg.tagName == 'IMG') {
                        var data = this.getBase64Image(arg);
                        this.outputimages += 'window.' + this.fn + '.imgs[' + this.nimages + '] = new Image ();\nwindow.' + this.fn + '.imgs[' + this.nimages + '].src="' + this.slashify(data) + '"' + ';\n';
                        argstr += 'window.' + this.fn + '.imgs[' + this.nimages + '],';
                        this.nimages++;
                    } else if (arg.tagName == 'CANVAS') {
                        var data = arg.toDataURL("image/png");
                        this.outputimages += 'window.' + this.fn + '.imgs[' + this.nimages + '] = new Image ();\nwindow.' + this.fn + '.imgs[' + this.nimages + '].src="' + this.slashify(data) + '"' + ';\n';
                        argstr += 'window.' + this.fn + '.imgs[' + this.nimages + '],';
                        this.nimages++;
                    } else {
                        console.log(fn + ": don't know how to handle " + (typeof (arg)) + " " + arg.tagName);
                        return this.canvas.real2dContext[fn].apply(this.canvas.real2dContext, args);
                    }
            }
        }
        if (beforestr.length) {
            this.outputGradients += beforestr;
        }
        if (fnprefix) {
            this.outputGradients += fnprefix;
        }
        this.outputGradients += 'ctx.' + fn + '(';
        if (argstr.length) {
            this.outputGradients += argstr.substr(0, argstr.length - 1);
        }
        this.outputGradients += ');\n';

        return this.canvas.real2dContext[fn].apply(this.canvas.real2dContext, args);
    };

    jsContext2d.prototype.emitFunc = function (fn, args, fnprefix) {
        this.checkFields();
        var argstr = '';
        var beforestr = '';
        var nobj = 0;
        for (var i in args) {
            var arg = args[i];
            switch (typeof arg) {
                case 'boolean':
                    argstr += arg == true ? "true" : "false" + ',';
                    break;
                case 'number':
                    argstr += arg.toFixed(2) + ',';
                    break;
                case 'string':
                    argstr += '"' + this.slashify(arg) + '"' + ',';
                    break;
                case 'object':
                    if (arg.toString() == '[object Image]') {
                        var data = this.getBase64Image(arg);
                        this.outputimages += '\t\t\tthis.images[' + this.nimages + '] = new Image ();\n';
                        this.outputimages += '\t\t\tthis.images[' + this.nimages + '].onload = this.onImageLoaded.bind(this);\n';
                        this.outputimages += '\t\t\tthis.images[' + this.nimages + '].src="' + data + '"' + ';\n';
                        argstr += 'this.images[' + this.nimages + '],';
                        this.nimages++;
                    }
                    break;
            }
        }
        if (beforestr.length) {
            this.output += beforestr;
        }
        if (fnprefix) {
            this.output += fnprefix;
        }
        this.output += '\t\t\t\tctx.' + fn + '(';
        if (argstr.length) {
            this.output += argstr.substr(0, argstr.length - 1);
        }
        this.output += ');\n';

        return this.canvas.real2dContext[fn].apply(this.canvas.real2dContext, args);
    };

    jsContext2d.prototype.isPointInPath = function () {
        return this.canvas.real2dContext['isPointInPath'].apply(this.canvas.real2dContext, arguments);
    };

    jsContext2d.prototype.setTransform = function () {
        return this.emitFunc('setTransform', arguments);
    };
    jsContext2d.prototype.rect = function () {
        return this.emitFunc('rect', arguments);
    };

    jsContext2d.prototype.createImageData = function () {
        return this.emitFunc('createImageData', arguments);
    };
    jsContext2d.prototype.strokeRect = function () {
        return this.emitFunc('strokeRect', arguments);
    };

    jsContext2d.prototype.arcTo = function () {
        return this.emitFunc('arcTo', arguments);
    };

    jsContext2d.prototype.fill = function () {
        return this.emitFunc('fill', arguments);
    };
    jsContext2d.prototype.stroke = function () {
        return this.emitFunc('stroke', arguments);
    };
    jsContext2d.prototype.translate = function () {
        return this.emitFunc('translate', arguments);
    };
    jsContext2d.prototype.transform = function () {
        return this.emitFunc('transform', arguments);
    };
    jsContext2d.prototype.rotate = function () {
        return this.emitFunc('rotate', arguments);
    };
    jsContext2d.prototype.scale = function () {
        return this.emitFunc('scale', arguments);
    };
    jsContext2d.prototype.save = function () {
        this.emitFunc('save', arguments);
        this.pushFields();
    };
    jsContext2d.prototype.restore = function () {
        this.emitFunc('restore', arguments);
        this.popFields();
    };
    jsContext2d.prototype.beginPath = function () {
        return this.emitFunc('beginPath', arguments);
    };
    jsContext2d.prototype.closePath = function () {
        return this.emitFunc('closePath', arguments);
    };
    jsContext2d.prototype.moveTo = function () {
        return this.emitFunc('moveTo', arguments);
    };
    jsContext2d.prototype.lineTo = function () {
        return this.emitFunc('lineTo', arguments);
    };
    jsContext2d.prototype.clip = function () {
        return this.emitFunc('clip', arguments);
    };
    jsContext2d.prototype.quadraticCurveTo = function () {
        return this.emitFunc('quadraticCurveTo', arguments);
    };
    jsContext2d.prototype.bezierCurveTo = function () {
        return this.emitFunc('bezierCurveTo', arguments);
    };
    jsContext2d.prototype.arc = function () {
        return this.emitFunc('arc', arguments);
    };
    jsContext2d.prototype.createPattern = function () {
        var g = this.emitFunc('createPattern', arguments, 'this.gradients [' + this.ngradients + '] = ');
        g.jscGradient = ++this.ngradients;
        return g;
    };
    jsContext2d.prototype.createLinearGradient = function () {
        var _this = this;
        this.outputGradients += '\tthis.gradients [' + this.ngradients + '] = ';
        var n = this.ngradients;
        var g = this.emitGradient('createLinearGradient', arguments);
        var oldadd = g.addColorStop;

        g.addColorStop = function (stop, color) {
            _this.outputGradients += sprintf('\tthis.gradients [%d].addColorStop (%f, "%s");\n', n, stop, color);

            oldadd.apply(g, arguments);
        };
        g.jscGradient = ++this.ngradients;
        return g;
    };
    jsContext2d.prototype.createRadialGradient = function () {
        var _this = this;
        this.outputGradients += '\tthis.gradients [' + this.ngradients + '] = ';
        var n = this.ngradients;
        var g = this.emitGradient('createRadialGradient', arguments);
        var oldadd = g.addColorStop;

        g.addColorStop = function (stop, color) {
            _this.outputGradients += sprintf('\tthis.gradients [%d].addColorStop (%f, "%s");\n', n, stop, color);
            oldadd.apply(g, arguments);
        };
        g.jscGradient = ++this.ngradients;
        return g;
    };

    jsContext2d.prototype.fillText = function () {
        return this.emitFunc('fillText', arguments);
    };
    jsContext2d.prototype.strokeText = function () {
        return this.emitFunc('strokeText', arguments);
    };
    jsContext2d.prototype.measureText = function () {
        return this.emitFunc('measureText', arguments);
    };
    jsContext2d.prototype.drawImage = function () {
        return this.emitFunc('drawImage', arguments);
    };
    jsContext2d.prototype.fillRect = function () {
        return this.emitFunc('fillRect', arguments);
    };
    jsContext2d.prototype.clearRect = function () {
        return this.emitFunc('clearRect', arguments);
    };
    jsContext2d.prototype.getImageData = function () {
        return this.emitFunc('getImageData', arguments);
    };
    jsContext2d.prototype.putImageData = function () {
        return this.emitFunc('putImageData', arguments);
    };
    jsContext2d.prototype.isPointPath = function () {
        return this.emitFunc('isPointPath', arguments);
    };

    jsContext2d.prototype.slashify = function (s) {
        if (!s) {
            return '';
        }
        s = s.replace(/\\'/g, "\\\\'");
        return s.replace(/'/g, "\\'");
    };
    return jsContext2d;
})();
exports.jsContext2d = jsContext2d;

(module).exports = jsCanvas;

