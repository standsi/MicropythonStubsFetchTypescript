# MicroPython Library Support Reverse Engineering

## ** the package index json is found at:
https://micropython.org/pi/v2/index.json

## the repo for packages is:
https://github.com/micropython/micropython-lib

## Possible solution for typescript version of library install to a local `/lib` folder
1. Download the package index json and present a list of package names to the user (simulate with a constant for testing).
2. From the package object selected in the json, extract the path field.
3. Assuming the package selected has a valid path entry (non-empty) then download the micropython-lib repo from github as a zip file.
4. Using the zip-lib node module extract the folder to a temp location from the micropython-lib zip file that matches path from the json.  You can use the onEntry callback of the Unzip constructor to filter all but the desired folder.
5. If the only contents of the folder are .py or .mpy files copy all but the manifest.py to the output /lib folder.
6. If there is a folder in the unzip'ed folder, copy that folder to the output lib folder, creating the folder if needed but preserving any contents already there (see collections example below)
6. Read the manifest.py file and parse it for any require() statements.
7. For each require() statement found, repeat steps 2-6 recursively until all dependencies are resolved.

## some examples of the way mip loads up devices:

```
-- neopixel --
    json:
        "path": "micropython/drivers/led/neopixel",
        "name": "neopixel",
        "description": "WS2812/NeoPixel driver.",
    manifest.py at the path in repo:
        metadata(description="WS2812/NeoPixel driver.", version="0.1.0")
        module("neopixel.py", opt=3)
    mip installs:
        neopixel.py in /lib
    
-- collections-defaultdict --
    json:
        "path": "python-stdlib/collections-defaultdict",
        "name": "collections-defaultdict",
        "description": "",
    manifest.py at path in repo:
        metadata(version="0.3.0")
        # Originally written by Paul Sokolovsky.
        require("collections")
        package("collections")
    mip install ->  mpremote mip install collections-defaultdict
        >>> os.listdir('/lib')
        ['collections', 'neopixel.mpy']
        >>> os.listdir('/lib/collections')
        ['__init__.mpy', 'defaultdict.mpy']
    HOW: collections is folder at path of collections-defaultdict with defaultdict.mpy
        AND collections is folder in collections package with __init__.mpy
        -- collections --
            json:
                "path": "python-stdlib/collections",
                "name": "collections",
                "description": "",
            manifest.py at path in repo:
                metadata(version="0.2.0")
                package("collections")
            installed by dependency in mip...
```
