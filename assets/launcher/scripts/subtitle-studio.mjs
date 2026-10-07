export function installSubtitleStudio(window, editor) {
  const document=window.document;
  const variants=[
    {id:'original',name:'原版样式',family:'"Microsoft YaHei UI",system-ui',weight:400,spacing:2,color:'#f5edf5',shadow:'0 2px 8px #291225b3'},
    {id:'soft',name:'柔光黑体',family:'"Microsoft YaHei","Segoe UI",sans-serif',weight:500,spacing:2.4,color:'#fff1fa',shadow:'0 2px 8px #100818aa,0 0 14px #efa8d044'},
    {id:'cinema',name:'电影宋体',family:'"SimSun","Songti SC",serif',weight:600,spacing:3.2,color:'#fff4ed',shadow:'0 2px 5px #000b,0 0 10px #fae5cf22'},
    {id:'ink',name:'清雅楷书',family:'"STKaiti","KaiTi",serif',weight:400,spacing:2.6,color:'#f8ecff',shadow:'0 2px 8px #180825aa'},
    {id:'round',name:'轻盈圆体',family:'"YouYuan","Microsoft YaHei",sans-serif',weight:400,spacing:1.8,color:'#ffe5f3',shadow:'0 2px 8px #14062099,0 0 12px #e5adff33'},
  ];
  let selected;try{selected=window.localStorage.getItem('sakura-caption-style')||'original'}catch{selected='original'}
  if(!variants.some(v=>v.id===selected))selected='original';
  const captionStyle=document.createElement('style');captionStyle.id='sakura-caption-style';document.head.appendChild(captionStyle);
  const apply=id=>{selected=id;const variant=variants.find(v=>v.id===id)||variants[0];captionStyle.textContent=id==='original'?'':`#subtitle{font-family:${variant.family};font-weight:${variant.weight};letter-spacing:${variant.spacing}px;color:${variant.color};text-shadow:${variant.shadow};font-size:clamp(17px,2vw,24px)}`;};
  apply(selected);window.__SAKURA_SAVE_SUBTITLE_STYLE__=()=>window.localStorage.setItem('sakura-caption-style',selected);
  if(!editor)return;
  const theme=document.createElement('style');theme.textContent=`#sakura-caption-samples{margin:18px 0 20px}#sakura-caption-samples h3{font:600 14px "Segoe UI",system-ui;color:#f0edf5;margin:0 0 6px}#sakura-caption-samples>p{font:12px "Segoe UI",system-ui;color:#aaa5b7;line-height:1.5;margin:0 0 12px}.caption-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}#sakura-caption-samples button{padding:12px!important;min-height:94px;text-align:left;border-radius:10px!important;background:#ffffff07!important;overflow:hidden}#sakura-caption-samples button[aria-checked=true]{background:#b08fd621!important;border-color:#bca2db55!important}#sakura-caption-samples .sample-name{display:block;font:12px "Segoe UI",system-ui;color:#bdb7cb;margin-bottom:9px}#sakura-caption-samples .sample-text{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:20px;line-height:1.5}@media(max-width:440px){.caption-grid{grid-template-columns:1fr}}`;
  document.head.appendChild(theme);
  const studio=document.createElement('section');studio.id='sakura-caption-samples';studio.innerHTML='<h3>字幕字体样式</h3><p>点击比较效果；保存并预览后用于开场动画。</p><div class="caption-grid" role="radiogroup" aria-label="字幕字体样式"></div>';
  const grid=studio.querySelector('.caption-grid');
  for(const variant of variants){const button=document.createElement('button');button.type='button';button.dataset.style=variant.id;button.setAttribute('role','radio');button.setAttribute('aria-checked',String(variant.id===selected));const name=document.createElement('span');name.className='sample-name';name.textContent=variant.name;const text=document.createElement('span');text.className='sample-text';Object.assign(text.style,{fontFamily:variant.family,fontWeight:String(variant.weight),letterSpacing:variant.spacing+'px',color:variant.color,textShadow:variant.shadow});button.append(name,text);button.onclick=()=>{apply(variant.id);for(const option of grid.children)option.setAttribute('aria-checked',String(option.dataset.style===selected))};grid.appendChild(button);}
  const field=document.getElementById('artwork-subtitle');
  const refresh=()=>{for(const text of studio.querySelectorAll('.sample-text'))text.textContent=field.value||'幽灵来到…你身边～';};
  window.__SAKURA_REFRESH_SUBTITLE_SAMPLES__=refresh;field.addEventListener('input',refresh);refresh();document.querySelector('.text-settings').after(studio);
  grid.onkeydown=event=>{if(event.key!=='ArrowRight'&&event.key!=='ArrowLeft')return;event.preventDefault();const buttons=[...grid.children],current=buttons.findIndex(button=>button.getAttribute('aria-checked')==='true'),next=buttons[(current+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length];next.click();next.focus();};
}
