import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { scanWallpapers, buildPayload } from './injector.mjs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

test('Complete wallpaper and settings payload parses without unresolved placeholders', async () => {
  const payload=await buildPayload(fileURLToPath(new URL('../assets/',import.meta.url)));
  assert.doesNotThrow(()=>new vm.Script(payload));
  assert.equal(payload.includes('__DREAM_THEME_JSON__'),false);
  assert.match(payload,/sakura-wallpaper-settings/);
});

test('Workshop media is allowlisted, deduplicated and contained within each project', async () => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'sakura-catalog-'));
  try {
    const project=path.join(root,'123');await fs.mkdir(project);
    await fs.writeFile(path.join(project,'project.json'),JSON.stringify({type:'video',file:'clip.mp4',preview:'preview.png',title:'Test'}));
    await fs.writeFile(path.join(project,'clip.mp4'),'fixture');await fs.writeFile(path.join(project,'preview.png'),'fixture');
    const valid=await scanWallpapers([root,root]);
    assert.equal(valid.length,1);assert.equal(valid[0].mode,'video');
    await fs.writeFile(path.join(root,'outside.mp4'),'outside');
    await fs.writeFile(path.join(project,'project.json'),JSON.stringify({type:'video',file:'../outside.mp4',preview:'preview.png'}));
    const escaped=await scanWallpapers([root]);assert.equal(escaped[0].media,null);assert.equal(escaped[0].mode,'preview');
    await fs.writeFile(path.join(project,'project.json'),JSON.stringify({type:'web',file:'clip.mp4',preview:'preview.png'}));
    const web=await scanWallpapers([root]);assert.equal(web[0].media,null);
    await fs.writeFile(path.join(project,'project.json'),'invalid');assert.deepEqual(await scanWallpapers([root]),[]);
    const imageProject=path.join(root,'456');await fs.mkdir(imageProject);
    await fs.writeFile(path.join(imageProject,'project.json'),JSON.stringify({type:'image',file:'SOURCE.PNG',title:'New image'}));
    await fs.writeFile(path.join(imageProject,'SOURCE.PNG'),'fixture image');
    const newlyAdded=await scanWallpapers([root]);assert.equal(newlyAdded.length,1);assert.equal(newlyAdded[0].mode,'image');assert.equal(newlyAdded[0].rawImage,await fs.realpath(path.join(imageProject,'SOURCE.PNG')));
    await fs.writeFile(path.join(imageProject,'project.json'),JSON.stringify({type:'image',file:'../../outside.png'}));
    assert.deepEqual(await scanWallpapers([root]),[]);
  } finally { await fs.rm(root,{recursive:true,force:true}); }
});
