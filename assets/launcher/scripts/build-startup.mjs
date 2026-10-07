import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import {installSubtitleStudio} from './subtitle-studio.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)),'../codex-startup-animation');
const {buildInjection}=await import(pathToFileURL(path.join(root,'extension/payload.mjs')));
let animation=await buildInjection(root);
animation=animation.replace("if(data.action==='background')background(data);","if(data.action==='background')return;")
 .replace('if(document.body)show();','if(document.body)show(Boolean(window.__SAKURA_STARTUP_SETTINGS__));')
 .replace('observer=null;show();','observer=null;show(Boolean(window.__SAKURA_STARTUP_SETTINGS__));');
const editorCSS=`
:root,body{background:transparent!important;color:#f0edf5!important;font:13px "Segoe UI","Microsoft YaHei UI",system-ui!important}
body{display:block!important;min-height:0!important;margin:0!important;overflow:hidden!important}
.preview{width:100%!important;margin:0!important;padding:0!important}
.preview-heading,.playback,.window>:not(#settings-dialog){display:none!important}
.window{aspect-ratio:auto!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;overflow:visible!important}
#settings-dialog{position:static!important;inset:auto!important;margin:0!important;width:100%!important;max-width:none!important;height:auto!important;max-height:none!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;overflow:visible!important;color:#f0edf5!important}
#settings-dialog::backdrop{background:transparent!important;backdrop-filter:none!important}
#settings-dialog>form[method=dialog],#settings-dialog>.eyebrow,#settings-title,.settings-description,#restore-appearance,.wallpaper-setting{display:none!important}
.image-choices{display:grid!important;grid-template-columns:1fr 1fr!important;gap:14px!important;margin:0 0 18px!important}
.image-choice{padding:12px!important;border:1px solid #e9e0f719!important;border-radius:12px!important;background:#ffffff08!important}
.image-choice:focus-within{outline:none!important;border-color:#bca2db55!important;box-shadow:inset 0 0 0 1px #bca2db33!important}
.image-choice img{width:100%!important;height:150px!important;object-fit:contain!important;border-radius:8px!important;background:transparent!important}
.image-choice span,.image-choice small{font-family:inherit!important;letter-spacing:0!important}.image-choice small{color:#aaa6b6!important}
.text-settings{gap:14px!important;margin:14px 0!important}.text-settings label{font:13px "Segoe UI",system-ui!important;color:#b8b3c4!important}.text-settings small{font-size:11px!important;color:#9d97aa!important}label,small{font-family:inherit!important;color:inherit}
input[type=text]{font:13px "Segoe UI",system-ui!important;background:#ffffff09!important;border:1px solid #e9e0f71f!important;border-radius:8px!important;color:#f0edf5!important;padding:10px 12px!important;box-sizing:border-box!important}
button,.choose-label{font:13px "Segoe UI",system-ui!important;border:1px solid #e9e0f71f!important;border-radius:10px!important;background:#ffffff0d!important;color:#f0edf5!important;padding:10px 14px!important;letter-spacing:0!important}
button:hover,.choose-label:hover{background:#b08fd62b!important}button:focus-visible,input:focus-visible{outline:2px solid #bba0dc!important;outline-offset:2px!important}
#preview-images{background:#b08fd637!important;border-color:#dac1f326!important}#settings-status{font:12px "Segoe UI",system-ui!important;color:#b8b3c4!important;min-height:40px!important;line-height:1.5!important}.settings-actions{gap:10px!important;margin-top:16px!important}
`;
animation=animation.replace('let frame=null,watchdog=0,observer=null,priorFocus=null,disposed=false;',
 'let frame=null,watchdog=0,observer=null,editorResize=null,editorContainer=null,priorFocus=null,disposed=false;');
animation=animation.replace('clearTimeout(watchdog);observer?.disconnect();observer=null;',
 'clearTimeout(watchdog);observer?.disconnect();observer=null;editorResize?.disconnect();editorResize=null;');
animation=animation.replace("current.src='about:blank';document.body.appendChild(current);",
 "editorContainer=settings?window.__SAKURA_STARTUP_EDITOR_HOST__:null;if(editorContainer)Object.assign(current.style,{position:'relative',inset:'auto',height:'780px',width:'100%',zIndex:'auto',background:'transparent'});current.src='about:blank';(editorContainer||document.body).appendChild(current);");
animation=animation.replace('mount(win);current.focus();',
 `if(settings&&editorContainer){const unified=doc.createElement('style');unified.textContent=${JSON.stringify(editorCSS)};doc.head.appendChild(unified)}mount(win);current.focus();if(settings&&editorContainer){const hidden=doc.getElementById('wallpaper-strength')?.closest('label');if(hidden)hidden.hidden=true;const form=doc.getElementById('settings-dialog');const resize=()=>{const height=Math.max(600,form.scrollHeight+8);if(current.style.height!==height+'px')current.style.height=height+'px'};editorResize=new win.ResizeObserver(resize);editorResize.observe(form);resize();}`);
animation=animation.replace("if(data.action==='settings-close'){phase='playing';watchdog=setTimeout(removeOverlay,25000);}",
 "if(data.action==='settings-close'){if(editorContainer){removeOverlay();queueMicrotask(()=>window.__SAKURA_STARTUP_EDITOR_SAVED__?.());return;}phase='playing';watchdog=setTimeout(removeOverlay,25000);}");
animation=animation.replace("if(data.action==='complete'){completed=true;phase='complete';removeOverlay();}",
 "if(data.action==='complete'){completed=true;phase='complete';const editor=!!editorContainer;removeOverlay();if(editor)queueMicrotask(()=>window.__SAKURA_STARTUP_EDITOR_CANCELLED__?.());}");
animation=animation.replace('win.AEMEATH_OPEN_SETTINGS=settings;','win.AEMEATH_OPEN_SETTINGS=settings;win.AEMEATH_STUDIO_EDITOR=Boolean(settings&&editorContainer);');
animation=animation.replace('function openSettings(){','function openSettings(){if(window.AEMEATH_EXTERNAL&&!window.AEMEATH_STUDIO_EDITOR){send(\'appearance-settings\');return;}');
animation=animation.replace("if(data.action==='assetError')", "if(data.action==='appearance-settings'){removeOverlay();queueMicrotask(()=>window.__SAKURA_APPEARANCE_SETTINGS__?.open('animation'));return;}if(data.action==='assetError')");
animation=animation.replace('openSettings:()=>show(true)','openSettings:()=>window.__SAKURA_APPEARANCE_SETTINGS__?.open(\'animation\')');
animation=animation.replace('event.preventDefault();show(true);','event.preventDefault();window.__SAKURA_APPEARANCE_SETTINGS__?.open(\'animation\');');
animation=animation.replace('mount(win);current.focus();',`mount(win);(${installSubtitleStudio.toString()})(win,Boolean(settings&&editorContainer));current.focus();`);
animation=animation.replaceAll('thumbnails();','thumbnails();window.__SAKURA_REFRESH_SUBTITLE_SAMPLES__?.();');
animation=animation.replace("if(editorContainer){removeOverlay();queueMicrotask(()=>window.__SAKURA_STARTUP_EDITOR_SAVED__?.());return;}","if(editorContainer){frame?.contentWindow.__SAKURA_SAVE_SUBTITLE_STYLE__?.();removeOverlay();queueMicrotask(()=>window.__SAKURA_STARTUP_EDITOR_SAVED__?.());return;}");
const file=fileURLToPath(new URL('./injector.mjs',import.meta.url));
let source=await fs.readFile(file,'utf8');
source=source.replace(/\n\/\/ STARTUP_BUNDLE_BEGIN[\s\S]*?\/\/ STARTUP_BUNDLE_END\n?/,'');
const bundle=`\n// STARTUP_BUNDLE_BEGIN\nconst STARTUP_ANIMATION=${JSON.stringify(animation)};\n// STARTUP_BUNDLE_END\n`;
const marker='let nativeFiles = new Map();';
if(!source.includes(marker))throw new Error('Startup bundle insertion marker missing');
source=source.replace(marker,marker+bundle);
await fs.writeFile(file,source);
console.log(`Original animation bundled: ${Buffer.byteLength(animation)} bytes`);
