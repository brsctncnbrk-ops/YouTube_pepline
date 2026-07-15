#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
export const ENV_NAME = "FACTFORGE_REMOTION_BROWSER_EXECUTABLE";
export const PINNED_ROOT = "/opt/factforge/remotion-browsers";
export const REQUIRED_VERSION = "149.0.7790.0";
function sha256(file){const h=crypto.createHash('sha256'); h.update(fs.readFileSync(file)); return h.digest('hex');}
function isSubPath(child,parent){const rel=path.relative(parent,child); return rel && !rel.startsWith('..') && !path.isAbsolute(rel);}
function findManifest(exe){let d=path.dirname(fs.realpathSync(exe)); const root=fs.realpathSync(PINNED_ROOT); for(;;){const m=path.join(d,'browser-manifest.json'); if(fs.existsSync(m)) return m; if(d===root || !isSubPath(d,root)) break; d=path.dirname(d);} throw new Error('BROWSER_MANIFEST_NOT_FOUND');}
export function validateBrowserExecutable(value=process.env[ENV_NAME]){
 if(!value) throw new Error(`${ENV_NAME}_MISSING`);
 if(!path.isAbsolute(value)) throw new Error('BROWSER_EXECUTABLE_NOT_ABSOLUTE');
 const real=fs.realpathSync(value); const root=fs.realpathSync(PINNED_ROOT);
 if(!isSubPath(real,root)) throw new Error('BROWSER_EXECUTABLE_OUTSIDE_PINNED_ROOT');
 const st=fs.statSync(real); if(!st.isFile()) throw new Error('BROWSER_EXECUTABLE_NOT_FILE');
 if(st.uid!==0) throw new Error('BROWSER_EXECUTABLE_NOT_ROOT_OWNED');
 if((st.mode & 0o022)!==0) throw new Error('BROWSER_EXECUTABLE_WRITABLE_BY_GROUP_OR_OTHER');
 if((st.mode & 0o111)===0) throw new Error('BROWSER_EXECUTABLE_NOT_EXECUTABLE');
 const manifestPath=findManifest(real); const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 if(manifest.version!==REQUIRED_VERSION) throw new Error('BROWSER_MANIFEST_VERSION_MISMATCH');
 if(manifest.executable_sha256!==sha256(real)) throw new Error('BROWSER_EXECUTABLE_SHA_MISMATCH');
 const version=execFileSync(real,['--version'],{encoding:'utf8',timeout:10000});
 if(!version.includes(REQUIRED_VERSION)) throw new Error('BROWSER_EXECUTABLE_VERSION_MISMATCH');
 return {executable:real, manifestPath, manifest, version: version.trim()};
}
export function assertCliMatchesEnv(cliValue){const env=process.env[ENV_NAME]; if(cliValue && env && fs.realpathSync(cliValue)!==fs.realpathSync(env)) throw new Error('BROWSER_CONFIG_CLI_MISMATCH'); return true;}
function resolved(p){return fs.existsSync(p)?fs.realpathSync(p):path.resolve(p);}
export function assertBundleOutputSafe({publicDir, outputDir, sourceRoot}){
 const pub=resolved(publicDir); const out=path.resolve(outputDir); const src=resolved(sourceRoot);
 if(out===pub) throw new Error('BUNDLE_OUTPUT_EQUALS_PUBLIC_DIR');
 if(isSubPath(out,pub)) throw new Error('BUNDLE_OUTPUT_DESCENDANT_OF_PUBLIC_DIR');
 if(isSubPath(pub,out)) throw new Error('PUBLIC_DIR_DESCENDANT_OF_BUNDLE_OUTPUT');
 if(out===src || isSubPath(out,src)) throw new Error('BUNDLE_OUTPUT_INSIDE_SOURCE_TREE');
 return {publicDir:pub, outputDir:out, sourceRoot:src};
}
function main(){const [cmd,...args]=process.argv.slice(2); try{
 if(cmd==='validate-browser'){console.log(JSON.stringify({ok:true,...validateBrowserExecutable()},null,2)); return;}
 if(cmd==='check-cli-config'){const i=args.indexOf('--browser-executable'); const val=i===-1?null:args[i+1]; assertCliMatchesEnv(val); console.log(JSON.stringify({ok:true})); return;}
 if(cmd==='validate-bundle-output'){const get=(n)=>args[args.indexOf(n)+1]; console.log(JSON.stringify({ok:true,...assertBundleOutputSafe({publicDir:get('--public-dir'),outputDir:get('--output-dir'),sourceRoot:get('--source-root')})},null,2)); return;}
 if(cmd==='run-compositions'){const info=validateBrowserExecutable(); const entry=args[0]||'src/index.ts'; const r=spawnSync('./node_modules/.bin/remotion',['compositions',entry,'--browser-executable',info.executable],{stdio:'inherit',encoding:'utf8'}); process.exitCode=r.status??1; return;}
 if(cmd==='run-bundle'){const info=validateBrowserExecutable(); const entry=args[0]||'src/index.ts'; const out=args[1]; if(!out) throw new Error('BUNDLE_OUTPUT_REQUIRED'); const publicDir=path.resolve('../../'); assertBundleOutputSafe({publicDir,outputDir:out,sourceRoot:process.cwd()}); const r=spawnSync('./node_modules/.bin/remotion',['bundle',entry,'--out-dir',out,'--browser-executable',info.executable],{stdio:'inherit',encoding:'utf8'}); process.exitCode=r.status??1; return;}
 throw new Error('UNKNOWN_COMMAND');
 }catch(e){console.error(e.message); process.exitCode=1;}}
if(process.argv[1]===fileURLToPath(import.meta.url)) main();
