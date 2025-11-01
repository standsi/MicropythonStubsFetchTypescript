# MicroPython Library Support Usage

This document describes how to use the MicroPython library installation functionality implemented in `src/librarySupport.ts`.

## Overview

The library support module provides functionality to download and install MicroPython packages from the official [micropython-lib](https://github.com/micropython/micropython-lib) repository, handling dependencies automatically.

## Features

- Downloads package index from https://micropython.org/pi/v2/index.json
- Extracts specific packages from the micropython-lib GitHub repository
- Handles package dependencies recursively
- Installs .py/.mpy files to a local `/lib` directory
- Preserves directory structure for package folders
- Excludes test files and manifest.py from installation

## API Functions

### `downloadPackageIndex(url?: string): Promise<PackageIndex>`
Downloads the MicroPython package index from the specified URL (defaults to the official index).

### `loadPackageIndexFromFile(filePath: string): PackageIndex`
Loads a package index from a local JSON file (useful for testing or offline use).

### `findPackage(packageIndex: PackageIndex, packageName: string): PackageInfo | undefined`
Finds a package by name in the package index.

### `downloadMicropythonLibZip(destPath: string): Promise<string>`
Downloads the micropython-lib repository as a ZIP file to the specified path.

### `extractPackageFromZip(zipPath: string, packagePath: string, extractTo: string): Promise<string>`
Extracts a specific package folder from the downloaded ZIP file.

### `parseManifestRequires(manifestPath: string): string[]`
Parses a manifest.py file and extracts all require() statements (dependencies).

### `copyPackageToLib(extractedPath: string, libPath: string): Promise<void>`
Copies package files to the /lib directory, handling both single files and package folders.

### `installPackageWithDependencies(...): Promise<void>`
Main function that recursively installs a package and all its dependencies.

### `main(packageName?: string, useLocalIndex?: boolean, cleanLib?: boolean): Promise<void>`
High-level convenience function for installing a package.

## Example Usage

```typescript
import { main } from './librarySupport';

// Install neopixel package using online index
await main('neopixel', false, true);

// Install collections-defaultdict using local index file
await main('collections-defaultdict', true, true);

// Install without cleaning existing lib directory
await main('neopixel', false, false);
```

## Example with Individual Functions

```typescript
import {
    downloadPackageIndex,
    downloadMicropythonLibZip,
    installPackageWithDependencies
} from './librarySupport';
import * as path from 'path';
import * as os from 'os';

// Download package index
const packageIndex = await downloadPackageIndex();

// Download micropython-lib repository
const zipPath = path.join(os.tmpdir(), 'micropython-lib.zip');
await downloadMicropythonLibZip(zipPath);

// Install package with dependencies
const libPath = path.join(__dirname, '../lib');
const tempDir = path.join(os.tmpdir(), 'micropython-lib-temp');
const processedPackages = new Set<string>();

await installPackageWithDependencies(
    'neopixel',
    packageIndex,
    libPath,
    zipPath,
    tempDir,
    processedPackages,
    0
);
```

## Package Examples

### Simple Package (neopixel)
- Contains only `neopixel.py`
- No dependencies
- Installs as: `/lib/neopixel.py`

### Package with Dependencies (collections-defaultdict)
- Contains `collections/` folder with `defaultdict.py`
- Depends on `collections` package
- Installs as:
  - `/lib/collections/__init__.py` (from collections)
  - `/lib/collections/defaultdict.py` (from collections-defaultdict)

## Configuration Constants

The following constants can be modified in `librarySupport.ts`:

- `MICROPYTHON_INDEX_URL`: URL of the package index (default: https://micropython.org/pi/v2/index.json)
- `MICROPYTHON_LIB_ZIP_URL`: URL of the micropython-lib repository ZIP (default: GitHub master branch)
- `MAX_DEPENDENCY_DEPTH`: Maximum recursion depth for dependencies (default: 10)
- `LOCAL_INDEX_PATH`: Path to local package index file (default: librarySupport/mpylib.json)

## Notes

- The `/lib` directory is excluded from version control via `.gitignore`
- Test files (starting with `test_`) are not installed
- The `manifest.py` file is not installed
- Temporary files are automatically cleaned up after installation
