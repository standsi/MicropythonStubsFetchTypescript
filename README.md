# TypeScript Console Application to fetch Micropython Stubs

Demo code to show a method for fetching Micropython stubs from Pypi in manner similar to 'pip' including recursive dependency resolution.

For demo purposes the Micropython target and the desired release prefix are set in constants at the top of the index.ts file.

When run all of the fetched data files are saved in a `stubs` directory (the json manifests and the wheel archive files) along with the extracted stub files in a subdirectory with the target package name.

## Verification testing
As noted in the three test cases at the top of index.ts, 3 target stub packages were fetched, along with stdlib which is a dependency of all 3.  Then a separate project was created with a python virtual environment into which each package was installed with `pip install <packagename>` in separate tests.  Then a file by file full text comparison was done between the virtual environment and the stubs extracted by this tool.  In all cases the corresponding files were identical.  

## Using in a vscode project
To use the fetched stubs in a vscode project, add the `stubs/<package_name>` directory to the `python.analysis.extraPaths` setting in your workspace settings.json file.  For example:
```json
{
    "python.analysis.extraPaths": [
        "./stubs/micropython-esp32-stubs"
    ]
}
```

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

