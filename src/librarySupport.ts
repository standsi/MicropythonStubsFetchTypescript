/** @module librarySupport */

import * as axios from 'axios';
import * as zl from 'zip-lib';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ** the package index json is found at:
// https://micropython.org/pi/v2/index.json

// the repo for packages is:
//  https://github.com/micropython/micropython-lib

/* some examples of the way mip loads up devices:

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
*/

const MICROPYTHON_INDEX_URL = 'https://micropython.org/pi/v2/index.json';
const MICROPYTHON_LIB_ZIP_URL = 'https://github.com/micropython/micropython-lib/archive/refs/heads/master.zip';
const REPO_PREFIX = 'micropython-lib-master/';
const MAX_DEPENDENCY_DEPTH = 10;
const LOCAL_INDEX_PATH = 'librarySupport/mpylib.json';

interface PackageInfo {
    name: string;
    path?: string;
    description?: string;
    version?: string;
}

interface PackageIndex {
    packages: PackageInfo[];
    v: number;
    updated: number;
}

/**
 * Download the MicroPython package index JSON
 */
export async function downloadPackageIndex(url: string = MICROPYTHON_INDEX_URL): Promise<PackageIndex> {
    try {
        const response = await axios.default.get(url);
        return response.data as PackageIndex;
    } catch (error) {
        console.error('Error downloading package index:', error);
        throw error;
    }
}

/**
 * Load package index from a local JSON file
 */
export function loadPackageIndexFromFile(filePath: string): PackageIndex {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content) as PackageIndex;
    } catch (error) {
        console.error('Error loading package index from file:', error);
        throw error;
    }
}

/**
 * Find a package by name in the package index
 */
export function findPackage(packageIndex: PackageIndex, packageName: string): PackageInfo | undefined {
    return packageIndex.packages.find(pkg => pkg.name === packageName);
}

/**
 * Download the micropython-lib repository as a zip file
 */
export async function downloadMicropythonLibZip(destPath: string): Promise<string> {
    try {
        const response = await axios.default({
            method: 'get',
            url: MICROPYTHON_LIB_ZIP_URL,
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(destPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log(`Downloaded micropython-lib zip to ${destPath}`);
                resolve(destPath);
            });
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('Error downloading micropython-lib zip:', error);
        throw error;
    }
}

/**
 * Extract a specific folder from the micropython-lib zip file
 */
export async function extractPackageFromZip(
    zipPath: string, 
    packagePath: string, 
    extractTo: string
): Promise<string> {
    try {
        const fullPackagePath = REPO_PREFIX + packagePath;
        const targetDir = path.join(extractTo, path.basename(packagePath));
        
        if (!fs.existsSync(extractTo)) {
            fs.mkdirSync(extractTo, { recursive: true });
        }

        // Extract the package folder from the zip
        const unzip = new zl.Unzip({
            onEntry: (event: any) => {
                // Only extract files from the specific package path
                if (event.entryName && event.entryName.startsWith(fullPackagePath)) {
                    // Continue extraction
                } else {
                    // Skip this entry
                    event.preventDefault();
                }
            }
        });

        await unzip.extract(zipPath, extractTo);
        console.log(`Extracted ${packagePath} to ${extractTo}`);
        
        // Return the actual extracted path
        return path.join(extractTo, fullPackagePath);
    } catch (error) {
        console.error(`Error extracting package from zip:`, error);
        throw error;
    }
}

/**
 * Parse manifest.py for require() statements
 */
export function parseManifestRequires(manifestPath: string): string[] {
    try {
        if (!fs.existsSync(manifestPath)) {
            return [];
        }

        const content = fs.readFileSync(manifestPath, 'utf8');
        const requires: string[] = [];
        
        // Match require("package-name") patterns
        const requireRegex = /require\s*\(\s*["']([^"']+)["']\s*\)/g;
        let match;
        
        while ((match = requireRegex.exec(content)) !== null) {
            requires.push(match[1]);
        }
        
        return requires;
    } catch (error) {
        console.error(`Error parsing manifest at ${manifestPath}:`, error);
        return [];
    }
}

/**
 * Check if a file should be installed (not a test or manifest file)
 */
function isInstallableFile(filename: string): boolean {
    return (filename.endsWith('.py') || filename.endsWith('.mpy')) && 
           filename !== 'manifest.py' &&
           !filename.startsWith('test_');
}

/**
 * Copy files from extracted package to /lib directory
 */
export async function copyPackageToLib(
    extractedPath: string,
    libPath: string
): Promise<void> {
    try {
        if (!fs.existsSync(extractedPath)) {
            console.warn(`Extracted path does not exist: ${extractedPath}`);
            return;
        }

        // Ensure lib directory exists
        if (!fs.existsSync(libPath)) {
            fs.mkdirSync(libPath, { recursive: true });
        }

        const items = fs.readdirSync(extractedPath);
        
        // Separate files and directories
        const directories: string[] = [];
        const files: string[] = [];
        
        for (const item of items) {
            const itemPath = path.join(extractedPath, item);
            const stat = fs.statSync(itemPath);
            
            if (stat.isDirectory()) {
                directories.push(item);
            } else if (stat.isFile()) {
                files.push(item);
            }
        }
        
        // Filter files to only .py/.mpy files (excluding manifest.py and test files)
        const pyFiles = files.filter(isInstallableFile);
        
        // If there are directories, copy them to /lib (these are package folders)
        if (directories.length > 0) {
            for (const dir of directories) {
                const srcPath = path.join(extractedPath, dir);
                const destPath = path.join(libPath, dir);
                
                // Copy directory, preserving existing contents
                if (fs.existsSync(destPath)) {
                    // Merge directories
                    copyDirRecursive(srcPath, destPath);
                } else {
                    // Create new directory
                    fs.cpSync(srcPath, destPath, { recursive: true });
                }
                console.log(`Copied folder ${dir} to ${libPath}`);
            }
        }
        
        // Copy .py/.mpy files (if any) to /lib root
        if (pyFiles.length > 0) {
            for (const file of pyFiles) {
                const srcPath = path.join(extractedPath, file);
                const destPath = path.join(libPath, file);
                fs.copyFileSync(srcPath, destPath);
                console.log(`Copied ${file} to ${libPath}`);
            }
        }
    } catch (error) {
        console.error(`Error copying package to lib:`, error);
        throw error;
    }
}

/**
 * Recursively copy directory contents, preserving existing files
 */
function copyDirRecursive(src: string, dest: string): void {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    const items = fs.readdirSync(src);
    
    for (const item of items) {
        const srcPath = path.join(src, item);
        const destPath = path.join(dest, item);
        const stat = fs.statSync(srcPath);
        
        if (stat.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * Install a package and its dependencies recursively
 */
export async function installPackageWithDependencies(
    packageName: string,
    packageIndex: PackageIndex,
    libPath: string,
    zipPath: string,
    tempDir: string,
    processedPackages: Set<string> = new Set(),
    depth: number = 0
): Promise<void> {
    const maxDepth = MAX_DEPENDENCY_DEPTH;
    if (depth > maxDepth) {
        console.warn(`Maximum dependency depth reached for ${packageName}`);
        return;
    }
    
    if (processedPackages.has(packageName)) {
        console.log(`Package ${packageName} already processed, skipping...`);
        return;
    }
    
    const indent = '  '.repeat(depth);
    console.log(`${indent}Installing package: ${packageName} (depth: ${depth})`);
    
    // Find the package in the index
    const pkg = findPackage(packageIndex, packageName);
    if (!pkg || !pkg.path) {
        console.warn(`${indent}Package ${packageName} not found or has no path`);
        return;
    }
    
    processedPackages.add(packageName);
    
    try {
        // Extract the package from the zip
        const extractedPath = await extractPackageFromZip(zipPath, pkg.path, tempDir);
        
        // Parse manifest.py for dependencies
        const manifestPath = path.join(extractedPath, 'manifest.py');
        const dependencies = parseManifestRequires(manifestPath);
        
        if (dependencies.length > 0) {
            console.log(`${indent}Found dependencies:`, dependencies);
        }
        
        // Recursively install dependencies first
        for (const dep of dependencies) {
            await installPackageWithDependencies(
                dep,
                packageIndex,
                libPath,
                zipPath,
                tempDir,
                processedPackages,
                depth + 1
            );
        }
        
        // Copy package files to /lib
        await copyPackageToLib(extractedPath, libPath);
        
    } catch (error) {
        console.error(`${indent}Error installing package ${packageName}:`, error);
    }
}

/**
 * Main function to demonstrate library installation
 */
export async function mainLib(packageName: string = 'neopixel', useLocalIndex: boolean = false, cleanLib: boolean = true): Promise<void> {
    console.log('=== MicroPython Library Installer ===');
    console.log(`Installing package: ${packageName}`);
    
    const rootPath = path.join(__dirname, '../');
    const libPath = path.join(rootPath, 'lib');
    const tempDir = path.join(os.tmpdir(), 'micropython-lib-temp');
    const zipPath = path.join(os.tmpdir(), 'micropython-lib.zip');
    
    try {
        // Clean up previous temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        
        // Optionally clean up lib directory
        if (cleanLib && fs.existsSync(libPath)) {
            fs.rmSync(libPath, { recursive: true, force: true });
        }
        
        // Get the package index
        console.log('\nLoading package index...');
        let packageIndex: PackageIndex;
        
        if (useLocalIndex) {
            const localIndexPath = path.join(rootPath, LOCAL_INDEX_PATH);
            packageIndex = loadPackageIndexFromFile(localIndexPath);
            console.log(`Loaded ${packageIndex.packages.length} packages from local file`);
        } else {
            packageIndex = await downloadPackageIndex();
            console.log(`Downloaded ${packageIndex.packages.length} packages from index`);
        }
        
        // Download the micropython-lib repository
        console.log('\nDownloading micropython-lib repository...');
        await downloadMicropythonLibZip(zipPath);
        
        // Install the package and its dependencies
        console.log(`\nInstalling ${packageName} and its dependencies...\n`);
        const processedPackages = new Set<string>();
        await installPackageWithDependencies(
            packageName,
            packageIndex,
            libPath,
            zipPath,
            tempDir,
            processedPackages,
            0
        );
        
        console.log('\n=== Installation Complete ===');
        console.log(`Processed packages: ${Array.from(processedPackages).join(', ')}`);
        console.log(`\nFiles in ${libPath}:`);
        
        if (fs.existsSync(libPath)) {
            listDirRecursive(libPath, '');
        }
        
        // Clean up
        console.log('\nCleaning up temporary files...');
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        if (fs.existsSync(zipPath)) {
            fs.unlinkSync(zipPath);
        }
        
    } catch (error) {
        console.error('Error during installation:', error);
        throw error;
    }
}

/**
 * Helper function to list directory contents recursively
 */
function listDirRecursive(dir: string, indent: string): void {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
            console.log(`${indent}📁 ${item}/`);
            listDirRecursive(itemPath, indent + '  ');
        } else {
            console.log(`${indent}📄 ${item}`);
        }
    }
}
