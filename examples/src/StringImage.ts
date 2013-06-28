declare var InstallTrigger;
interface IRGB
{
	r:number;
	g:number;
	b:number;
}
class StringImage
{
	static canvas:HTMLCanvasElement;
	static ctx:CanvasRenderingContext2D;

	static initialize():boolean
	{
		StringImage.canvas = <HTMLCanvasElement>document.createElement('canvas');
		StringImage.ctx = StringImage.canvas.getContext('2d');
		return true;
	}
	static initialized:boolean = StringImage.initialize();

	static dec2hex(i:number):string
	{
		var hex:string = i.toString(16);
			hex = "000000".substr(0, 6 - hex.length) + hex;
		return hex;
	}
	static hexToRgb(hex:string):IRGB
	{

		var shorthandRegex:RegExp = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
		hex = hex.replace
		(
			shorthandRegex, (m, r, g, b) =>
			{
				return r + r + g + g + b + b;
			}
		);
		var result:string[] = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? <IRGB>{
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : null;
	}
	static rgbToHex(r:number, g:number, b:number):string
	{
		return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1, 7);
	}
	static encode(str:string, width:number = 256 ):HTMLCanvasElement
	{
		var len:number = str.length;
		var square:number = Math.ceil(Math.sqrt(len / 3));
		var height:number = Math.ceil((len / 3) / width);
		var imageData:ImageData = StringImage.ctx.createImageData(width, height);
		var lengthHeader:IRGB = StringImage.hexToRgb(StringImage.dec2hex(len));
		var pixelCount:number = 0;

		StringImage.canvas.width = width;
		StringImage.canvas.height = height;

		// store str length in the first 3 bytes
		StringImage.setPixel
		(
			imageData
			, pixelCount % width
			, Math.floor(pixelCount / width)
			, lengthHeader
		);
		pixelCount++;

		var pixel:IRGB = { r:0, g:0, b:0 }
		for(var i = 0, total = str.length; i < total; i += 3)
		{
			pixel.r = str.charCodeAt(i);
			pixel.g = str.charCodeAt(i+1);
			pixel.b = str.charCodeAt(i+2);
			StringImage.setPixel
			(
				imageData
				, pixelCount % width
				, Math.floor(pixelCount / width)
				, pixel
			);
			pixelCount++;
		}
		StringImage.ctx.putImageData(imageData, 0, 0);
		return StringImage.canvas;
	}
	static decodeFromImage( image:HTMLImageElement ):string
	{
		StringImage.canvas.width = image.width;
		StringImage.canvas.height = image.height;
		StringImage.ctx.drawImage( image ,0,0 );
		return StringImage.decode( StringImage.ctx.getImageData(0,0,image.width,image.height) );
	}
	static decode(imageData:ImageData):string
	{
		var data:number[] = <number[]>imageData.data;
		var hexLength:string = StringImage.rgbToHex(imageData.data[0], imageData.data[1], imageData.data[2]);
		var lengthHeader:number = parseInt(hexLength, 16);
		var str:string = "";

		//http://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
		var isFirefox:boolean = typeof InstallTrigger !== 'undefined';
		if(!isFirefox)
		{
			var fromCharCode:string[] = [];
			for( var i:number=0; i<256; i++ )
			{
				fromCharCode.push( String.fromCharCode( i ) );
			}
			/*
			for(var i:number = 0; i < lengthHeader; i += 3)
			{
				var index:number = (i / 3) * 4;
				str += fromCharCode[imageData.data[4 + index]];
				if(imageData.data[4 + index + 1])
				{
					str += fromCharCode[imageData.data[4 + index + 1]];
					if(imageData.data[4 + index + 2])
					{
						str += fromCharCode[ imageData.data[4 + index + 2]];
					}
				}
			}*/
			var index:number = 0;
			for( var i=0,totali=Math.floor( lengthHeader/3 )*3; i<totali; i+=3)
			{

				str += fromCharCode[data[4 + index]];
				str += fromCharCode[data[4 + index+1]];
				str += fromCharCode[data[4 + index+2]];
				index+=4;

			}
			for( var e=0, total=(lengthHeader%3); e<total; e++ )
			{
				str += fromCharCode[data[4 + index]];
				index++;
			}
		}
		else
		{
			/*
			for(var i = 0; i < lengthHeader; i += 3) {
				var s = (i / 3) * 4;
				str += String.fromCharCode(imageData.data[4 + s]);
				if(imageData.data[4 + s + 1]) {
					str += String.fromCharCode(imageData.data[4 + s + 1]);
					if(imageData.data[4 + s + 2]) {
						str += String.fromCharCode(imageData.data[4 + s + 2]);
					}
				}
			}*/
			var index:number = 0;
			for( var i:number=0,totali:number=Math.floor( lengthHeader/3 )*3; i<totali; i+=3)
			{

				str += String.fromCharCode(data[4 + index]);
				str += String.fromCharCode(data[4 + index+1]);
				str += String.fromCharCode(data[4 + index+2]);
				index+=4;

			}
			for( var e=0, total=(lengthHeader%3); e<total; e++ )
			{
				str += String.fromCharCode(data[4 + index]);
				index++;
			}
		}

		return str;
	}
	static setPixel(imageData:ImageData, x:number, y:number, pixel:IRGB )
	{
		var index = ((x + y * imageData.width) * 4);
		imageData.data[index + 0] = pixel.r;
		imageData.data[index + 1] = pixel.g;
		imageData.data[index + 2] = pixel.b;
		imageData.data[index + 3] = 255;
	}
}

