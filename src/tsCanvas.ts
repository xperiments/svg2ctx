///<reference path="../dec/node.d.ts"/>
var fabric = require( 'fabric' ).fabric;
var sprintf = require( 'sprintf-js' ).sprintf;
var Canvas = require( "canvas" );


export interface ICanvas extends HTMLCanvasElement
{
	jsctx:jsContext2d;
	real2dContext:CanvasRenderingContext2D;
}

class jsCanvas
{
	className:string;
	canvas:ICanvas;
	jsctx:jsContext2d;
	package:string[];

	constructor( objectname, width, height )
	{
		this.canvas = <ICanvas>fabric.createCanvasForNode( width, height )
		this.jsctx = <jsContext2d><CanvasRenderingContext2D>new jsContext2d( this.canvas, objectname );
		this.canvas.real2dContext = this.canvas.getContext( '2d' );
		this.canvas.getContext =( contextId:string )=>
		{
			if ( contextId == '2d' )
			{
				return this.jsctx;
			}
			else
			{
				return null;
			}
		};
	}

	compile( svg, oncomplete, moduleInfo:{package:string;className:string} )
	{

		this.className = moduleInfo.className;
		this.package = moduleInfo.package.split('.');
		var canvas = new fabric.Canvas( this.canvas );
		//canvg (this.canvas, svg, opts);
		fabric.loadSVGFromString( svg, ( ob, op )=>
		{
			var obj = fabric.util.groupSVGElements(ob, op ).set( { left: op.width/2, top: op.height/2 } ).scale( 1 );
			canvas.add(obj);
			oncomplete && oncomplete();
		});
	}

	toTemplateData()
	{
		return {
			render:this.jsctx.getRenderCode(),
			images:this.jsctx.getImageCode(),
			totalImages:this.jsctx.getTotalImages(),
			gradients:this.jsctx.getGradientCode(),
			className:this.className,
			package:this.package,
			width:this.jsctx.canvas.width,
			height:this.jsctx.canvas.height
		}
	}
}



export class jsContext2d
{
	lastFields:any;
	fieldStack:any[] = [];
	fieldsInvalid:bool = false;
	finished:bool = false;
	fn:string ='';
	output:string = '';
	outputimages:string = '';
	outputGradients:string = '';
	ngradients:number = 0;
	nimages:number = 0;



	fillStyle;
	strokeStyle;
	font;
	lineWidth;
	lineCap;
	lineJoin;
	miterLimit;
	globalAlpha;
	textBaseline;
	textAlign;
	shadowBlur;
	shadowColor;
	shadowOffsetX;
	shadowOffsetY;

	constructor( public canvas:ICanvas, objectname )
	{
		this.lastFields =
		{
			fillStyle:     null,
			strokeStyle:   null,
			font:          '10px sans-serif',  // lest canvg melt down
			lineWidth:     null,
			lineCap:       null,
			lineJoin:      null,
			miterLimit:    null,
			globalAlpha:   null,
			textBaseline:  null,
			textAlign:     null,
			shadowBlur:    null,
			shadowColor:   null,
			shadowOffsetX: null,
			shadowOffsetY: null

		};
		// initialize the context's fields
		for ( var i in this.lastFields )
		{
			this[i] = this.lastFields [i];
		}


	}

	getTotalImages():number
	{
		return this.nimages;
	}
	getRenderCode():string
	{
		return this.output;
	}
	getImageCode():string
	{
		return this.outputimages;
	}
	getGradientCode():string
	{
		return this.outputGradients;
	}

	checkFields()
	{
		for ( var i in this.lastFields )
		{
			var last = this.lastFields [i];
			if ( this.fieldsInvalid || last != this [i] || typeof (last) != typeof (this [i]) )
			{
				if ( this [i] === null || this [i] === undefined )
				{
					continue;
				}
				switch ( typeof this [i] )
				{
					case 'boolean':
					case 'number':
						this.output += '\tthis.setter (ctx, "' + this.slashify( i ) + '", ' + this [i] + ');\n';
						break;
					case 'string':
						this.output += '\tthis.setter (ctx, "' + this.slashify( i ) + '", "' + this.slashify( this [i] ) + '");\n';
						break;
					default:
						if ( this [i].jscGradient )
						{
							// found a gradient or pattern
							this.output += '\tthis.setter (ctx, "' + this.slashify( i ) + '", this.gradients [' + (this[i].jscGradient - 1) + ']);\n';
						}
						else
						{
							console.log( i + ": don't know how to handle field " + (typeof (this [i])) + " " + this[i] );
						}
						break;
				}
				this.lastFields[i] = this [i];
				// update the real context too
				this.canvas.real2dContext[i] = this [i];
			}
		}
		this.fieldsInvalid = false;
	}

	pushFields()
	{
		var push = {};
		for ( var i in this.lastFields )
		{
			push [i] = this.lastFields [i];
		}
		this.fieldStack.push( push );
	}

	popFields()
	{
		var pop = this.fieldStack.pop();
		for ( var i in this.lastFields )
		{
			this.lastFields [i] = pop [i];
		}
	}

	getBase64Image( img:HTMLImageElement ):string
	{
		// Create an empty canvas element
		var canvas:HTMLCanvasElement = <HTMLCanvasElement>new Canvas( img.width, img.height );
		var ctx:CanvasRenderingContext2D = canvas.getContext( "2d" );
			ctx.drawImage( img, 0, 0 );
		var dataURL:string = canvas.toDataURL( "image/png" );
		return dataURL;
	}

	emitGradient( fn, args, fnprefix? )
	{
		this.checkFields();
		var argstr = '';
		var beforestr = '';
		var nobj = 0;
		for ( var i in args )
		{
			var arg = args [i];
			switch ( typeof arg )
			{
				case 'boolean':
					argstr += arg == true ? "true" : "false" + ',';
					break;
				case 'number':
					argstr += arg.toFixed( 2 ) + ',';
					break;
				case 'string':
					argstr += '"' + this.slashify( arg ) + '"' + ',';
					break;
				default:

					if ( arg.tagName == 'IMG' )
					{   // should prolly check to see if it's a DOM object too.
						var data = this.getBase64Image( arg );
						this.outputimages += 'window.' + this.fn + '.imgs[' + this.nimages + '] = new Image ();\nwindow.' + this.fn + '.imgs[' + this.nimages + '].src="' + this.slashify( data ) + '"' + ';\n';
						argstr += 'window.' + this.fn + '.imgs[' + this.nimages + '],';
						this.nimages++;
					}
					else if ( arg.tagName == 'CANVAS' )
					{
						var data = arg.toDataURL( "image/png" );
						this.outputimages += 'window.' + this.fn + '.imgs[' + this.nimages + '] = new Image ();\nwindow.' + this.fn + '.imgs[' + this.nimages + '].src="' + this.slashify( data ) + '"' + ';\n';
						argstr += 'window.' + this.fn + '.imgs[' + this.nimages + '],';
						this.nimages++;
					}
					else
					{

						console.log( fn + ": don't know how to handle " + (typeof (arg)) + " " + arg.tagName );
						return this.canvas.real2dContext [fn].apply( this.canvas.real2dContext, args );
					}
			}
		}
		if ( beforestr.length )
		{
			this.outputGradients += beforestr;
		}
		if ( fnprefix )
		{
			this.outputGradients += fnprefix;
		}
		this.outputGradients += 'ctx.' + fn + '(';
		if ( argstr.length )
		{
			this.outputGradients += argstr.substr( 0, argstr.length - 1 );
		}
		this.outputGradients += ');\n';
		// now execute it in the real canvas

		return this.canvas.real2dContext[fn].apply( this.canvas.real2dContext, args );
	}

	emitFunc( fn:string, args:any, fnprefix?:string )
	{
		this.checkFields();
		var argstr = '';
		var beforestr = '';
		var nobj = 0;
		for ( var i in args )
		{
			var arg = args [i];
			switch ( typeof arg )
			{
				case 'boolean':
					argstr += arg == true ? "true" : "false" + ',';
					break;
				case 'number':
					argstr += arg.toFixed( 2 ) + ',';
					break;
				case 'string':
					argstr += '"' + this.slashify( arg ) + '"' + ',';
					break;
				case 'object':

					if( arg.toString()=='[object Image]' )
					{
						var data = this.getBase64Image( arg );
						this.outputimages += '\t\t\tthis.images[' + this.nimages + '] = new Image ();\n';
						this.outputimages += '\t\t\tthis.images[' + this.nimages + '].onload = this.onImageLoaded.bind(this);\n';
						this.outputimages += '\t\t\tthis.images[' + this.nimages + '].src="' + data+ '"' + ';\n';
						argstr += 'this.images[' + this.nimages + '],';
						this.nimages++;
					}
					break;
				/*
				default:
					console.log('default');
					if ( arg.tagName == 'IMG' )
					{   // should prolly check to see if it's a DOM object too.
						var data = this.getBase64Image( arg );
						this.outputimages += 'window.' + this.fn + '.imgs[' + this.nimages + '] = new Image ();\nwindow.' + this.fn + '.imgs[' + this.nimages + '].src="' + this.slashify( data ) + '"' + ';\n';
						argstr += 'window.' + this.fn + '.imgs[' + this.nimages + '],';
						this.nimages++;
					}
					else if ( arg.tagName == 'CANVAS' )
					{
						var data = arg.toDataURL( "image/png" );
						this.outputimages += 'window.' + this.fn + '.imgs[' + this.nimages + '] = new Image ();\nwindow.' + this.fn + '.imgs[' + this.nimages + '].src="' + this.slashify( data ) + '"' + ';\n';
						argstr += 'window.' + this.fn + '.imgs[' + this.nimages + '],';
						this.nimages++;
					}
					else
					{

						console.log( fn + ": don't know how to handle " + (typeof (arg)) + " " + arg );
						return this.canvas.real2dContext [fn].apply( this.canvas.real2dContext, args );
					}
				*/
			}
		}
		if ( beforestr.length )
		{
			this.output += beforestr;
		}
		if ( fnprefix )
		{
			this.output += fnprefix;
		}
		this.output += '\t\t\t\tctx.' + fn + '(';
		if ( argstr.length )
		{
			this.output += argstr.substr( 0, argstr.length - 1 );
		}
		this.output += ');\n';
		// now execute it in the real canvas

		return this.canvas.real2dContext[fn].apply( this.canvas.real2dContext, args );
	}



	/* Override methods */
	isPointInPath( )
	{
		//console.log( 'isPointInPath')
		return this.canvas.real2dContext['isPointInPath'].apply( this.canvas.real2dContext, arguments );
	}

	setTransform()
	{
		//console.log( 'setTransform')
		return this.emitFunc( 'setTransform', arguments );
	}
	rect()
	{
		//console.log( 'rect')
		return this.emitFunc( 'rect', arguments );
	}

	createImageData()
	{
		//console.log( 'createImageData')
		return this.emitFunc( 'createImageData', arguments );
	}
	strokeRect()
	{
		//console.log( 'strokeRect')
		return this.emitFunc( 'strokeRect', arguments );
	}

	arcTo()
	{
		//console.log( 'arcTo')
		return this.emitFunc( 'arcTo', arguments );
	}
	globalCompositeOperation:string;


	fill()
	{
		return this.emitFunc( 'fill', arguments );
	}
	stroke()
	{
		return this.emitFunc( 'stroke', arguments );
	}
	translate()
	{
		return this.emitFunc( 'translate', arguments );
	}
	transform()
	{
		return this.emitFunc( 'transform', arguments );
	}
	rotate()
	{
		return this.emitFunc( 'rotate', arguments );
	}
	scale()
	{
		return this.emitFunc( 'scale', arguments );
	}
	save()
	{
		this.emitFunc( 'save', arguments );
		this.pushFields();
	}
	restore()
	{
		this.emitFunc( 'restore', arguments );
		this.popFields();
	}
	beginPath()
	{
		return this.emitFunc( 'beginPath', arguments );
	}
	closePath()
	{
		return this.emitFunc( 'closePath', arguments );
	}
	moveTo()
	{
		return this.emitFunc( 'moveTo', arguments );
	}
	lineTo()
	{
		return this.emitFunc( 'lineTo', arguments );
	}
	clip()
	{
		return this.emitFunc( 'clip', arguments );
	}
	quadraticCurveTo()
	{
		return this.emitFunc( 'quadraticCurveTo', arguments );
	}
	bezierCurveTo()
	{
		return this.emitFunc( 'bezierCurveTo', arguments );
	}
	arc()
	{
		return this.emitFunc( 'arc', arguments );
	}
	createPattern()
	{
		var g = this.emitFunc( 'createPattern', arguments, 'this.gradients [' + this.ngradients + '] = ' );
		g.jscGradient = ++this.ngradients;
		return g;
	}
	createLinearGradient()
	{
		this.outputGradients += '\tthis.gradients [' + this.ngradients + '] = ';
		var n = this.ngradients;
		var g = this.emitGradient( 'createLinearGradient', arguments );
		var oldadd = g.addColorStop;

		// override the colorstop function
		g.addColorStop =( stop, color )=>
		{
			this.outputGradients += sprintf( '\tthis.gradients [%d].addColorStop (%f, "%s");\n', n, stop, color );
			// execute in parent
			oldadd.apply( g, arguments );
		}
		g.jscGradient = ++this.ngradients;
		return g;
	}
	createRadialGradient()
	{
		this.outputGradients += '\tthis.gradients [' + this.ngradients + '] = ';
		var n = this.ngradients;
		var g = this.emitGradient( 'createRadialGradient', arguments );
		var oldadd = g.addColorStop;

		g.addColorStop = ( stop, color )=>
		{
			this.outputGradients += sprintf( '\tthis.gradients [%d].addColorStop (%f, "%s");\n', n, stop, color );
			oldadd.apply( g, arguments );
		}
		g.jscGradient = ++this.ngradients;
		return g;
	}

	fillText()
	{
		return this.emitFunc( 'fillText', arguments );
	}
	strokeText()
	{
		return this.emitFunc( 'strokeText', arguments );
	}
	measureText()
	{
		return this.emitFunc( 'measureText', arguments );
	}
	drawImage()
	{     // XXX: problematic because it takes an img/canvas
		return this.emitFunc( 'drawImage', arguments );
	}
	fillRect()
	{
		return this.emitFunc( 'fillRect', arguments );
	}
	clearRect()
	{
		return this.emitFunc( 'clearRect', arguments );
	}
	getImageData()
	{
		return this.emitFunc( 'getImageData', arguments );
	}
	putImageData()
	{    // XXX: problematic it takes an array of image data
		return this.emitFunc( 'putImageData', arguments );
	}
	isPointPath()
	{
		return this.emitFunc( 'isPointPath', arguments );
	}

	slashify( s )
	{
		if ( !s )
		{
			return '';
		}
		s = s.replace( /\\'/g, "\\\\'" );
		return s.replace( /'/g, "\\'" );
	}
}

(module).exports = jsCanvas;