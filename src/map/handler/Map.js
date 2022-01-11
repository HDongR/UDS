import { extend } from '..';
import Class from '../core/Class';
import Eventable from './Eventable';
import Handlerable from './Handlerable';
import Renderable from './Renderable';
import MapDragHandler from '../handler/Map.Drag';

const options = {
    'maxVisualPitch': 70,
    'maxPitch': 80,
    'centerCross': false,

    'zoomInCenter': false,
    'zoomOrigin': null,
    'zoomAnimation': (function () {
        return !false;//IS_NODE;
    })(),
    'zoomAnimationDuration': 330,

    'panAnimation': (function () {
        return !false;//IS_NODE;
    })(),

    //default pan animation duration
    'panAnimationDuration': 600,

    'rotateAnimation': (function () {
        return !false;//IS_NODE;
    })(),

    'zoomable': true,
    'enableInfoWindow': true,

    'hitDetect': (function () {
        return true;//!Browser.mobile;
    })(),

    'hitDetectLimit': 5,

    'fpsOnInteracting': 25,

    'layerCanvasLimitOnInteracting': -1,

    'maxZoom': null,
    'minZoom': null,
    'maxExtent': null,
    'fixCenterOnResize': true,

    'checkSize': true,
    'checkSizeInterval': 1000,

    'renderer': 'canvas',

    'cascadePitches': [10, 60],
    'renderable': true
};

class Map extends Handlerable(Eventable(Renderable(Class))) {

    constructor(container, options) {
        const opts = extend({}, options);

        super(opts);

        let mapDragHandler = new MapDragHandler();
        mapDragHandler.addHooks(container);
        
        Map.mergeOptions({
            'draggable': true,
            'dragPan' : true,
            'dragRotatePitch' : true,
            'dragRotate' : true,
            'dragPitch' : true
        });

        Map.addOnLoadHook('addHandler', 'draggable', mapDragHandler);


    }

    static addOnLoadHook(fn) { // (Function) || (String, args...)
        const args = Array.prototype.slice.call(arguments, 1);
        const onload = typeof fn === 'function' ? fn : function () {
            this[fn].apply(this, args);
        };
        this.prototype._onLoadHooks = this.prototype._onLoadHooks || [];
        this.prototype._onLoadHooks.push(onload);
        return this;
    }

}



Map.mergeOptions(options);

export default Map;