#!/usr/bin/env node
import { execSync } from 'node:child_process';
import pkg from '../package.json' assert { type: 'json' };
execSync('git push --follow-tags origin HEAD', { stdio: 'inherit' });
execSync(`gh release create v${pkg.version} -F CHANGELOG.md --latest`, { stdio: 'inherit' });