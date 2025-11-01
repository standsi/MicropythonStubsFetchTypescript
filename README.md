# TypeScript Console Application to fetch Micropython Stubs and libraries

Demo code to show a method for fetching Micropython stubs from Pypi in manner similar to 'pip' including recursive dependency resolution.  Also has code for installing libraries locally similar to `mip` suitable for copying to board.

For demo purposes the Micropython target and the desired release prefix are set in constants at the top of the index.ts file.  Also included is a flag to choose whether the extracted stubs are copied into a directory named for the package, or into a common 'typings' directory.  If typings is chosen, the folder can be copied to the root of the micropython project and is generally recognized by the Python language server for stubs.

When run all of the fetched data files are saved in a `stubs` directory (the json manifests and the wheel archive files) along with the extracted stub files in a subdirectory with the target package name or the folder named 'typings'.

For libraries a selection of examples is included at the end of the Main method in index.ts.  The libraries are all installed in a /lib folder.  All code is included in the src/librarySupport.ts file.

## Verification testing
As noted in the three test cases at the top of index.ts, 3 target stub packages were fetched, along with stdlib which is a dependency of all 3.  Then a separate project was created with a python virtual environment into which each package was installed with `pip install <packagename>` in separate tests.  Then a file by file full text comparison was done between the virtual environment and the stubs extracted by this tool.  In all cases the corresponding files were identical.  

For libraries several examples are done.  The resulting files/folders in the local /lib folder was compared to the same set run on a board with `mpremote mip install...`.

## Using in a vscode project
To use the fetched stubs in a vscode project if the stubs are put in the folder named for the package, add the `stubs/<package_name>` directory to the `python.analysis.extraPaths` setting in your workspace settings.json file.  For example:
```json
{
    "python.analysis.extraPaths": [
        "./stubs/micropython-esp32-stubs"
    ]
}
```

If the stubs are put in the 'typings' folder copy it to the root of your project where it should be recognized by the Python language server for stubs.

For libraries all installs are done to a local folder which can then be copied over to the board with, for example, `mpremote cp ...`

## Getting Started
### Prerequisites

- Node.js (version 16 or higher)
- npm

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Run the application:
   ```bash
   npm start
   ```

## Development

### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled application
- `npm run dev` - Build and run in one command
- `npm run watch` - Watch for changes and recompile

