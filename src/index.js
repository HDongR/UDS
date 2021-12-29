import { version } from '../package.json';
export * from './core/Constants';
export { default as Browser } from './core/Browser';
import * as Util from './core/util';
import * as DomUtil from './core/util/dom';
import * as StringUtil from './core/util/strings';
import * as MapboxUtil from './core/mapbox';
export { Util, DomUtil, StringUtil, MapboxUtil };
export { default as LRUCache } from './core/util/LRUCache';
export { default as Ajax } from './core/Ajax';
export { default as Canvas } from './core/Canvas';
export { default as Promise } from './core/Promise';

// core classes
export { default as Class } from './core/Class';
export { default as Eventable } from './core/Eventable';
export { default as JSONAble } from './core/JSONAble';
export { default as CollisionIndex } from './core/CollisionIndex';

export { default as Handlerable } from './handler/Handlerable';
export { default as Handler } from './handler/Handler';
export { default as DragHandler } from './handler/Drag';
const dataWorker = new Worker(new URL('./DataWorker.js', import.meta.url));
dataWorker.onmessage = (e)=>{
    console.log('onMessage:', e.data); 
};

var idx =0;
loop();
function loop(){
    setTimeout(()=>{
        dataWorker.postMessage('Hello World!');
        
        
        console.log(idx);
        loop();
    }, 1000);

    idx++;
}