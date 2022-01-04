import * as THREE from '../three/build/three.module';
import * as Util from '../core/util';
import { default as Coordinate} from '../geo/Coordinate';
import { default as Point_} from '../geo/Point';
import { default as CanvasLayer } from '../layer/CanvasLayer';
import { default as CanvasLayerRenderer } from '../renderer/layer/canvaslayer/CanvasLayerRenderer';
import { registerWorkerAdapter} from '../core/worker/Worker';

import BaseObject from './BaseObject';
import Bar from './Bar';
import Line from './Line';
import ExtrudeLine from './ExtrudeLine';
import ExtrudePolygon from './ExtrudePolygon';
import Model from './Model';
import ExtrudeLineTrail from './ExtrudeLineTrail';
import ExtrudePolygons from './ExtrudePolygons';
import Point from './Point';
import Points from './Points';
import Bars from './Bars';
import ExtrudeLines from './ExtrudeLines';
import Lines from './Lines';
import ThreeVectorTileLayer from './ThreeVectorTileLayer';
import Terrain from './Terrain';
import TerrainVectorTileLayer from './TerrainVectorTileLayer';
import HeatMap from './HeatMap';
import { setRaycasterLinePrecision } from './util/ThreeAdaptUtil';
import GPUPick from './GPUPick';
import FatLine from './FatLine';
import FatLines from './FatLines';
import Box from './Box';
import Boxs from './Boxs';
import MergedMixin from './MergedMixin';
import * as GeoJSONUtil from './util/GeoJSONUtil';
import * as GeoUtil from './util/GeoUtil';
import * as MergeGeometryUtil from './util/MergeGeometryUtil';
import * as ExtrudeUtil from './util/ExtrudeUtil';
import * as LineUtil from './util/LineUtil';
import * as IdentifyUtil from './util/IdentifyUtil';
import * as geometryExtrude from 'deyihu-geometry-extrude';
import LineMaterial from './util/fatline/LineMaterial';
import { getWorkerCode, getWorkerName } from './worker/getworker';
const options = {
    'renderer': 'gl',
    'doubleBuffer': false,
    'glOptions': null,
    'geometryEvents': true,
    'identifyCountOnEvent': 0,
    'forceRenderOnZooming': true,
    'loopRenderCount': 50
};
const RADIAN = Math.PI / 180;
const LINEPRECISIONS = [
    [4000, 220],
    [2000, 100],
    [1000, 30],
    [500, 15],
    [100, 5],
    [50, 2],
    [10, 1],
    [5, 0.7],
    [2, 0.1],
    [1, 0.05],
    [0.5, 0.02]
];
const EVENTS = [
    'mousemove',
    'click',
    'mousedown',
    'mouseup',
    'dblclick',
    'contextmenu',
    'touchstart',
    'touchmove',
    'touchend'
];
const TEMP_COORD = new Coordinate(0, 0);
const TEMP_POINT = new Point_(0, 0);
// const MATRIX4 = new THREE.Matrix4();
/**
 * A Layer to render with THREE.JS (http://threejs.org), the most popular library for WebGL. <br>
 *
 * @classdesc
 * A layer to render with THREE.JS
 * @example
 *  var layer = new ThreeLayer('three');
 *
 *  layer.prepareToDraw = function (gl, scene, camera) {
 *      var size = map.getSize();
 *      return [size.width, size.height]
 *  };
 *
 *  layer.draw = function (gl, view, scene, camera, width,height) {
 *      //...
 *  };
 *  layer.addTo(map);
 * @class
 * @category layer
 * @extends {CanvasLayer}
 * @param {String|Number} id - layer's id
 * @param {Object} options - options defined in [options]{@link ThreeLayer#options}
 */
class ThreeLayer extends CanvasLayer {
    constructor(id, options) {
        super(id, options);
        this._animationBaseObjectMap = {};
        this._needsUpdate = true;
        this._mousemoveTimeOut = 0;
        this._baseObjects = [];
        this._delayMeshes = [];
        this.type = 'ThreeLayer';
    }
    isRendering() {
        const map = this.getMap();
        if (!map) {
            return false;
        }
        return map.isInteracting() || map.isAnimating();
    }
    prepareToDraw(...args) {
    }
    /**
     * Draw method of ThreeLayer
     * In default, it calls renderScene, refresh the camera and the scene
     */
    draw() {
        this.renderScene();
    }
    /**
     * Draw method of ThreeLayer when map is interacting
     * In default, it calls renderScene, refresh the camera and the scene
     */
    drawOnInteracting() {
        this.renderScene();
    }
    /**
     * Convert a geographic coordinate to THREE Vector3
     * @param  {Coordinate} coordinate - coordinate
     * @param {Number} [z=0] z value
     * @return {THREE.Vector3}
     */
    coordinateToVector3(coordinate, z = 0) {
        const map = this.getMap();
        if (!map) {
            return null;
        }
        const isArray = Array.isArray(coordinate);
        if (isArray) {
            TEMP_COORD.x = coordinate[0];
            TEMP_COORD.y = coordinate[1];
        }
        if (!isArray) {
            if (!(coordinate instanceof Coordinate)) {
                coordinate = new Coordinate(coordinate);
            }
        }
        const res = getGLRes(map);
        const p = coordinateToPoint(map, isArray ? TEMP_COORD : coordinate, res, TEMP_POINT);
        return new THREE.Vector3(p.x, p.y, z);
    }
    /**
     * Convert geographic distance to THREE Vector3
     * @param  {Number} w - width
     * @param  {Number} h - height
     * @return {THREE.Vector3}
     */
    distanceToVector3(w, h, coord) {
        if ((w === 0 && h === 0) || (!Util.isNumber(w) || !Util.isNumber(h))) {
            return new THREE.Vector3(0, 0, 0);
        }
        const map = this.getMap();
        const res = getGLRes(map);
        let center = coord || map.getCenter();
        if (!(center instanceof Coordinate)) {
            center = new Coordinate(center);
        }
        const target = map.locate(center, w, h);
        const p0 = coordinateToPoint(map, center, res), p1 = coordinateToPoint(map, target, res);
        const x = Math.abs(p1.x - p0.x) * Util.sign(w);
        const y = Math.abs(p1.y - p0.y) * Util.sign(h);
        return new THREE.Vector3(x, y, 0);
    }
    /**
     * Convert a Polygon or a MultiPolygon to THREE shape
     * @param  {Polygon|MultiPolygon} polygon - polygon or multipolygon
     * @return {THREE.Shape}
     */
    toShape(polygon) {
        if (!polygon) {
            return null;
        }
        if (polygon instanceof MultiPolygon) {
            return polygon.getGeometries().map(c => this.toShape(c));
        }
        const center = polygon.getCenter();
        const centerPt = this.coordinateToVector3(center);
        const shell = polygon.getShell();
        const outer = shell.map(c => {
            const vector = this.coordinateToVector3(c).sub(centerPt);
            return new THREE.Vector2(vector.x, vector.y);
        });
        const shape = new THREE.Shape(outer);
        const holes = polygon.getHoles();
        if (holes && holes.length > 0) {
            shape.holes = holes.map(item => {
                const pts = item.map(c => {
                    const vector = this.coordinateToVector3(c).sub(centerPt);
                    return new THREE.Vector2(vector.x, vector.y);
                });
                return new THREE.Shape(pts);
            });
        }
        return shape;
    }
    /**
     * todo   This should also be extracted as a component
     * @param {*} polygon
     * @param {*} altitude
     * @param {*} material
     * @param {*} height
     */
    toExtrudeMesh(polygon, altitude, material, height) {
        if (!polygon) {
            return null;
        }
        if (polygon instanceof MultiPolygon) {
            return polygon.getGeometries().map(c => this.toExtrudeMesh(c, altitude, material, height));
        }
        const rings = polygon.getCoordinates();
        rings.forEach(ring => {
            const length = ring.length;
            for (let i = length - 1; i >= 1; i--) {
                if (ring[i].equals(ring[i - 1])) {
                    ring.splice(i, 1);
                }
            }
        });
        polygon.setCoordinates(rings);
        const shape = this.toShape(polygon);
        const center = this.coordinateToVector3(polygon.getCenter());
        height = Util.isNumber(height) ? height : altitude;
        height = this.distanceToVector3(height, height).x;
        const amount = this.distanceToVector3(altitude, altitude).x;
        //{ amount: extrudeH, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 1, bevelThickness: 1 };
        const config = { 'bevelEnabled': false, 'bevelSize': 1 };
        const name = parseInt(THREE.REVISION) >= 93 ? 'depth' : 'amount';
        config[name] = height;
        const geom = new THREE.ExtrudeGeometry(shape, config);
        let buffGeom = geom;
        if (THREE.BufferGeometry.prototype.fromGeometry) {
            buffGeom = new THREE.BufferGeometry();
            buffGeom.fromGeometry(geom);
        }
        const mesh = new THREE.Mesh(buffGeom, material);
        mesh.position.set(center.x, center.y, amount - height);
        return mesh;
    }
    /**
     *
     * @param {Polygon|MultiPolygon} polygon
     * @param {Object} options
     * @param {THREE.Material} material
     */
    toExtrudePolygon(polygon, options, material) {
        return new ExtrudePolygon(polygon, options, material, this);
    }
    /**
     *
     * @param {Coordinate} coordinate
     * @param {Object} options
     * @param {THREE.Material} material
     */
    toBar(coordinate, options, material) {
        return new Bar(coordinate, options, material, this);
    }
    /**
    *
    * @param {LineString} lineString
    * @param {Object} options
    * @param {THREE.LineMaterial} material
    */
    toLine(lineString, options, material) {
        return new Line(lineString, options, material, this);
    }
    /**
     *
     * @param {LineString} lineString
     * @param {Object} options
     * @param {THREE.Material} material
     */
    toExtrudeLine(lineString, options, material) {
        return new ExtrudeLine(lineString, options, material, this);
    }
    /**
     *
     * @param {THREE.Mesh|THREE.Group} model
     * @param {Object} options
     */
    toModel(model, options) {
        return new Model(model, options, this);
    }
    /**
     *
     * @param {LineString} lineString
     * @param {*} options
     * @param {THREE.Material} material
     */
    toExtrudeLineTrail(lineString, options, material) {
        return new ExtrudeLineTrail(lineString, options, material, this);
    }
    /**
     *
     * @param {*} polygons
     * @param {*} options
     * @param {*} material
     */
    toExtrudePolygons(polygons, options, material) {
        return new ExtrudePolygons(polygons, options, material, this);
    }
    /**
     *
     * @param {Coordinate} coordinate
     * @param {*} options
     * @param {*} material
     */
    toPoint(coordinate, options, material) {
        return new Point(coordinate, options, material, this);
    }
    /**
     *
     * @param {Array} points
     * @param {*} options
     * @param {*} material
     */
    toPoints(points, options, material) {
        return new Points(points, options, material, this);
    }
    /**
     *
     * @param {Array} points
     * @param {*} options
     * @param {*} material
     */
    toBars(points, options, material) {
        return new Bars(points, options, material, this);
    }
    /**
     *
     * @param {Array[LineString]} lineStrings
     * @param {*} options
     * @param {*} material
     */
    toExtrudeLines(lineStrings, options, material) {
        return new ExtrudeLines(lineStrings, options, material, this);
    }
    /**
     *
     * @param {Array[LineString]} lineStrings
     * @param {*} options
     * @param {*} material
     */
    toLines(lineStrings, options, material) {
        return new Lines(lineStrings, options, material, this);
    }
    /**
     *
     * @param {*} url
     * @param {*} options
     * @param {*} getMaterial
     * @param {*} worker
     */
    toThreeVectorTileLayer(url, options, getMaterial) {
        return new ThreeVectorTileLayer(url, options, getMaterial, this);
    }
    /**
     *
     * @param {*} extent
     * @param {*} options
     * @param {*} material
     */
    toTerrain(extent, options, material) {
        return new Terrain(extent, options, material, this);
    }
    /**
     *
     * @param {*} url
     * @param {*} options
     * @param {*} material
     */
    toTerrainVectorTileLayer(url, options, material) {
        return new TerrainVectorTileLayer(url, options, material, this);
    }
    /**
     *
     * @param {*} data
     * @param {*} options
     * @param {*} material
     */
    toHeatMap(data, options, material) {
        return new HeatMap(data, options, material, this);
    }
    /**
     *
     * @param {*} lineString
     * @param {*} options
     * @param {*} material
     */
    toFatLine(lineString, options, material) {
        return new FatLine(lineString, options, material, this);
    }
    /**
     *
     * @param {*} lineStrings
     * @param {*} options
     * @param {*} material
     */
    toFatLines(lineStrings, options, material) {
        return new FatLines(lineStrings, options, material, this);
    }
    /**
     *
     * @param {*} coorindate
     * @param {*} options
     * @param {*} material
     */
    toBox(coorindate, options, material) {
        return new Box(coorindate, options, material, this);
    }
    /**
     *
     * @param {*} points
     * @param {*} options
     * @param {*} material
     */
    toBoxs(points, options, material) {
        return new Boxs(points, options, material, this);
    }
    getBaseObjects() {
        return this.getMeshes().filter((mesh => {
            return mesh instanceof BaseObject;
        }));
    }
    getMeshes() {
        const scene = this.getScene();
        if (!scene) {
            return [];
        }
        const meshes = [];
        for (let i = 0, len = scene.children.length; i < len; i++) {
            const child = scene.children[i];
            if (child instanceof THREE.Object3D && !(child instanceof THREE.Camera)) {
                meshes.push(child['__parent'] || child);
            }
        }
        return meshes;
    }
    clear() {
        return this.clearMesh();
    }
    clearMesh() {
        const scene = this.getScene();
        if (!scene) {
            return this;
        }
        for (let i = scene.children.length - 1; i >= 0; i--) {
            const child = scene.children[i];
            if (child instanceof THREE.Object3D && !(child instanceof THREE.Camera)) {
                scene.remove(child);
                const parent = child['__parent'];
                if (parent && parent instanceof BaseObject) {
                    parent.isAdd = false;
                    parent._fire('remove', { target: parent });
                    delete this._animationBaseObjectMap[child.uuid];
                }
            }
        }
        return this;
    }
    lookAt(vector) {
        const renderer = this._getRenderer();
        if (renderer) {
            renderer.context.lookAt(vector);
        }
        return this;
    }
    getCamera() {
        const renderer = this._getRenderer();
        if (renderer) {
            return renderer.camera;
        }
        return null;
    }
    getScene() {
        const renderer = this._getRenderer();
        if (renderer) {
            return renderer.scene;
        }
        return null;
    }
    renderScene() {
        const renderer = this._getRenderer();
        if (renderer) {
            renderer.clearCanvas();
            renderer.renderScene();
        }
        return this;
    }
    loop(render = false) {
        const delayMeshes = this._delayMeshes;
        if (!delayMeshes.length) {
            return;
        }
        const map = this.getMap();
        if (!map || map.isAnimating() || map.isInteracting()) {
            return;
        }
        const loopRenderCount = this.options.loopRenderCount || 50;
        const meshes = delayMeshes.slice(0, loopRenderCount);
        if (meshes) {
            this.addMesh(meshes, render);
        }
        delayMeshes.splice(0, loopRenderCount);
    }
    renderPickScene() {
        const renderer = this._getRenderer();
        if (renderer) {
            const pick = renderer.pick;
            if (pick) {
                pick.pick(this._containerPoint);
            }
        }
        return this;
    }
    getThreeRenderer() {
        const renderer = this._getRenderer();
        if (renderer) {
            return renderer.context;
        }
        return null;
    }
    getPick() {
        const renderer = this._getRenderer();
        if (renderer) {
            return renderer.pick;
        }
        return null;
    }
    delayAddMesh(meshes) {
        if (!meshes)
            return this;
        if (!Array.isArray(meshes)) {
            meshes = [meshes];
        }
        for (let i = 0, len = meshes.length; i < len; i++) {
            this._delayMeshes.push(meshes[i]);
        }
        return this;
    }
    /**
     * add object3ds
     * @param {BaseObject} meshes
     */
    addMesh(meshes, render = true) {
        if (!meshes)
            return this;
        if (!Array.isArray(meshes)) {
            meshes = [meshes];
        }
        const scene = this.getScene();
        meshes.forEach(mesh => {
            if (mesh instanceof BaseObject) {
                scene.add(mesh.getObject3d());
                if (!mesh.isAdd) {
                    mesh.isAdd = true;
                    mesh._fire('add', { target: mesh });
                }
                if (mesh._animation && Util.isFunction(mesh._animation)) {
                    this._animationBaseObjectMap[mesh.getObject3d().uuid] = mesh;
                }
            }
            else if (mesh instanceof THREE.Object3D) {
                scene.add(mesh);
            }
        });
        this._zoomend();
        if (render) {
            this.renderScene();
        }
        return this;
    }
    /**
     * remove object3ds
     * @param {BaseObject} meshes
     */
    removeMesh(meshes, render = true) {
        if (!meshes)
            return this;
        if (!Array.isArray(meshes)) {
            meshes = [meshes];
        }
        const scene = this.getScene();
        meshes.forEach(mesh => {
            if (mesh instanceof BaseObject) {
                scene.remove(mesh.getObject3d());
                if (mesh.isAdd) {
                    mesh.isAdd = false;
                    mesh._fire('remove', { target: mesh });
                }
                if (mesh._animation && Util.isFunction(mesh._animation)) {
                    delete this._animationBaseObjectMap[mesh.getObject3d().uuid];
                }
                const delayMeshes = this._delayMeshes;
                if (delayMeshes.length) {
                    for (let i = 0, len = delayMeshes.length; i < len; i++) {
                        if (delayMeshes[i] === mesh) {
                            delayMeshes.splice(i, 1);
                            break;
                        }
                    }
                }
            }
            else if (mesh instanceof THREE.Object3D) {
                scene.remove(mesh);
            }
        });
        if (render) {
            this.renderScene();
        }
        return this;
    }
    _initRaycaster() {
        if (!this._raycaster) {
            this._raycaster = new THREE.Raycaster();
            this._mouse = new THREE.Vector2();
        }
        return this;
    }
    /**
     *
     * @param {Coordinate} coordinate
     * @param {Object} options
     * @return {Array}
     */
    identify(coordinate, options) {
        if (!coordinate) {
            console.error('coordinate is null,it should be Coordinate');
            return [];
        }
        if (Array.isArray(coordinate)) {
            coordinate = new Coordinate(coordinate);
        }
        if (!(coordinate instanceof Coordinate)) {
            console.error('coordinate type is error,it should be Coordinate');
            return [];
        }
        const p = this.getMap().coordToContainerPoint(coordinate);
        this._containerPoint = p;
        const { x, y } = p;
        this._initRaycaster();
        const raycaster = this._raycaster, mouse = this._mouse, camera = this.getCamera(), scene = this.getScene(), size = this.getMap().getSize();
        //fix Errors will be reported when the layer is not initialized
        if (!scene) {
            return [];
        }
        const width = size.width, height = size.height;
        mouse.x = (x / width) * 2 - 1;
        mouse.y = -(y / height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        //set linePrecision for THREE.Line
        setRaycasterLinePrecision(raycaster, this._getLinePrecision(this.getMap().getResolution()));
        const children = [], hasidentifyChildren = [];
        scene.children.forEach(mesh => {
            const parent = mesh['__parent'];
            if (parent && parent.getOptions) {
                const baseObject = parent;
                const interactive = baseObject.getOptions().interactive;
                if (interactive && baseObject.isVisible()) {
                    //If baseobject has its own hit detection
                    if (baseObject.identify && Util.isFunction(baseObject.identify)) {
                        hasidentifyChildren.push(baseObject);
                    }
                    else {
                        children.push(mesh);
                    }
                }
            }
            else if (mesh instanceof THREE.Mesh || mesh instanceof THREE.Group) {
                children.push(mesh);
            }
        });
        let baseObjects = [];
        const intersects = raycaster.intersectObjects(children, true);
        if (intersects && Array.isArray(intersects) && intersects.length) {
            baseObjects = intersects.map(intersect => {
                let object = intersect.object;
                object = this._recursionMesh(object) || {};
                const baseObject = object['__parent'] || object;
                baseObject.faceIndex = intersect.faceIndex;
                baseObject.index = intersect.index;
                return baseObject;
            });
        }
        this.renderPickScene();
        if (hasidentifyChildren.length) {
            hasidentifyChildren.forEach(baseObject => {
                // baseObject identify
                if (baseObject.identify(coordinate)) {
                    baseObjects.push(baseObject);
                }
            });
        }
        const len = baseObjects.length;
        for (let i = 0; i < len; i++) {
            if (baseObjects[i]) {
                for (let j = i + 1; j < len; j++) {
                    if (baseObjects[i] === baseObjects[j]) {
                        baseObjects.splice(j, 1);
                    }
                }
            }
        }
        options = Util.extend({}, options);
        const count = options['count'];
        return (Util.isNumber(count) && count > 0 ? baseObjects.slice(0, count) : baseObjects);
    }
    /**
    * Recursively finding the root node of mesh,Until it is scene node
    * @param {*} mesh
    */
    _recursionMesh(mesh) {
        while (mesh && ((mesh.parent !== this.getScene()))) {
            mesh = mesh.parent;
        }
        return mesh;
    }
    //get Line Precision by Resolution
    _getLinePrecision(res = 10) {
        for (let i = 0, len = LINEPRECISIONS.length; i < len; i++) {
            const [resLevel, precision] = LINEPRECISIONS[i];
            if (res > resLevel) {
                return precision;
            }
        }
        return 0.01;
    }
    /**
     * fire baseObject events
     * @param {*} e
     */
    _identifyBaseObjectEvents(e) {
        if (!this.options.geometryEvents) {
            return this;
        }
        const map = this.map || this.getMap();
        //When map interaction, do not carry out mouse movement detection, which can have better performance
        if (map.isInteracting() || !map.options.geometryEvents) {
            return this;
        }
        const { type, coordinate } = e;
        const now = Util.now();
        if (this._mousemoveTimeOut && type === 'mousemove') {
            if (now - this._mousemoveTimeOut < 64) {
                return this;
            }
        }
        this._mousemoveTimeOut = now;
        map.resetCursor('default');
        const identifyCountOnEvent = this.options['identifyCountOnEvent'];
        let count = Math.max(0, Util.isNumber(identifyCountOnEvent) ? identifyCountOnEvent : 0);
        if (count === 0) {
            count = Infinity;
        }
        const baseObjects = this.identify(coordinate, { count });
        const scene = this.getScene();
        if (baseObjects.length === 0 && scene) {
            for (let i = 0, len = scene.children.length; i < len; i++) {
                const child = scene.children[i] || {};
                const parent = child['__parent'];
                if (parent) {
                    parent.fire('empty', Object.assign({}, e, { target: parent }));
                }
            }
        }
        if (type === 'mousemove') {
            if (baseObjects.length) {
                map.setCursor('pointer');
            }
            // mouseout objects
            const outBaseObjects = [];
            if (this._baseObjects) {
                this._baseObjects.forEach(baseObject => {
                    let isOut = true;
                    baseObjects.forEach(baseO => {
                        if (baseObject === baseO) {
                            isOut = false;
                        }
                    });
                    if (isOut) {
                        outBaseObjects.push(baseObject);
                    }
                });
            }
            outBaseObjects.forEach(baseObject => {
                if (baseObject && baseObject instanceof BaseObject) {
                    // reset _mouseover status
                    // Deal with the mergedmesh
                    if (baseObject.getSelectMesh) {
                        if (!baseObject.isHide) {
                            baseObject._mouseover = false;
                            baseObject.fire('mouseout', Object.assign({}, e, { target: baseObject, type: 'mouseout', selectMesh: null }));
                            baseObject.closeToolTip();
                        }
                    }
                    else {
                        baseObject._mouseover = false;
                        baseObject.fire('mouseout', Object.assign({}, e, { target: baseObject, type: 'mouseout' }));
                        baseObject.closeToolTip();
                    }
                }
            });
            baseObjects.forEach(baseObject => {
                if (baseObject instanceof BaseObject) {
                    if (!baseObject._mouseover) {
                        baseObject.fire('mouseover', Object.assign({}, e, { target: baseObject, type: 'mouseover', selectMesh: (baseObject.getSelectMesh ? baseObject.getSelectMesh() : null) }));
                        baseObject._mouseover = true;
                    }
                    baseObject.fire(type, Object.assign({}, e, { target: baseObject, selectMesh: (baseObject.getSelectMesh ? baseObject.getSelectMesh() : null) }));
                    // tooltip
                    const tooltip = baseObject.getToolTip();
                    if (tooltip && (!tooltip._owner)) {
                        tooltip.addTo(baseObject);
                    }
                    baseObject.openToolTip(coordinate);
                }
            });
            this._baseObjects = baseObjects;
        }
        else {
            baseObjects.forEach(baseObject => {
                if (baseObject instanceof BaseObject) {
                    baseObject.fire(type, Object.assign({}, e, { target: baseObject, selectMesh: (baseObject.getSelectMesh ? baseObject.getSelectMesh() : null) }));
                    if (type === 'click') {
                        const infoWindow = baseObject.getInfoWindow();
                        if (infoWindow && (!infoWindow._owner)) {
                            infoWindow.addTo(baseObject);
                        }
                        baseObject.openInfoWindow(coordinate);
                    }
                }
            });
        }
        return this;
    }
    /**
     *map zoom event
     */
    _zoomend() {
        const scene = this.getScene();
        if (!scene) {
            return;
        }
        const zoom = this.getMap().getZoom();
        scene.children.forEach(mesh => {
            const parent = mesh['__parent'];
            if (parent && parent.getOptions) {
                const baseObject = parent;
                if (baseObject.zoomChange && Util.isFunction(baseObject.zoomChange)) {
                    baseObject.zoomChange(zoom);
                }
                const minZoom = baseObject.getMinZoom(), maxZoom = baseObject.getMaxZoom();
                if (zoom < minZoom || zoom > maxZoom) {
                    if (baseObject.isVisible()) {
                        baseObject.getObject3d().visible = false;
                    }
                    baseObject._zoomVisible = false;
                }
                else if (minZoom <= zoom && zoom <= maxZoom) {
                    if (baseObject._visible) {
                        baseObject.getObject3d().visible = true;
                    }
                    baseObject._zoomVisible = true;
                }
            }
        });
    }
    onAdd() {
        super.onAdd();
        const map = this.map || this.getMap();
        if (!map)
            return this;
        EVENTS.forEach(event => {
            map.on(event, this._identifyBaseObjectEvents, this);
        });
        this._needsUpdate = true;
        if (!this._animationBaseObjectMap) {
            this._animationBaseObjectMap = {};
        }
        map.on('zooming zoomend', this._zoomend, this);
        return this;
    }
    onRemove() {
        super.onRemove();
        const map = this.map || this.getMap();
        if (!map)
            return this;
        EVENTS.forEach(event => {
            map.off(event, this._identifyBaseObjectEvents, this);
        });
        map.off('zooming zoomend', this._zoomend, this);
        return this;
    }
    _callbackBaseObjectAnimation() {
        const layer = this;
        if (layer._animationBaseObjectMap) {
            for (const uuid in layer._animationBaseObjectMap) {
                const baseObject = layer._animationBaseObjectMap[uuid];
                baseObject._animation();
            }
        }
        return this;
    }
    /**
     * To make map's 2d point's 1 pixel euqal with 1 pixel on XY plane in THREE's scene:
     * 1. fov is 90 and camera's z is height / 2 * scale,
     * 2. if fov is not 90, a ratio is caculated to transfer z to the equivalent when fov is 90
     * @return {Number} fov ratio on z axis
     */
    _getFovRatio() {
        const map = this.getMap();
        const fov = map.getFov();
        return Math.tan(fov / 2 * RADIAN);
    }
}
ThreeLayer.mergeOptions(options);
class ThreeRenderer extends CanvasLayerRenderer {
    constructor() {
        super(...arguments);
        this._renderTime = 0;
    }
    getPrepareParams() {
        return [this.scene, this.camera];
    }
    getDrawParams() {
        return [this.scene, this.camera];
    }
    _drawLayer() {
        super._drawLayer.apply(this, arguments);
        // this.renderScene();
    }
    hitDetect() {
        return false;
    }
    createCanvas() {
        super.createCanvas();
        this.createContext();
    }
    createContext() {
        if (this.canvas.gl && this.canvas.gl.wrap) {
            this.gl = this.canvas.gl.wrap();
        }
        else {
            const layer = this.layer;
            const attributes = layer.options.glOptions || {
                alpha: true,
                depth: true,
                antialias: true,
                stencil: true,
                preserveDrawingBuffer: false
            };
            attributes.preserveDrawingBuffer = true;
            this.gl = this.gl || this._createGLContext(this.canvas, attributes);
        }
        this._initThreeRenderer();
        this.layer.onCanvasCreate(this.context, this.scene, this.camera);
    }
    _initThreeRenderer() {
        this.matrix4 = new THREE.Matrix4();
        //const renderer = new THREE.WebGLRenderer({ 'context': this.gl, alpha: true });
        const renderer = this.context;
        renderer.autoClear = false;
        renderer.setClearColor(new THREE.Color(1, 1, 1), 0);
        //renderer.setSize(this.canvas.width, this.canvas.height);
        renderer.clear();
        // renderer.canvas = this.canvas;
        this.context = renderer;
        const scene = this.scene = new THREE.Scene();
        const map = this.layer.getMap();
        const fov = map.getFov() * Math.PI / 180;
        const camera = this.camera = new THREE.PerspectiveCamera(fov, map.width / map.height, map.cameraNear, map.cameraFar);
        camera.matrixAutoUpdate = false;
        this._syncCamera();
        scene.add(camera);
        this.pick = new GPUPick(this.layer);
    }
    onCanvasCreate() {
        super.onCanvasCreate();
    }
    resizeCanvas(canvasSize) {
        if (!this.canvas) {
            return;
        }
        let size, map = this.getMap();
        if (!canvasSize) {
            size = map.getSize();
        }
        else {
            size = canvasSize;
        }
        // const r = Browser.retina ? 2 : 1;
        const r = map.getDevicePixelRatio ? map.getDevicePixelRatio() : (Browser.retina ? 2 : 1);
        const canvas = this.canvas;
        //retina support
        canvas.height = r * size['height'];
        canvas.width = r * size['width'];
        if (this.layer._canvas && canvas.style) {
            canvas.style.width = size.width + 'px';
            canvas.style.height = size.height + 'px';
        }
        this.context.setSize(canvas.width, canvas.height);
    }
    clearCanvas() {
        if (!this.canvas) {
            return;
        }
        this.context.clear();
    }
    prepareCanvas() {
        this.canvas = this.layer.canvas;
        this.context = this.layer.context;
        this.gl = this.layer.gl;

        if (!this.canvas) {
            this.createCanvas();
        }
        else {
            this.clearCanvas();
        }
        this.layer.fire('renderstart', { 'context': this.context });

        
        this._initThreeRenderer();
        this.layer.onCanvasCreate(this.context, this.scene, this.camera);


        return null;
    }
    renderScene() {
        const time = Util.now();
        // Make sure to execute only once in a frame
        if (time - this._renderTime >= 16) {
            this.layer._callbackBaseObjectAnimation();
            this._renderTime = time;
        }
        this._syncCamera();
        this.context.render(this.scene, this.camera);
        this.completeRender();
    }
    remove() {
        delete this._drawContext;
        super.remove();
    }
    _syncCamera() {
        const map = this.getMap();
        const camera = this.camera;
        camera.matrix.elements = map.cameraWorldMatrix;
        camera.projectionMatrix.elements = map.projMatrix;
        //https://github.com/mrdoob/three.js/commit/d52afdd2ceafd690ac9e20917d0c968ff2fa7661
        if (this.matrix4.invert) {
            camera.projectionMatrixInverse.elements = this.matrix4.copy(camera.projectionMatrix).invert().elements;
        }
        else {
            camera.projectionMatrixInverse.elements = this.matrix4.getInverse(camera.projectionMatrix).elements;
        }
    }
    _createGLContext(canvas, options) {
        const names = ['webgl2', 'webgl', 'experimental-webgl'];
        let context = null;
        /* eslint-disable no-empty */
        for (let i = 0; i < names.length; ++i) {
            try {
                context = canvas.getContext(names[i], options);
            }
            catch (e) { }
            if (context) {
                break;
            }
        }
        return context;
        /* eslint-enable no-empty */
    }
}
ThreeLayer.registerRenderer('gl', ThreeRenderer);
function getGLRes(map) {
    return map.getGLRes ? map.getGLRes() : map.getGLZoom();
}
function coordinateToPoint(map, coordinate, res, out) {
    if (map.coordToPointAtRes) {
        return map.coordToPointAtRes(coordinate, res, out);
    }
    return map.coordinateToPoint(coordinate, res, out);
}
export { ThreeLayer, ThreeRenderer, BaseObject, MergedMixin, GeoJSONUtil, MergeGeometryUtil, GeoUtil, ExtrudeUtil, LineUtil, IdentifyUtil, geometryExtrude, LineMaterial };
if (registerWorkerAdapter) {
    registerWorkerAdapter(getWorkerName(), getWorkerCode());
}