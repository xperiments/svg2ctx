///<reference path="../dec/node.d.ts"/>

var fs = 			require( 'fs' );
var path = 			require( 'path' );
var argv = 			require('optimist').argv;
var jsmin = 		require( 'node-jsmin' ).jsmin;
var Canvas = 		require( 'canvas' );
var UglifyJS = 		require( 'uglify-js' );
var handlebars = 	require( 'handlebars' );
var beautifyJs = 	require( 'node-beautify' ).beautifyJs;


var jsCanvas = 		require( './tsCanvas' );
var NodeStringImage = 	require( './NodeStringImage' );
var nodePackage = 	require( './../package.json' );

interface IUglifyJSResult
{
	code:string;
	map:string;
}

enum SVGConverterProcessMode
{
	CMD,
	CODE,
	CANVAS
}

class SVGConverterFileTypes
{
	public static SVG = '.svg';
	public static JS =  '.js';
	public static PNG = '.png';
}

class SVGConverter {


	private static sourceFile:string;
	private static className:string;
	private static package:string;
	private static sourceFileExtension:string;
	private static destinationFile:string;
	private static destinationFileExtension:string;
	private static plainOutput:bool = true;

	private static inlineImages:bool = false;
	private static xcanvas:any;
	private static resultCallBack:( data )=>void;
	private static uglifyOptions:any = {fromString: true,compress: { sequences: false }};


	/**
	 * Main command line entry point
	 */
	public static cmd()
	{

		var argv = require('optimist')
			.usage('svg2ctx v'+nodePackage.version+'\nUsage: $0 -s sourceFile -d destinationFile')
			.options('s', {
				alias : 'source',
				describe:'Input SVG File',
				required:true
			})
			.options('d', {
				alias : 'destination',
				describe:'Output destination.',
				required:true
			})
			.options('c', {
				alias : 'className',
				describe:'Specifiy the full package className, ex: ex.xperiments.GraphicTest [Default: pulsar.display.(destination file name )]',
				default : '$filename$',
				required:false
			})
			.options('p', {
				alias : 'plain',
				describe:'Export plain beautified code',
				default : false,
				required:false
			})
			.options('t', {
				alias : 'template',
				describe:'Use Custom Javascript output template http://www.yahoo.com',
				default : 'ctxClassTemplate.tpl',
				required:false
			})/*
			.options('i', {
				alias : 'inlineImages',
				describe:'Inline Images with Base64 (Default true) or export images to valid provided output directory',
				default : true,
				required:false
			})*/
			.boolean(['p','i','v'])
			.demand( ['s','d'])
			.argv;



		SVGConverter.package = "pulsar.display";
		SVGConverter.resultCallBack = null;
		SVGConverter.sourceFile = argv.source;
		SVGConverter.sourceFileExtension = path.extname( SVGConverter.sourceFile ).toLowerCase();
		SVGConverter.destinationFile = argv.destination;
		SVGConverter.destinationFileExtension = path.extname( SVGConverter.destinationFile ).toLowerCase();
		SVGConverter.className = SVGConverter.destinationFile.split( SVGConverter.destinationFileExtension )[0];
		SVGConverter.plainOutput = argv.plain;
		if( argv.c != '$filename$' )
		{
			console.log('Class Package to export : '+argv.c);
			var parts:string[] = argv.c.split('.');
			var className:string = parts.pop();
			SVGConverter.className = className;
			SVGConverter.package = parts.join('.');
		}

		//SVGConverter.inlineImages = argv.inlineImages;
		SVGConverter.checkSource() && SVGConverter.svg2js( SVGConverterProcessMode.CMD );

	}

	/**
	 * Convert the source svg string to javascript canvas code
	 * @param source The source svg string
	 * @param callback Callback function called with the resulting js code
	 */
	public static convertToCode( source:string, callback?:( code )=>void )
	{
		SVGConverter.resultCallBack = null;
		if ( typeof callback != undefined )
		{
			SVGConverter.resultCallBack = callback;
		}
		SVGConverter.sourceFile = source;
		SVGConverter.sourceFileExtension = path.extname( SVGConverter.sourceFile ).toLowerCase();
		SVGConverter.destinationFile = null;
		SVGConverter.destinationFileExtension = null;

		SVGConverter.checkSource() && SVGConverter.svg2js( SVGConverterProcessMode.CODE );

	}

	/**
	 * Convert the source svg string to canvas object
	 * @param source
	 * @param callback
	 */
	public static convertToCanvas( source:string, callback?:( canvas )=>void )
	{
		SVGConverter.resultCallBack = null;
		if ( typeof callback != undefined )
		{
			SVGConverter.resultCallBack = callback;
		}
		SVGConverter.sourceFile = source;
		SVGConverter.sourceFileExtension = path.extname( SVGConverter.sourceFile ).toLowerCase();
		SVGConverter.destinationFile = null;
		SVGConverter.destinationFileExtension = null;

		SVGConverter.checkSource() && SVGConverter.svg2js( SVGConverterProcessMode.CANVAS );

	}

	/**
	 * Loads & compiles the generated class Handlebars template
	 * @returns Handlebars compiled template
	 */
	private static readCtxClassTemplate():(data:any)=>string
	{
		var template:string = "";
		try
		{
			template = fs.readFileSync( path.resolve(__dirname, 'ctxClassTemplate.tpl'), 'utf8' );
		}
		catch ( e )
		{
			SVGConverter.showError( (<Error>e).message );
		}
		return handlebars.compile(template, {noEscape: true} );
	}
	private static ctxClassTemplate:(data:any)=>string = SVGConverter.readCtxClassTemplate();

	/**
	 * Checks if source & destinations files are valid
	 * @returns {boolean}
	 */
	private static checkSource():bool
	{
		// check if source exist
		if ( !fs.existsSync( SVGConverter.sourceFile ) )
		{
			SVGConverter.showError( 'Source file ' + SVGConverter.sourceFile + ' does not exist' );
		}

		// check if source is SVG file
		if ( SVGConverter.sourceFileExtension != SVGConverterFileTypes.SVG)
		{
			SVGConverter.showError( 'Source file ' + SVGConverter.sourceFile + ' is not a SVG file' );
		}

		// check destination type
		if ( SVGConverter.destinationFileExtension != SVGConverterFileTypes.JS && SVGConverter.destinationFileExtension != SVGConverterFileTypes.PNG )
		{
			SVGConverter.showError( 'Destination file must be .js or .png' );
		}
		return true;
	}

	/**
	 * Determines what kind of process to do
	 * @param mode
	 */
	private static svg2js( mode:number )
	{
		var data:string;
		SVGConverter.xcanvas = new jsCanvas( path.basename( SVGConverter.destinationFile, SVGConverter.destinationFileExtension ) );
		try
		{
			data = fs.readFileSync( SVGConverter.sourceFile, 'utf8' );

			var onConvertedCallback:()=>void;
			switch ( mode )
			{
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

			SVGConverter.xcanvas.compile( data, onConvertedCallback, {package:SVGConverter.package,className:SVGConverter.className} );
		}
		catch ( e )
		{
			SVGConverter.showError( (<Error>e).message );
		}
	}

	/**
	 * Uglify / Beautify the code then saves it to disk
	 * Called when svg has been converted to code, minifies it and generates the PNG/JS resulting file
	 */
	private static onConvertedDataFromCMD()
	{
		console.log( 'Converting ' + SVGConverter.sourceFile + ' to ' + SVGConverter.destinationFile );

		var code:string = beautifyJs( SVGConverter.ctxClassTemplate( SVGConverter.xcanvas.toTemplateData() ) );
		var compressed:IUglifyJSResult = UglifyJS.minify( jsmin( code ), SVGConverter.uglifyOptions );


		if ( SVGConverter.destinationFileExtension == SVGConverterFileTypes.JS )
		{
			code = SVGConverter.plainOutput ? code:compressed.code;
			fs.writeFileSync( SVGConverter.destinationFile, code );
		}
		else
		{
			var len:number = compressed.code.length / 3;
			var sqr2:number = SVGConverter.getNextPowerOfTwo( Math.sqrt( len ) );
			var canvas:HTMLCanvasElement = <HTMLCanvasElement>NodeStringImage.encode( compressed.code, sqr2 );
			var imageData:string = canvas.toDataURL().replace( /^data:image\/png;base64,/, "" );
			fs.writeFileSync( SVGConverter.destinationFile, imageData, 'base64' );
		}
		console.log( 'Conversion Done!' );
	}

	/**
	 * Called when svg has been converted to code, minifies it and call the callback function with the compressed code
	 */
	private static onConvertedDataToCode()
	{
		var code:string = beautifyJs( SVGConverter.ctxClassTemplate( SVGConverter.xcanvas.toTemplateData() ) );
		var compressed:IUglifyJSResult = UglifyJS.minify( jsmin( code ), SVGConverter.uglifyOptions );

		SVGConverter.resultCallBack && SVGConverter.resultCallBack( compressed );
	}

	/**
	 * Called when svg has been converted to code, minifies it and call the callback function with the resulting canvas
	 */
	private static onConvertedDataToCanvas()
	{
		var code:string = beautifyJs( SVGConverter.ctxClassTemplate( SVGConverter.xcanvas.toTemplateData() ) );
		var compressed:IUglifyJSResult = UglifyJS.minify( jsmin( code ), SVGConverter.uglifyOptions );
		var len:number = compressed.code.length / 3;
		var sqr2:number = SVGConverter.getNextPowerOfTwo( Math.sqrt( len ) );
		var canvas:HTMLCanvasElement = <HTMLCanvasElement>NodeStringImage.encode( compressed.code, sqr2 );
		var imageData:string = canvas.toDataURL().replace( /^data:image\/png;base64,/, "" );


		SVGConverter.resultCallBack && SVGConverter.resultCallBack( imageData );
	}

	/**
	 * Gets the next equal or greater power of two from a number
	 * @param num
	 * @returns {number}
	 */
	private static getNextPowerOfTwo( num:number )
	{
		if ( num > 0 && (num & (num - 1)) == 0 )
		{
			return num;
		}
		else
		{
			var result = 1;
			while ( result < num )
			{
				result <<= 1;
			}
			return result;
		}
	}

	/**
	 * Helper console error
	 * @param error
	 */
	private static showError( error:string ):void
	{
		console.log( error );
		process.exit();
	}

}
(module).exports = SVGConverter;


