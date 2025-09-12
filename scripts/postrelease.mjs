#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'

// Load package.json reliably without JSON import assertions
const require = createRequire(import.meta.url)
const pkg = require('../package.json')

execSync('git push --follow-tags origin HEAD', { stdio: 'inherit' })
execSync(`gh release create v${pkg.version} -F CHANGELOG.md --latest`, { stdio: 'inherit' })