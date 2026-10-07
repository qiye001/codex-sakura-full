import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {isThemeTarget,buildPayload} from './injector.mjs';

test('Only primary Codex windows get wallpapers and automatic startup animation',()=>{
 for(const url of ['app://-/index.html','app://-/index.html?initialRoute=%2Fthread%2Fexample'])assert.equal(isThemeTarget({type:'page',url}),true);
 for(const url of ['app://-/index.html?initialRoute=%2Favatar-overlay','app://-/detached-window.html?initialRoute=%2Fdetached-window','https://chatgpt.com/','file:///preview.html'])assert.equal(isThemeTarget({type:'page',url}),false);
 assert.equal(isThemeTarget({type:'webview',url:'app://-/index.html'}),false);
});

test('Stable payload uses cached encoding and source changes invalidate it',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'sakura-payload-'));
 try{
  const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6nXkAAAAASUVORK5CYII=','base64');
  await fs.writeFile(path.join(directory,'wallpaper.png'),image);
  await fs.writeFile(path.join(directory,'theme.json'),JSON.stringify({image:'wallpaper.png',focusX:.5}));
  const first=await buildPayload(directory),second=await buildPayload(directory);assert.equal(first,second);
  await fs.writeFile(path.join(directory,'theme.json'),JSON.stringify({image:'wallpaper.png',focusX:.25}));
  assert.notEqual(await buildPayload(directory),first);
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});

// Minimal protocol fixture, no external dependency or actual app/profile changes.
function websocketFixture(socket,onCommand){
 let buffered=Buffer.alloc(0);
 const write=message=>{
  const body=Buffer.from(JSON.stringify(message));let header;
  if(body.length<126)header=Buffer.from([0x81,body.length]);
  else if(body.length<65536){header=Buffer.alloc(4);header[0]=0x81;header[1]=126;header.writeUInt16BE(body.length,2);}
  else{header=Buffer.alloc(10);header[0]=0x81;header[1]=127;header.writeBigUInt64BE(BigInt(body.length),2);}
  socket.write(Buffer.concat([header,body]));
 };
 socket.on('data',chunk=>{
  buffered=Buffer.concat([buffered,chunk]);
  while(buffered.length>=2){
   let length=buffered[1]&127,offset=2;
   if(length===126){if(buffered.length<4)return;length=buffered.readUInt16BE(2);offset=4;}
   else if(length===127){if(buffered.length<10)return;length=Number(buffered.readBigUInt64BE(2));offset=10;}
   const masked=!!(buffered[1]&128),maskOffset=offset;if(masked)offset+=4;
   if(buffered.length<offset+length)return;
   const opcode=buffered[0]&15,body=Buffer.from(buffered.subarray(offset,offset+length));
   if(masked)for(let i=0;i<body.length;i++)body[i]^=buffered[maskOffset+(i%4)];
   buffered=buffered.subarray(offset+length);
   if(opcode===8){socket.end();return;}
   if(opcode===1)onCommand(JSON.parse(body.toString()),write);
  }
 });
 return write;
}
const waitFor=async(check,label,timeout=12000)=>{
 const deadline=Date.now()+timeout;
 while(Date.now()<deadline){if(await check())return;await new Promise(r=>setTimeout(r,100));}
 throw new Error('Timed out: '+label);
};

test('Watcher survives late renderers, retries context loss, skips overlays, and exits with its browser', {timeout:22000},async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'sakura-watch-'));
 let child,errors='';const sockets=new Set();let browser='fixture-browser',exposeMain=false,ready=false,failedOnce=false,evaluations=0,registrationCount=0,writeEvent=null;
 const server=http.createServer((request,response)=>{
  response.setHeader('Content-Type','application/json');
  if(request.url==='/json/version')response.end(JSON.stringify({webSocketDebuggerUrl:`ws://127.0.0.1:${server.address().port}/devtools/browser/${browser}`}));
  else response.end(JSON.stringify([
   ...(exposeMain?[{type:'page',id:'main',url:'app://-/index.html',webSocketDebuggerUrl:`ws://127.0.0.1:${server.address().port}/devtools/page/main`}]:[]),
   {type:'page',id:'avatar',url:'app://-/index.html?initialRoute=%2Favatar-overlay',webSocketDebuggerUrl:`ws://127.0.0.1:${server.address().port}/devtools/page/avatar`},
   {type:'page',id:'detached',url:'app://-/detached-window.html',webSocketDebuggerUrl:`ws://127.0.0.1:${server.address().port}/devtools/page/detached`},
  ]));
 });
 server.on('upgrade',(request,socket)=>{
  assert.equal(request.url,'/devtools/page/main');sockets.add(socket);socket.on('close',()=>sockets.delete(socket));
  const accept=crypto.createHash('sha1').update(request.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
  writeEvent=websocketFixture(socket,(command,write)=>{
   let result={};
   if(command.method==='Page.addScriptToEvaluateOnNewDocument'){registrationCount++;result={identifier:String(registrationCount)};}
   if(command.method==='Runtime.evaluate'){
    if(command.params.expression.startsWith(';(()=>{const __SAKURA_CONFIG__=')){
     evaluations++;if(!failedOnce){failedOnce=true;write({id:command.id,error:{message:'Execution context was destroyed'}});return;}
     result={result:{value:true}};
    }else result={result:{value:{installed:true,settings:true,skin:true,host:true,ready,error:null}}};
   }
   write({id:command.id,result});
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const statusPath=path.join(directory,'status.json');
 const status=async()=>JSON.parse(await fs.readFile(statusPath,'utf8').catch(()=>'null'));
 try{
  await fs.writeFile(path.join(directory,'theme.json'),JSON.stringify({image:'wallpaper.png'}));
  await fs.writeFile(path.join(directory,'wallpaper.png'),Buffer.from('fixture'));
  child=spawn(process.execPath,[fileURLToPath(new URL('./injector.mjs',import.meta.url)),'--watch','--no-startup','--port',String(server.address().port),'--theme-dir',directory,'--status-file',statusPath],{windowsHide:true,stdio:['ignore','pipe','pipe']});
  child.stderr.on('data',chunk=>errors+=chunk);child.stdout.resume();
  await waitFor(async()=>!!(await status()),'initial status');
  assert.equal(child.exitCode,null);assert.equal(registrationCount,0);
  exposeMain=true;
  await waitFor(()=>evaluations>=2,'retry after a transient renderer error');
  assert.equal(child.exitCode,null);
  ready=true;
  await waitFor(async()=>(await status())?.phase==='ready','real readiness');
  const oldCount=evaluations;
  writeEvent({method:'Runtime.executionContextsCleared',params:{}});
  await waitFor(()=>evaluations>oldCount,'same-URL renderer reload');
  browser='replacement-browser';
  await waitFor(()=>child.exitCode!==null,'old browser helper exit');
  assert.equal(child.exitCode,0,errors);assert.equal((await status()).phase,'stopped');
  assert.match(errors,/Execution context was destroyed/);
 }catch(error){throw new Error(error.message+'; child='+child?.exitCode+'; status='+JSON.stringify(await status())+'; errors='+errors);}
 finally{
  if(child&&child.exitCode===null)child.kill();for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));await fs.rm(directory,{recursive:true,force:true});
 }
});
