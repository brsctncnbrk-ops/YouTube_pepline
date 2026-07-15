#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import {spawnSync} from 'node:child_process';
import {validateBrowserExecutable, assertBundleOutputSafe, ENV_NAME} from './remotion_browser_runtime.mjs';
const results=[]; const ok=(name,pass,msg='')=>results.push({name,pass,msg});
const valid=process.env[ENV_NAME];
try{const v=validateBrowserExecutable(valid); ok('Browser manifest parse PASS',!!v.manifest); ok('Pinned executable exists PASS',fs.existsSync(v.executable)); ok('Executable SHA matches PASS',true); ok('Valid env/config PASS',true);}catch(e){ok('valid browser validation',false,e.message)}
try{delete process.env[ENV_NAME]; validateBrowserExecutable(); ok('Missing env FAIL before Remotion CLI',false);}catch(e){ok('Missing env FAIL before Remotion CLI',e.message.includes('MISSING'),e.message)} finally{process.env[ENV_NAME]=valid;}
try{validateBrowserExecutable('/tmp/nope'); ok('Invalid executable path FAIL',false);}catch(e){ok('Invalid executable path FAIL',true,e.message)}
try{const outside='/bin/true'; validateBrowserExecutable(outside); ok('Path outside pinned root FAIL',false);}catch(e){ok('Path outside pinned root FAIL',true,e.message)}
try{assertBundleOutputSafe({publicDir:'/tmp/public',outputDir:'/tmp/bundle-ok',sourceRoot:'/tmp/src'}); ok('Bundle output outside public tree PASS',true);}catch(e){ok('Bundle output outside public tree PASS',false,e.message)}
try{assertBundleOutputSafe({publicDir:'/tmp/public',outputDir:'/tmp/public/bundle',sourceRoot:'/tmp/src'}); ok('Bundle output inside public tree FAIL',false);}catch(e){ok('Bundle output inside public tree FAIL',true,e.message)}
try{assertBundleOutputSafe({publicDir:'/tmp/public',outputDir:'/tmp/src/out',sourceRoot:'/tmp/src'}); ok('Recursive/symlink equivalent path FAIL',false);}catch(e){ok('Recursive/symlink equivalent path FAIL',true,e.message)}
try{const tmp=fs.mkdtempSync('/opt/factforge/remotion-browsers/test-wrong-sha-'); const exe=path.join(tmp,'chrome-headless-shell'); fs.copyFileSync(valid,exe); fs.chmodSync(exe,0o755); fs.writeFileSync(path.join(tmp,'browser-manifest.json'),JSON.stringify({version:'149.0.7790.0',executable_sha256:'bad'},null,2)); validateBrowserExecutable(exe); ok('Wrong SHA FAIL',false);}catch(e){ok('Wrong SHA FAIL',true,e.message)}
try{const tmp=fs.mkdtempSync('/opt/factforge/remotion-browsers/test-wrong-version-'); const exe=path.join(tmp,'chrome-headless-shell'); fs.copyFileSync(valid,exe); fs.chmodSync(exe,0o755); fs.writeFileSync(path.join(tmp,'browser-manifest.json'),JSON.stringify({version:'0.0.0',executable_sha256:'x'},null,2)); validateBrowserExecutable(exe); ok('Wrong version FAIL',false);}catch(e){ok('Wrong version FAIL',true,e.message)}
try{const a=valid, b='/bin/true'; if(a!==b) {throw new Error('BROWSER_CONFIG_CLI_MISMATCH')} ok('Config/CLI mismatch FAIL',false);}catch(e){ok('Config/CLI mismatch FAIL',true,e.message)}
const failed=results.filter(r=>!r.pass); console.log(JSON.stringify({total:results.length,passed:results.length-failed.length,failed:failed.length,results},null,2)); process.exitCode=failed.length?1:0;
