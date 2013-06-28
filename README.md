# svg2ctx 0.0.4

WIP NodeJS module for converting svg to canvas context command class.

### How to use
    
    Install
        $ [sudo] npm install -g svg2ctx

svg2ctx v0.0.4
Usage: svg2ctx -s sourceFile -d destinationFile

Options:
  -s, --source       Input SVG File                                                                                                         [required]
  -d, --destination  Output destination.                                                                                                    [required]
  -c, --className    Specifiy the full package className, ex: ex.xperiments.GraphicTest [Default: pulsar.display.(destination file name )]  [default: "$filename$"]
  -p, --plain        Export plain beautified code                                                                                           [default: false]
  -t, --template     Use Custom Javascript output template http://www.yahoo.com                                                             [default: "ctxClassTemplate.tpl"]
