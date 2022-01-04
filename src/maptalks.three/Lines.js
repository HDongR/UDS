import * as Util from '../core/util';
import * as THREE from '../three/build/three.module';
import BaseObject from './BaseObject';
import { getLinePosition, LineStringSplit, setLineSegmentPosition } from './util/LineUtil';
import MergedMixin from './MergedMixin';
import Line from './Line';
import { isGeoJSONLine } from './util/GeoJSONUtil';
import { addAttribute, getVertexColors } from './util/ThreeAdaptUtil';
import { getCenterOfPoints, getGeometriesColorArray, setBottomHeight } from './util/index';
const OPTIONS = {
    altitude: 0,
    colors: null
};
/**
 *
 */
class Lines extends MergedMixin(BaseObject) {
    constructor(lineStrings, options, material, layer) {
        if (!Array.isArray(lineStrings)) {
            lineStrings = [lineStrings];
        }
        const centers = [], lineStringList = [];
        const len = lineStrings.length;
        for (let i = 0; i < len; i++) {
            const lineString = lineStrings[i];
            const result = LineStringSplit(lineString);
            centers.push(result.center);
            lineStringList.push(result.lineStrings);
        }
        // Get the center point of the point set
        const center = getCenterOfPoints(centers);
        options = Util.extend({}, OPTIONS, options, { layer, lineStrings, coordinate: center });
        const lines = [], cache = {};
        let faceIndex = 0, faceMap = [], geometriesAttributes = [], psIndex = 0, ps = [];
        for (let i = 0; i < len; i++) {
            const lls = lineStringList[i];
            let psCount = 0;
            for (let m = 0, le = lls.length; m < le; m++) {
                const properties = (isGeoJSONLine(lls[m]) ? lls[m]['properties'] : lls[m].getProperties() || {});
                const { positionsV } = getLinePosition(lls[m], layer, center);
                setBottomHeight(positionsV, properties.bottomHeight, layer, cache);
                psCount += (positionsV.length * 2 - 2);
                setLineSegmentPosition(ps, positionsV);
            }
            // const line = new Line(lineString, opts, material, layer);
            // lines.push(line);
            // const psCount = positionsV.length + positionsV.length - 2;
            const faceLen = psCount;
            faceMap[i] = [faceIndex, faceIndex + faceLen];
            faceIndex += faceLen;
            geometriesAttributes[i] = {
                position: {
                    count: psCount,
                    start: psIndex,
                    end: psIndex + psCount * 3,
                },
                hide: false
            };
            psIndex += psCount * 3;
        }
        const geometry = new THREE.BufferGeometry();
        addAttribute(geometry, 'position', new THREE.Float32BufferAttribute(ps, 3));
        super();
        this._initOptions(options);
        this._createLineSegments(geometry, material);
        const { altitude } = options;
        const z = layer.distanceToVector3(altitude, altitude).x;
        const v = layer.coordinateToVector3(center, z);
        this.getObject3d().position.copy(v);
        this._faceMap = faceMap;
        this._baseObjects = lines;
        this._datas = lineStrings;
        this._geometriesAttributes = geometriesAttributes;
        this.faceIndex = null;
        this.index = null;
        this._geometryCache = geometry.clone();
        this.isHide = false;
        this._colorMap = {};
        this._initBaseObjectsEvent(lines);
        this._setPickObject3d();
        this._init();
        this.type = 'Lines';
    }
    // eslint-disable-next-line consistent-return
    getSelectMesh() {
        const index = this._getIndex();
        if (index != null) {
            if (!this._baseObjects[index]) {
                const lineString = this._datas[index];
                const opts = Util.extend({}, this.getOptions(), { index }, isGeoJSONLine(lineString) ? lineString.properties : lineString.getProperties());
                this._baseObjects[index] = new Line(lineString, opts, this.getObject3d().material, this.getLayer());
                this._proxyEvent(this._baseObjects[index]);
            }
            return {
                data: this._datas[index],
                baseObject: this._baseObjects[index]
            };
        }
    }
    _setPickObject3d() {
        const geometry = this._geometryCache || this.getObject3d().geometry.clone();
        const pick = this.getLayer().getPick();
        const { _geometriesAttributes } = this;
        const len = _geometriesAttributes.length;
        const colors = getGeometriesColorArray(_geometriesAttributes);
        let cIndex = 0;
        for (let i = 0; i < len; i++) {
            const color = pick.getColor();
            const colorIndex = color.getHex();
            this._colorMap[colorIndex] = i;
            const { count } = _geometriesAttributes[i].position;
            this._datas[i].colorIndex = colorIndex;
            for (let j = 0; j < count; j++) {
                colors[cIndex] = color.r;
                colors[cIndex + 1] = color.g;
                colors[cIndex + 2] = color.b;
                cIndex += 3;
            }
        }
        addAttribute(geometry, 'color', new THREE.BufferAttribute(colors, 3, true));
        const material = this.getObject3d().material.clone();
        material.color.set('#fff');
        material.vertexColors = getVertexColors();
        const color = pick.getColor();
        const colorIndex = color.getHex();
        const mesh = new THREE.LineSegments(geometry, material);
        mesh.position.copy(this.getObject3d().position);
        mesh['_colorIndex'] = colorIndex;
        this.setPickObject3d(mesh);
    }
    // eslint-disable-next-line no-unused-vars
    identify(coordinate) {
        return this.picked;
    }
}
export default Lines;