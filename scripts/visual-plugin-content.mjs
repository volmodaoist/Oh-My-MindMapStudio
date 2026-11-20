/** 插件桥的真实 DOM 回归：预量测不建组件、活动 DOM 复用、事件、取消和冻结导出。 */
import { join } from 'node:path';
export function buildPluginProbe(root) {
	const module = name => JSON.stringify(join(root, 'src', name));
	return `
import { PluginContentBridge, syncPluginContents, disposePluginContents, freezePluginContents, getEditingPluginNodeIds } from ${module('platform/rendering/plugins/bridge.ts')};
import { buildPluginBlock } from ${module('ui/node-content/content-plugin.ts')};
const probe = document.createElement('pre');probe.id='plugin-content-probe';document.body.appendChild(probe);
const assert=(v,message)=>{if(!v)throw new Error(message)};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{try{
const owner={}; let settled=0, commits=0, creates=0, disposals=0, sourcePath='Test.md';
const bridge=new PluginContentBridge({app:{},sourcePath:()=> sourcePath,onSettled:()=>settled++,onChange:async()=>{commits++}});
const sources=new Map([['n1','\x60\x60\x60tikz\\ntext\\n\x60\x60\x60'],['n2','\x60\x60\x60\x60tab\\ntab: A\\nhello\\n\x60\x60\x60\x60']]);
const make=(id,lang,source)=>buildPluginBlock(document,{kind:'text',style:'code',block:true,lang,text:source},{pluginContent:bridge},'zh',null,id,0,owner,null);
const first=make('n1','tikz','text'); const second=make('n2','tab','tab: A\\nhello');
assert(window.pluginMRCalls===undefined && creates===0,'预测量不创建插件组件');
const canvas=document.createElement('div');document.body.appendChild(canvas);
const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('width','1100');svg.setAttribute('height','1000');canvas.appendChild(svg);
const fo=document.createElementNS(svg.namespaceURI,'foreignObject');fo.setAttribute('width','1000');fo.setAttribute('height','950');svg.appendChild(fo);
const container=document.createElement('div');fo.appendChild(container);container.append(first,second);
const errorCodes={Busy:'BUSY',Disposed:'DISPOSED'};
let lastHandle=null;
const api={errorCodes,render:async req=>{
 assert(req.component.loaded&&req.container.isConnected,'挂载使用已加载 Component 和已连接容器');creates++;
 let source=req.source,path=req.sourcePath,closed=false,busy=false;const listeners=new Set();
 const snapshot=()=>{if(closed)throw {code:'DISPOSED'};return {source,sourcePath:path,revision:0,tabs:[],editing:false,saving:false,rendering:false}};
 const notify=()=>{for(const listener of listeners)listener(snapshot())};
 const button=document.createElement('button');button.setAttribute('role','tab');button.textContent='B';
 const body=document.createElement('div');body.style.height='40px';body.textContent='A';
 button.addEventListener('click',()=>{body.style.height='140px';body.textContent='B'});
 req.container.append(button,body);
 const handle={getSnapshot:snapshot,update:async patch=>{
  if(closed)throw {code:'DISPOSED'};
  if((patch.source===undefined||patch.source===source)&&(patch.sourcePath===undefined||patch.sourcePath===path))return;
  if(busy)throw {code:'BUSY'};
  source=patch.source??source;path=patch.sourcePath??path;body.textContent=source;notify();
 },subscribe:listener=>{listeners.add(listener);listener(snapshot());return()=>listeners.delete(listener)},
 dispose:()=>{if(closed)return;closed=true;disposals++;listeners.clear();req.container.replaceChildren()},
 busy:value=>{busy=value;notify()}};
 req.component.register(handle.dispose);lastHandle=handle;return handle;
}};
const discover=event=>{event.detail.api=api};document.addEventListener('obsidian-code-tab-api',discover);
const observer=new MutationObserver(records=>{for(const record of records) for(const node of record.addedNodes){
 const scripts=node.querySelectorAll?.('script[type="text/tikz"]')||[];
 for(const script of scripts){setTimeout(()=>{
  const final=document.createElementNS(svg.namespaceURI,'svg');final.setAttribute('width','220');final.setAttribute('height','90');final.setAttribute('viewBox','0 0 220 90');
  const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d','M0 0L200 80');final.appendChild(path);script.replaceWith(final);
  final.dispatchEvent(new Event('tikzjax-load-finished',{bubbles:true}));
 },20);}
}});observer.observe(document.body,{childList:true,subtree:true});
syncPluginContents(canvas,owner,sources);await wait(150);
assert(window.pluginMRCalls===1&&window.pluginMRDetached,'TikZ 使用官方渲染入口并在脱离 DOM 时处理');
assert(first.querySelector('.mindmap-plugin-live svg'),'SVG 完成后进入真实节点');
const live=second.querySelector('.mindmap-plugin-live');const button=live.querySelector('button');button.click();await wait(50);
assert(live.textContent.includes('B')&&settled>0&&commits===0,'切换只改变组件并触发尺寸同步');
const titleInput=document.createElement('input');live.appendChild(titleInput);titleInput.focus();
assert(lastHandle.getSnapshot().editing===false&&getEditingPluginNodeIds(owner).has('n2'),'标题持焦即保护节点，不依赖正文编辑标记');
const outside=document.createElement('button');document.body.appendChild(outside);outside.focus();
assert(!getEditingPluginNodeIds(owner).has('n2'),'焦点离开插件控件后解除保护');outside.remove();titleInput.remove();
const fresh=make('n2','tab','tab: A\\nhello');second.replaceWith(fresh);syncPluginContents(canvas,owner,sources);await wait(30);
assert(fresh.querySelector('.mindmap-plugin-live')===live&&creates===1,'重排复用同一活动 DOM 和事件');
button.click();assert(live.textContent.includes('B'),'复用后按钮仍可用');
sourcePath='Moved.md';sources.set('n2','\\x60\\x60\\x60\\x60tab\\ntab: A\\nchanged\\n\\x60\\x60\\x60\\x60');
syncPluginContents(canvas,owner,sources);await wait(30);
assert(fresh.querySelector('.mindmap-plugin-live')===live&&creates===1&&live.textContent.includes('changed'),'源码更新原地复用活动 DOM');
assert(lastHandle.getSnapshot().sourcePath==='Moved.md'&&commits===0,'路径更新不回声保存');
lastHandle.busy(true);sources.set('n2','\\x60\\x60\\x60\\x60tab\\ntab: A\\nexternal\\n\\x60\\x60\\x60\\x60');
syncPluginContents(canvas,owner,sources);await wait(30);
assert(!live.textContent.includes('external')&&creates===1,'标题交互期间保留组件和草稿');
lastHandle.busy(false);await wait(30);assert(live.textContent.includes('external'),'交互结束同步最新宿主源码');
const copy=svg.cloneNode(true);freezePluginContents({node:copy});assert(copy.querySelector('.mindmap-plugin-live'),'导出冻结副本');
sources.delete('n2');syncPluginContents(canvas,owner,sources);assert(!live.isConnected&&disposals===1,'节点删除释放句柄且不提交草稿');
disposePluginContents(owner);observer.disconnect();canvas.remove();
document.removeEventListener('obsidian-code-tab-api',discover);
assert(!document.querySelector('.mindmap-plugin-live'),'引擎关闭清理所有活动组件');
probe.textContent=JSON.stringify({ok:true,settled,creates,checks:15});
}catch(error){probe.textContent=JSON.stringify({ok:false,error:error.stack||String(error)})}})();
`;
}
export const PLUGIN_SHIM_SOURCE = `
export class App {}
export class Notice {}
export class Component {
 constructor(){this.cleanups=[];this.children=[];this.loaded=false}
 load(){this.loaded=true;this.onload?.()}
 unload(){for(const child of this.children)child.unload();for(const cleanup of this.cleanups)cleanup();this.children=[];this.cleanups=[];this.loaded=false;this.onunload?.()}
 register(cleanup){this.cleanups.push(cleanup)}
 addChild(child){this.children.push(child);if(this.loaded)child.load();return child}
}
export class MarkdownRenderer {
 static async render(app,markdown,root,path,component){window.pluginMRCalls=(window.pluginMRCalls||0)+1;window.pluginMRDetached=!root.isConnected;
 const wrapper=document.createElement('div');const script=document.createElement('script');script.type='text/tikz';script.textContent=markdown;wrapper.appendChild(script);root.appendChild(wrapper);}
}
`;
