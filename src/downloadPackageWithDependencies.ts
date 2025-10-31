/** @module:downloadPackageWithDependencies */

import * as axios from 'axios';
import * as zl from 'zip-lib';
import * as fs from 'fs';
import * as path from 'path';
import { getMatchingDist } from './getMatchingDist.js';

// function to return url of pypi json for package
function getPyPiPackageJsonUrl(packageName: string): string {
    return `https://pypi.org/pypi/${packageName}/json`;
}

// pass in full url to pypi json and destination file path
async function getPyPiStubsJson(url: string, dest: string) {
    try {
        const response = await axios.default({
            method: 'get',
            url: url,
            responseType: 'json'
        }).then((response) => {
            fs.writeFileSync(dest, JSON.stringify(response.data), {
                encoding: "utf8",
            });
            console.log("json file downloaded: ", dest);
        });
    } catch (error) {
        console.error("Error downloading PyPi stubs JSON:", error);
        throw error;
    }
    return 'done';
}

// pass in release prefix, json file path, and destination directory for the wheel download
async function downloadLatestStubWheel(release: string,versionSpec:string ,jsonfile: string, destdir: string): Promise<[wheelPath: string, fullRelease: string]> {
    try {
        const jsonContent = fs.readFileSync(jsonfile, 'utf8');
        const jsonData = JSON.parse(jsonContent);
        const releases = jsonData.releases;
        const wheelFiles: string[] = [];
        // ** use the version spec to find the matching release, if specified
        // need to find the last release with the release prefix in the parameter
        let targetRelease: string | null = null;
        let availReleases: string[] = Object.keys(releases);
        let targetReleaseVersion: string | undefined;
        if (versionSpec && versionSpec.length > 0) {
            targetReleaseVersion = getMatchingDist(availReleases, versionSpec);
            if (!targetReleaseVersion) {
                throw new Error(`No matching release found for version spec '${versionSpec}'`);
            }
            targetRelease = targetReleaseVersion;
        } else {
            targetRelease=release;
        }
        for (const rel in releases) {
            if (rel.startsWith(release)) {
                targetRelease = rel;
            }
        }
        if (!targetRelease) {
            throw new Error(`No release found starting with ${release}`);
        }
        const files = releases[targetRelease];
        for (const file of files) {
            if (file.filename.endsWith('.whl')) {
                wheelFiles.push(file.url);
            }
        }
        if (wheelFiles.length === 0) {
            throw new Error(`No wheel files found for release ${targetRelease}`);
        }
        // Download the first wheel file (or implement logic to choose the correct one)
        const wheelUrl = wheelFiles[0];
        const wheelDest = path.join(destdir, path.basename(wheelUrl));
        const writer = fs.createWriteStream(wheelDest);
        const response = await axios.default({
            method: 'get',
            url: wheelUrl,
            responseType: 'stream'
        });
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log(`Downloaded wheel to ${wheelDest}`);
                resolve([wheelDest, targetRelease!]);
            });
            writer.on('error', reject);
        });
    } catch (error) {
        console.error("Error reading or parsing JSON file:", error);
        throw error;
    }
}

// try to find any required distributions in the METADATA file of the downloaded wheel
// return is typically in the form '<package> (<version spec>)'
async function findRequiredDistributions(extractedWheelPath: string, fullRelease: string): Promise<string[]> {
    //find the dist-info directory that has the full release name
    const distInfoDir = fs.readdirSync(extractedWheelPath).find(dir => dir.endsWith(fullRelease + '.dist-info'));
    if (!distInfoDir) {
        console.warn(`No dist-info directory found for release ${fullRelease}`);
        return [];
    }
    try {
        const metadataPath = path.join(extractedWheelPath, distInfoDir, 'METADATA');
        if (!fs.existsSync(metadataPath)) {
            console.warn(`METADATA file not found in ${distInfoDir}`);
            return [];
        }

        const metadataContent = fs.readFileSync(metadataPath, 'utf8');
        const requiresDistLines = metadataContent.split('\n').filter(line => line.startsWith('Requires-Dist:'));
        const requiredDistributions = requiresDistLines.map(line => line.replace('Requires-Dist:', '').trim());
        return requiredDistributions;
    } catch (err) {
        console.error("Error extracting wheel or reading METADATA:", err);
        return [];
    }
}


// Interface to track processed packages and avoid infinite loops
export interface ProcessedPackage {
    name: string;
    version: string;
    path: string;
}

// Recursive function to download and process a package and all its dependencies
export async function downloadPackageWithDependencies(
    packageName: string,
    versionSpec: string,
    targetRelease: string,
    rootPath: string,
    mainExtractPath: string,
    processedPackages: Map<string, ProcessedPackage> = new Map(),
    depth: number = 0
): Promise<void> {
    const maxDepth = 10; // Prevent infinite recursion
    if (depth > maxDepth) {
        console.warn(`Maximum dependency depth reached for ${packageName} at depth ${depth}`);
        return;
    }

    // Check if we've already processed this package
    if (processedPackages.has(packageName)) {
        console.log(`Package ${packageName} already processed, skipping...`);
        return;
    }

    const indent = '  '.repeat(depth);
    console.log(`${indent}Processing package: ${packageName} (depth: ${depth})`);

    try {
        // Download package JSON
        const pkgUrl = getPyPiPackageJsonUrl(packageName);
        const destpath_pkg = path.join(rootPath, 'stubs', `${packageName}.json`);
        await getPyPiStubsJson(pkgUrl, destpath_pkg);

        // Download package wheel
        const [wheelPath_pkg, fullRelease_pkg] = await downloadLatestStubWheel(targetRelease, versionSpec, destpath_pkg, path.join(rootPath, 'stubs'));

        // Create temporary extraction directory
        const tempExtractPath = path.join(rootPath, 'stubs', `${packageName}_temp`);
        if (!fs.existsSync(tempExtractPath)) {
            fs.mkdirSync(tempExtractPath, { recursive: true });
        }

        // Extract the wheel
        try {
            const unzip = new zl.Unzip({
                overwrite: true
            });
            await unzip.extract(wheelPath_pkg, tempExtractPath);
            console.log(`${indent}Extracted ${packageName} wheel to ${tempExtractPath}`);
        } catch (err) {
            console.error(`${indent}Error extracting wheel for ${packageName}:`, err);
            return;
        }

        // Mark this package as processed before processing dependencies
        processedPackages.set(packageName, {
            name: packageName,
            version: fullRelease_pkg,
            path: tempExtractPath
        });

        // Find required distributions for this package
        const requiredDists = await findRequiredDistributions(tempExtractPath, fullRelease_pkg);
        console.log(`${indent}Required distributions for ${packageName}:`, requiredDists);

        // Recursively process each dependency
        for (const dist of requiredDists) {
            const distSpec = dist.split(' ');
            const depPackageName = distSpec[0].trim(); // get package name before any version specifiers
            let versionSpec = '';
            if(distSpec.length > 1) {
                versionSpec = distSpec.slice(1).join(' ').trim();
            }

            console.log(`${indent}Found dependency: ${depPackageName}`);

            // Recursively download and process this dependency
            await downloadPackageWithDependencies(
                depPackageName,
                versionSpec,
                targetRelease,
                rootPath,
                mainExtractPath,
                processedPackages,
                depth + 1
            );
        }

        // Copy the extracted files into the main stubs directory
        try {
            fs.cpSync(tempExtractPath, mainExtractPath, {
                recursive: true,
                force: true
            });
            console.log(`${indent}Copied files from ${packageName} to main stubs directory`);
        } catch (err) {
            console.error(`${indent}Error copying ${packageName} files:`, err);
            return;
        }

        // Clean up temporary extraction directory
        try {
            fs.rmSync(tempExtractPath, { recursive: true, force: true });
            console.log(`${indent}Cleaned up temporary directory for ${packageName}`);
        } catch (err) {
            console.warn(`${indent}Warning: Could not clean up temporary directory for ${packageName}:`, err);
        }

    } catch (error) {
        console.error(`${indent}Error processing package ${packageName}:`, error);
    }
}
