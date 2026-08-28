import { spawnSync } from 'node:child_process';
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    utimesSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const scriptPath = fileURLToPath(
    new URL('../scripts/package-safari.sh', import.meta.url),
);
const temporaryDirectories: string[] = [];

function write(path: string, content: string, executable = false) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, { mode: executable ? 0o755 : 0o644 });
}

function setupPackaging() {
    const directory = mkdtempSync(join(tmpdir(), 'redhn-safari-packaging-'));
    temporaryDirectories.push(directory);
    const bin = join(directory, 'bin');
    const projectLocation = join(directory, 'Xcode projects');
    const appName = 'RedHN Test';
    const appDirectory = join(projectLocation, appName);
    const projectFile = join(
        appDirectory,
        `${appName}.xcodeproj/project.pbxproj`,
    );
    const resources = join(appDirectory, 'Shared (Extension)/Resources');
    const packagerLog = join(directory, 'packager.json');

    // Stub only the external build and Apple generator. The shell script and
    // resource synchronization run for real in a disposable project.
    write(
        join(bin, 'npm'),
        `#!/usr/bin/env node
const { mkdirSync, utimesSync, writeFileSync } = require('node:fs');
if (process.env.BUILD_MODE === 'fail') process.exit(7);
mkdirSync('.output/safari-mv3/content-scripts', { recursive: true });
if (process.env.BUILD_MODE !== 'missing-manifest') {
    writeFileSync('.output/safari-mv3/manifest.json', '{"version":"2.0.0"}');
}
writeFileSync('.output/safari-mv3/content-scripts/redhn.js', 'new extension code');
utimesSync('.output/safari-mv3/content-scripts/redhn.js', 1700000000, 1700000000);
`,
        true,
    );
    write(
        join(bin, 'xcrun'),
        `#!/usr/bin/env node
const { cpSync, existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const args = process.argv.slice(2);
if (args[0] === '--find') process.exit(0);
writeFileSync(process.env.PACKAGER_LOG, JSON.stringify(args));
const option = name => args[args.indexOf(name) + 1];
const appName = option('--app-name');
const appDirectory = join(option('--project-location'), appName);
if (existsSync(appDirectory) && !args.includes('--force')) process.exit(9);
const project = join(appDirectory, appName + '.xcodeproj');
mkdirSync(project, { recursive: true });
writeFileSync(join(project, 'project.pbxproj'), 'generated default settings');
cpSync(args[1], join(appDirectory, 'Shared (Extension)/Resources'), { recursive: true });
`,
        true,
    );

    function createExistingProject() {
        const nativeFiles = new Map([
            [
                projectFile,
                'DEVELOPMENT_TEAM = TESTTEAM; MARKETING_VERSION = 9.8.7; CURRENT_PROJECT_VERSION = 42;',
            ],
            [
                join(appDirectory, 'iOS (App)/Info.plist'),
                'custom app configuration',
            ],
            [
                join(appDirectory, 'Shared (App)/Resources/Style.css'),
                'custom onboarding styles',
            ],
            [
                join(
                    appDirectory,
                    'Shared (Extension)/SafariWebExtensionHandler.swift',
                ),
                'custom native handler',
            ],
            [
                join(appDirectory, 'macOS (Extension)/RedHN.entitlements'),
                'custom entitlements',
            ],
        ]);
        nativeFiles.forEach((content, path) => write(path, content));
        write(join(resources, 'manifest.json'), '{"version":"1.0.0"}');
        write(
            join(resources, 'content-scripts/redhn.js'),
            'old extension code',
        );
        // Equal size and mtime must not hide changed contents from the sync.
        utimesSync(
            join(resources, 'content-scripts/redhn.js'),
            1700000000,
            1700000000,
        );
        write(join(resources, 'content-scripts/obsolete.js'), 'obsolete chunk');
        return nativeFiles;
    }

    function run(args: string[] = [], buildMode = '') {
        return spawnSync('bash', [scriptPath, ...args], {
            cwd: directory,
            encoding: 'utf8',
            env: {
                ...process.env,
                PATH: `${bin}:${process.env.PATH}`,
                SAFARI_PROJECT_LOCATION: projectLocation,
                SAFARI_APP_NAME: appName,
                SAFARI_BUNDLE_ID: 'com.example.redhn.test',
                PACKAGER_LOG: packagerLog,
                BUILD_MODE: buildMode,
            },
        });
    }

    return { createExistingProject, packagerLog, projectFile, resources, run };
}

afterEach(() => {
    temporaryDirectories.splice(0).forEach((directory) => {
        rmSync(directory, { recursive: true, force: true });
    });
});

describe('Safari packaging', () => {
    it('updates generated resources without changing any native customizations', () => {
        const fixture = setupPackaging();
        const nativeFiles = fixture.createExistingProject();
        const result = fixture.run();

        expect(result.status, result.stderr).toBe(0);
        nativeFiles.forEach((content, path) => {
            expect(readFileSync(path, 'utf8')).toBe(content);
        });
        expect(
            readFileSync(
                join(fixture.resources, 'content-scripts/redhn.js'),
                'utf8',
            ),
        ).toBe('new extension code');
        expect(
            existsSync(join(fixture.resources, 'content-scripts/obsolete.js')),
        ).toBe(false);
        expect(existsSync(fixture.packagerLog)).toBe(false);
    });

    it('creates a missing Xcode project without requesting an overwrite', () => {
        const fixture = setupPackaging();
        const result = fixture.run();

        expect(result.status, result.stderr).toBe(0);
        expect(readFileSync(fixture.projectFile, 'utf8')).toBe(
            'generated default settings',
        );
        expect(existsSync(join(fixture.resources, 'manifest.json'))).toBe(true);
        const args: string[] = JSON.parse(
            readFileSync(fixture.packagerLog, 'utf8'),
        );
        expect(args).not.toContain('--force');
        expect(args).toContain('com.example.redhn.test');
    });

    it('regenerates an existing project only with the explicit option', () => {
        const fixture = setupPackaging();
        fixture.createExistingProject();
        const result = fixture.run(['--regenerate']);

        expect(result.status, result.stderr).toBe(0);
        expect(readFileSync(fixture.projectFile, 'utf8')).toBe(
            'generated default settings',
        );
        expect(JSON.parse(readFileSync(fixture.packagerLog, 'utf8'))).toContain(
            '--force',
        );
    });

    it.each([
        { buildMode: 'fail', args: [] },
        { buildMode: 'fail', args: ['--regenerate'] },
        { buildMode: 'missing-manifest', args: [] },
    ])(
        'leaves Xcode untouched after $buildMode with $args',
        ({ buildMode, args }) => {
            const fixture = setupPackaging();
            const nativeFiles = fixture.createExistingProject();
            const result = fixture.run(args, buildMode);

            expect(result.status).not.toBe(0);
            nativeFiles.forEach((content, path) => {
                expect(readFileSync(path, 'utf8')).toBe(content);
            });
            expect(
                readFileSync(
                    join(fixture.resources, 'content-scripts/redhn.js'),
                    'utf8',
                ),
            ).toBe('old extension code');
            expect(existsSync(fixture.packagerLog)).toBe(false);
        },
    );

    it.each(['project', 'resources'])(
        'refuses to recreate an unexpected %s layout',
        (missing) => {
            const fixture = setupPackaging();
            fixture.createExistingProject();
            rmSync(
                missing === 'project'
                    ? fixture.projectFile
                    : join(fixture.resources, 'manifest.json'),
            );
            const result = fixture.run();

            expect(result.status).not.toBe(0);
            expect(
                readFileSync(
                    join(fixture.resources, 'content-scripts/redhn.js'),
                    'utf8',
                ),
            ).toBe('old extension code');
            expect(existsSync(fixture.packagerLog)).toBe(false);
        },
    );
});
