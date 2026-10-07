import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {embeddedOriginal,extractSceneOriginal,cachedSceneOriginal} from './workshop-originals.mjs';
const integer=value=>{const b=Buffer.alloc(4);b.writeInt32LE(value);return b;};
const text=value=>Buffer.concat([integer(Buffer.byteLength(value)),Buffer.from(value)]);
const png=(width,height)=>{
 const b=Buffer.alloc(45);Buffer.from('89504e470d0a1a0a','hex').copy(b);b.writeUInt32BE(13,8);b.write('IHDR',12);b.writeUInt32BE(width,16);b.writeUInt32BE(height,20);b.write('IEND',37);return b;
};
const pkg=entries=>{
 let offset=0;const table=[],data=[];
 for(const[name,value]of Object.entries(entries)){const b=Buffer.isBuffer(value)?value:Buffer.from(JSON.stringify(value));table.push(Buffer.concat([text(name),integer(offset),integer(b.length)]));data.push(b);offset+=b.length;}
 return Buffer.concat([text('PKGV0001'),integer(table.length),...table,...data]);
};
test('Original embedded PNG bytes and dimensions are preserved',()=>{
 const image=png(3840,2160),original=embeddedOriginal(Buffer.concat([Buffer.from('TEX HEADER'),image,Buffer.from('MIPMAPS')]));
 assert.ok(original.bytes.equals(image));assert.equal(original.width,3840);assert.equal(original.height,2160);
 assert.equal(embeddedOriginal(Buffer.from('not an original image')),null);
});
test('Scene extraction accepts one original, hides composed layers, and rejects unsafe entries',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'sakura-original-test-'));
 const file=path.join(directory,'scene.pkg');
 const layer={image:'models/base.json',size:'3840 2160',origin:'1920 1080 0'};
 const entries={'scene.json':{general:{orthogonalprojection:{width:3840,height:2160}},objects:[layer]},'models/base.json':{material:'materials/base.json'},'materials/base.json':{passes:[{shader:'genericimage4',textures:['base']}]},'materials/base.tex':Buffer.concat([Buffer.from('header'),png(3840,2160)])};
 try{
  await fs.writeFile(file,pkg(entries));assert.ok((await extractSceneOriginal(file)).bytes.equals(png(3840,2160)));
  const stat=await fs.stat(file),item={id:'123',packagePath:file,packageSize:stat.size,packageMtime:Math.floor(stat.mtimeMs)};
  assert.equal(await cachedSceneOriginal(item,directory,false),null);
  assert.ok((await cachedSceneOriginal(item,directory,true)).file.endsWith('.png'));
  assert.ok(await cachedSceneOriginal(item,directory,false));
  entries['scene.json'].objects.push({image:'models/overlay.json',size:'1536 1024',origin:'1000 1000 0'});
  entries['models/overlay.json']={material:'materials/overlay.json'};entries['materials/overlay.json']={passes:[{shader:'genericimage4',textures:['overlay']}]};entries['materials/overlay.tex']=png(1536,1024);
  await fs.writeFile(file,pkg(entries));assert.equal(await extractSceneOriginal(file),null);
  await fs.writeFile(file,pkg({'../outside.json':{}}));await assert.rejects(extractSceneOriginal(file),/Unsafe/);
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});
