///<reference path="../dec/node.d.ts"/>
var Canvas = require('canvas');
declare var InstallTrigger;

class NodeStringImage
{

	static canvas;
	static ctx;

	static initialize():bool
	{
		NodeStringImage.canvas = new Canvas();
		NodeStringImage.ctx = NodeStringImage.canvas.getContext('2d');
		return true;
	}
	static initialized:bool = NodeStringImage.initialize();

	static dec2hex = function dec2hex(i) {
		var hex = i.toString(16);
		hex = "000000".substr(0, 6 - hex.length) + hex;
		return hex;
	};
	static hexToRgb = function hexToRgb(hex) {

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
	static rgbToHex = function rgbToHex(r, g, b) {
		return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1, 7);
	};
	static encode = function encode(str, width?)
	{
		//str = ASCII7.encodeToString( str );

		if (typeof width === "undefined") { width = 256; }
		var len = str.length;
		var square = Math.ceil(Math.sqrt(len / 3));
		var height = Math.ceil((len / 3) / width);
		var imageData = NodeStringImage.ctx.createImageData(width, height);
		var lengthHeader = NodeStringImage.hexToRgb(NodeStringImage.dec2hex(len));
		var pixelCount = 0;
		NodeStringImage.canvas.width = width;
		NodeStringImage.canvas.height = height;
		NodeStringImage.setPixel(imageData, pixelCount % width, Math.floor(pixelCount / width), lengthHeader.r, lengthHeader.g, lengthHeader.b);
		pixelCount++;
		for(var i = 0, total = str.length; i < total; i += 3) {
			NodeStringImage.setPixel(imageData, pixelCount % width, Math.floor(pixelCount / width), str.charCodeAt(i), str.charCodeAt(i + 1), str.charCodeAt(i + 2));
			pixelCount++;
		}
		NodeStringImage.ctx.putImageData(imageData, 0, 0);
		//window.open(ATF.canvas.toDataURL());
		return NodeStringImage.canvas;
	};
	static decode = function decode(imageData) {
		var hex = NodeStringImage.rgbToHex(imageData.data[0], imageData.data[1], imageData.data[2]);
		var lengthHeader = parseInt(hex, 16);
		var str = "";
		//http://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
		var isFirefox = typeof InstallTrigger !== 'undefined';
		if(!isFirefox)
		{
			var fromCharCode = [];
			for( var i=0; i<256; i++ )
			{
				fromCharCode.push( String.fromCharCode( i ) );
			}
			for(var i = 0; i < lengthHeader; i += 3) {
				var s = (i / 3) * 4;
				str += fromCharCode[imageData.data[4 + s]];
				if(imageData.data[4 + s + 1]) {
					str += fromCharCode[imageData.data[4 + s + 1]];
					if(imageData.data[4 + s + 2]) {
						str += fromCharCode[ imageData.data[4 + s + 2]];
					}
				}
			}
		}
		else
		{
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
		}

		return str;
	};
	static setPixel = function setPixel(imageData, x, y, r, g, b) {
		var index = ((x + y * imageData.width) * 4);
		imageData.data[index + 0] = r;
		imageData.data[index + 1] = g;
		imageData.data[index + 2] = b;
		imageData.data[index + 3] = 255;
	};
}
(module).exports = NodeStringImage;
