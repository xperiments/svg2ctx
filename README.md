# svg2ctx 0.0.4

WIP NodeJS module for converting svg to canvas context command class.

### How to use
    
    Install
        $ [sudo] npm install -g svg2ctx

Usage: svg2ctx -s sourceFile -d destinationFile

    Options:
      -s, --source        Input SVG File [required]
      -d, --destination   Output destination. Example: outputFile.js  [required]
      ( EXPERIMENTAL: outputFile.png => Writes the output string to a png. See NodeStringImage.ts )
      -p, --plain         Export plain beautified code [default: false]
      -t, --template      Use Custom Javascript output template [default: "ctxClassTemplate.tpl"]
      -v, --version       Show version
