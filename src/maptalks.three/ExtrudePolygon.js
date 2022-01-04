import * as Util from '../core/util';
import BaseObject from './BaseObject';
import { setBottomHeight } from './util';
import { getExtrudeGeometry, initVertexColors } from './util/ExtrudeUtil';
import { getGeoJSONCenter, isGeoJSONPolygon } from './util/GeoJSONUtil';
import { getVertexColors } from './util/ThreeAdaptUtil';
const OPTIONS = {
    altitude: 0,
    height: 1,
    bottomHeight: 0,
    topColor: null,
    bottomColor: '#2d2f61',
};
/**
 *
 */
class ExtrudePolygon extends BaseObject {
    constructor(polygon, options, material, layer) {
        options = Util.extend({}, OPTIONS, options, { layer, polygon });
        super();
        this._initOptions(options);
        const { height, topColor, bottomColor, altitude, bottomHeight } = options;
        const geometry = getExtrudeGeometry(polygon, height, layer);
        const center = (isGeoJSONPolygon(polygon) ? getGeoJSONCenter(polygon) : polygon.getCenter());
        const h = setBottomHeight(geometry, bottomHeight, layer);
        if (topColor) {
            const extrudeH = layer.distanceToVector3(height, height).x;
            initVertexColors(geometry, bottomColor, topColor, h + extrudeH / 2);
            material.vertexColors = getVertexColors();
        }
        this._createMesh(geometry, material);
        const z = layer.distanceToVector3(altitude, altitude).x;
        const v = layer.coordinateToVector3(center, z);
        this.getObject3d().position.copy(v);
        this.type = 'ExtrudePolygon';
    }
}
export default ExtrudePolygon;