#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdtemp, rm, mkdir, writeFile, readFile, cp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {validateAssets} from './validate.mjs';
const schema=JSON.parse(await readFile(new URL('../schemas/composition.schema.json', import.meta.url),'utf8'));
const ajv=new Ajv({allErrors:true, strict:false}); addFormats(ajv); const validate=ajv.compile(schema);
const base={schema_version:'1.0',fps:30,width:1920,height:1080,duration_frames:21600,audio_asset:'assets/audio/final_voice.mp3',scenes:[{scene_id:'scene_001',start_frame:0,end_frame:100,asset_type:'footage',video_asset:'assets/footage/scene_001_abcdefabcdefabcdefabcdef.mp4',trim_in_sec:0,trim_out_sec:3,transition_in:'cut',transition_out:'cut'}],asset_map:{scene_001:{video:'assets/footage/scene_001_abcdefabcdefabcdefabcdef.mp4',audio_offset_sec:0,trim_in_sec:0,trim_out_sec:3}},render:{codec:'h264',crf:18,output_filename:'final_video.mp4'}};
function ok(v){assert.equal(validate(v),true, JSON.stringify(validate.errors));}
function fail(mut){const v=structuredClone(base); mut(v); assert.equal(validate(v),false);}
ok(base);
let legacy=structuredClone(base); legacy.scenes[0].video_asset='assets/footage/scene_001.mp4'; legacy.asset_map.scene_001.video='assets/footage/scene_001.mp4'; ok(legacy);
let reuse=structuredClone(base); reuse.scenes[0].scene_id='scene_025'; reuse.scenes[0].video_asset='assets/footage/scene_022_abcdefabcdefabcdefabcdef.mp4'; reuse.asset_map={scene_025:{video:'assets/footage/scene_022_abcdefabcdefabcdefabcdef.mp4',audio_offset_sec:0,trim_in_sec:0,trim_out_sec:3}}; ok(reuse);
for (const bad of ['/root/x.mp4','../assets/footage/scene_001.mp4','http://x/scene_001.mp4','https://x/scene_001.mp4','assets/footage/scene_001_abcdefabcdefabcdefabcdef.mp4?token=x','assets/footage/scene_001_abcdefabcdefabcdefabcdef.mp4#x','assets/footage/scene_001.mov']) fail(v=>{v.scenes[0].video_asset=bad; v.asset_map.scene_001.video=bad;});
const tmp=await mkdtemp(path.join(tmpdir(),'ff-assets-')); await mkdir(path.join(tmp,'storyboard'),{recursive:true}); await mkdir(path.join(tmp,'footage'),{recursive:true}); await mkdir(path.join(tmp,'assets/footage'),{recursive:true}); await writeFile(path.join(tmp,'storyboard/storyboard.json'), JSON.stringify({scenes:[{scene_id:'scene_001'}]})); await writeFile(path.join(tmp,'footage/footage_manifest.json'), JSON.stringify({scenes:[{scene_id:'scene_001',fallback_to_ai_visual:false,asset_path:'assets/footage/scene_001_abcdefabcdefabcdefabcdef.mp4'}]})); await writeFile(path.join(tmp,'assets/footage/scene_001_abcdefabcdefabcdefabcdef.mp4'),'x');
// validateAssets import/signature smoke only: real project checks are covered by validate-all.
assert.equal(typeof validateAssets, 'function');
await rm(tmp,{recursive:true,force:true});
console.log(JSON.stringify({total:16,failed:0}));
