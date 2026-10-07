// PKG layout based on notscuffed/RePKG (MIT); only read data, never run scene scripts.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const PNG=Buffer.from('89504e470d0a1a0a','hex');
const JPEG=Buffer.from('ffd8ff','hex');
const MAX=64*1024*1024;
const safeName=name=>typeof name==='string'&&!name.includes('\\')&&!name.startsWith('/')&&!name.includes(':')&&!name.split('/').includes('..');

export function embeddedOriginal(bytes){
 const png=bytes.indexOf(PNG);
 if(png>=0){
  let offset=png+8;
  while(offset+12<=bytes.length){
   const length=bytes.readUInt32BE(offset);if(length>MAX||offset+length+12>bytes.length)break;
   const type=bytes.toString('ascii',offset+4,offset+8);offset+=length+12;
   if(type==='IEND')return {bytes:bytes.subarray(png,offset),mime:'image/png',extension:'.png',width:bytes.readUInt32BE(png+16),height:bytes.readUInt32BE(png+20)};
  }
 }
 const jpeg=bytes.indexOf(JPEG);
 if(jpeg>=0){
  let offset=jpeg+2,width=0,height=0;
  while(offset+4<bytes.length){
   if(bytes[offset]!==255)break;
   const marker=bytes[offset+1];offset+=2;
   if(marker===0xda)break;
   if(marker===0xd8||marker===0xd9||marker===0x01||marker>=0xd0&&marker<=0xd7)continue;
   const length=bytes.readUInt16BE(offset);if(length<2||offset+length>bytes.length)break;
   if([0xc0,0xc1,0xc2].includes(marker)&&length>=7){height=bytes.readUInt16BE(offset+3);width=bytes.readUInt16BE(offset+5);}
   offset+=length;
  }
  const end=bytes.indexOf(Buffer.from('ffd9','hex'),offset);
  if(width&&height&&end>=0)return {bytes:bytes.subarray(jpeg,end+2),mime:'image/jpeg',extension:'.jpg',width,height};
 }
 return null;
}

async function openPackage(file){
 const handle=await fs.open(file,'r');
 try{
  const stat=await handle.stat();if(stat.size>1024**3)throw new Error('Package too large');
  const header=Buffer.alloc(Math.min(stat.size,16*1024*1024));await handle.read(header,0,header.length,0);
  let cursor=0;
  const integer=()=>{if(cursor+4>header.length)throw new Error('Truncated package');const n=header.readInt32LE(cursor);cursor+=4;return n;};
  const string=max=>{const n=integer();if(n<1||n>max||cursor+n>header.length)throw new Error('Invalid package string');const s=header.toString('utf8',cursor,cursor+n);cursor+=n;return s;};
  if(!/^PKGV\d{4}$/.test(string(32)))throw new Error('Unsupported package');
  const count=integer();if(count<1||count>40000)throw new Error('Invalid entry count');
  const entries=new Map();
  for(let n=0;n<count;n++){
   const name=string(255),offset=integer(),length=integer();
   if(!safeName(name)||offset<0||length<0)throw new Error('Unsafe package entry');
   entries.set(name.toLowerCase(),{offset,length});
  }
  const dataStart=cursor;
  for(const entry of entries.values())if(dataStart+entry.offset+entry.length>stat.size)throw new Error('Invalid entry bounds');
  const read=async(name,limit=MAX)=>{
   if(!safeName(name))return null;
   const entry=entries.get(name.toLowerCase());if(!entry||entry.length>limit)return null;
   const bytes=Buffer.alloc(entry.length);const result=await handle.read(bytes,0,bytes.length,dataStart+entry.offset);
   if(result.bytesRead!==bytes.length)throw new Error('Truncated entry');return bytes;
  };
  const json=async name=>{const b=await read(name,4*1024*1024);if(!b)return null;try{return JSON.parse(b.toString('utf8').replace(/^\uFEFF/,''));}catch{return null;}};
  return {read,json,close:()=>handle.close()};
 }catch(error){await handle.close();throw error;}
}

const vector=(value,fallback=[])=>typeof value==='string'?value.trim().split(/\s+/).map(Number):fallback;
export async function extractSceneOriginal(file){
 const pkg=await openPackage(file);
 try{
  const scene=await pkg.json('scene.json');if(!Array.isArray(scene?.objects))return null;
  const images=scene.objects.filter(layer=>typeof layer.image==='string'&&layer.visible!==false&&layer.visible?.value!==false);
  const canvas=scene.general?.orthogonalprojection;
  const candidates=new Map();
  const meaningfulTextures=new Set();
  for(const layer of images){
   if(typeof layer.image!=='string'||!safeName(layer.image))continue;
   const model=await pkg.json(layer.image);if(!model?.material||model?.skin||model?.skeleton)continue;
   const material=await pkg.json(model.material);const pass=material?.passes?.[0];
   if(!pass||!/^genericimage\d*$/.test(pass.shader||'')||pass.textures?.length!==1||typeof pass.textures[0]!=='string')continue;
   const texture=pass.textures[0].startsWith('materials/')?pass.textures[0]:'materials/'+pass.textures[0];
   const bytes=await pkg.read(texture.endsWith('.tex')?texture:texture+'.tex');if(!bytes)continue;
   const original=embeddedOriginal(bytes);
   if(!original||original.width<1024||original.height<600||original.bytes.length>MAX)continue;
   const origin=vector(layer.origin);
   if(images.length===1||!canvas||origin.length<2||origin[0]>=0&&origin[0]<=canvas.width&&origin[1]>=0&&origin[1]<=canvas.height)
    meaningfulTextures.add(crypto.createHash('sha256').update(original.bytes).digest('hex'));
   if(images.length>1){
    const size=vector(layer.size),scale=vector(layer.scale,[1,1,1]),angles=vector(layer.angles,[0,0,0]);
    if(!canvas?.width||!canvas.height||size.length<2||origin.length<2||angles.some(v=>Math.abs(v)>.01))continue;
    if(Math.abs(size[0]*(scale[0]||1)/canvas.width-1)>.025||Math.abs(size[1]*(scale[1]||1)/canvas.height-1)>.025||Math.abs(origin[0]/canvas.width-.5)>.025||Math.abs(origin[1]/canvas.height-.5)>.025)continue;
   }
   const digest=crypto.createHash('sha256').update(original.bytes).digest('hex');candidates.set(digest,original);
  }
  // Ambiguous composited scenes stay hidden rather than picking a random layer.
  return candidates.size===1&&meaningfulTextures.size===1?[...candidates.values()][0]:null;
 }finally{await pkg.close();}
}

export async function cachedSceneOriginal(item,cacheRoot,prepare=false){
 if(!item.packagePath||!/^\d+$/.test(item.id))return null;
 const fingerprint=crypto.createHash('sha256').update(`${item.packageSize}:${item.packageMtime}`).digest('hex').slice(0,20);
 const key=item.id+'-'+fingerprint,metadataPath=path.join(cacheRoot,key+'.json');
 const metadata=await fs.readFile(metadataPath,'utf8').then(JSON.parse).catch(()=>null);
 if(metadata){
  if(!metadata.extension)return null;
  if(!['.png','.jpg'].includes(metadata.extension))return null;
  const file=path.join(cacheRoot,key+metadata.extension);
  if((await fs.stat(file).catch(()=>null))?.size===metadata.size)return {file,width:metadata.width,height:metadata.height};
 }
 if(!prepare)return null;
 await fs.mkdir(cacheRoot,{recursive:true});
 let original=null;try{original=await extractSceneOriginal(item.packagePath);}catch{}
 if(!original){await fs.writeFile(metadataPath,JSON.stringify({unsupported:true}));return null;}
 const file=path.join(cacheRoot,key+original.extension);
 await fs.writeFile(file,original.bytes);
 await fs.writeFile(metadataPath,JSON.stringify({extension:original.extension,width:original.width,height:original.height,size:original.bytes.length}));
 return {file,width:original.width,height:original.height};
}
