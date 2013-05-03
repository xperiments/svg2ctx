#!/usr/bin/env node
(function ()
{
  var Canvas = require("canvas");
  var Image = Canvas.Image;

  var fs = require('fs');
  var path = require('path');

  var UglifyJS = require("uglify-js");
  var transcoders = require('./transcoders');
  var jsCanvas = require('./jsCanvas');

  var fileSource ;
  var fileDestination;
  var xcanvas;
  var self = this;
  var _processCallback;

  function usage()
  {
      console.log( '' );
      console.log( 'USAGE' );
      console.log( 'svg2ctx input.svg output.png' );
      console.log( 'svg2ctx input.svg output.js' );
      console.log( '' );
      process.exit();
  }

  function cmd()
  {

    if(!process.argv || process.argv == undefined ){ usage(); }
    if( process.argv.length<4 ){ usage(); }
    else
    {
      checkSource( process.argv[2].toString() , process.argv[3].toString(), processSVG, null )
    }
  }

  function getNextPowerOfTwo(num) {
      if(num > 0 && (num & (num - 1)) == 0) {
          return num;
      } else {
          var result = 1;
          while(result < num) {
              result <<= 1;
          }
          return result;
      }
  }

  function checkSource( file , fileDestination, convertMethod, callback )
  {
    _processCallback = callback || null;
    fs.exists(file, function(exists)
    {
      if (exists)
      {
        fileSource = file;
        var ext = path.extname(fileDestination).toLowerCase();
        if( ['.js','.png'].indexOf(ext)==-1)
        {
          console.log('Destination file must be .js or .png');
          process.exit();  
        }
      
        if( convertMethod == processSVG ) processSVG( file, fileDestination );
        if( convertMethod == processSVGToImage ) processSVGToImage( file );
      }
      else
      {
        console.log('Source file '+file+' does not exist');
      }
    });  
  }

  function processSVG( fileSource, afileDestination )
  {

    fileDestination = afileDestination;
    fs.readFile( fileSource , 'utf8', function (err,data)
    {
      if (err)
      {
        return console.log(err);
      }

      xcanvas = new jsCanvas('jscanvastest');
      xcanvas.compile ( data, onConvertedData );  
    });
  }
  function processSVGToImage( fileSource )
  {

    fileDestination = afileDestination;
    fs.readFile( fileSource , 'utf8', function (err,data)
    {
      if (err)
      {
        return console.log(err);
      }

      xcanvas = new jsCanvas('jscanvastest');
      var ext = path.extname(fileDestination).toLowerCase();
      var isJS = ext == ".js";

      xcanvas.compile ( data, onConvertedData );  
    });
  }

  function onConvertedData()
  {
    var ext = path.extname(fileDestination).toLowerCase();
    var isJS = ext == ".js";

    if( isJS )
    {
      var compressed = UglifyJS.minify( xcanvas.toString(), {fromString: true});
      fs.writeFileSync(fileDestination, compressed.code );
    }
    else
    {
      var compressed = UglifyJS.minify( xcanvas.toString(), {fromString: true});
      var len = compressed.code.length/3;
      var sqr2 = getNextPowerOfTwo( Math.sqrt( len ) );
      var canvas = transcoders.StringImage.encode( compressed.code ,sqr2 );
      var imageData = canvas.toDataURL().replace(/^data:image\/png;base64,/,"");
      fs.writeFileSync(fileDestination, imageData, 'base64');
    }

  }  


  function processFile( source, dest, callback )
  {
    if( source == undefined || dest == undefined )
    {
      usage();
      return;
    }
    checkSource( source , dest, processSVG, callback )
  }

  function getCanvasFromSVG( source, callback )
  {
    checkSource( source , null, processSVGtoImage, callback )  
  }

  
  this.svg2ctx =
  {
    convertSVG:processFile,
    getContextCanvas:getCanvasFromSVG,
    cmd:cmd
  }


})();

module.exports = svg2ctx;

