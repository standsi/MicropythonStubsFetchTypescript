# TypeScript Console Application to fetch Micropython Stubs

Demo code to show a method for fetching Micropython stubs from Pypi in manner similar to 'pip' including recursive dependency resolution.

For demo purposes the Micropython target and the desired release prefix are set in constants at the top of the index.ts file.

When run all of the fetched data files are saved in a `stubs` directory (the json manifests and the wheel archive files) along with the extracted stub files in a subdirectory with the target package name.

## Project Structure

```
├── src/
│   └── index.ts          # Main application file
├── dist/                 # Compiled JavaScript output
├── .vscode/
│   └── launch.json       # VS Code debug configuration
├── package.json          # Project configuration and dependencies
├── tsconfig.json         # TypeScript compiler configuration
└── README.md            # This file
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

