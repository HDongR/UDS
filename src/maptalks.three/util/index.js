import {default as Coordinate} from '../../geo/Coordinate';
import * as THREE from '../../three/build/three.module';
//Using cache to reduce computation
export function distanceToVector3(distance, layer, cache = {}) {
    if (cache[distance] === undefined) {
        cache[distance] = layer.distanceToVector3(distance, distance).x;
    }
    return cache[distance];
}
/**
 *Get the center point of the point set
 * @param {*} coordinates
 */
export function getCenterOfPoints(coordinates = []) {
    let sumX = 0, sumY = 0;
    const len = coordinates.length;
    for (let i = 0; i < len; i++) {
        const { coordinate, lnglat, lnglats, xy, xys } = coordinates[i];
        const c = coordinate || lnglat || lnglats || xy || xys || coordinates[i];
        let x, y;
        if (Array.isArray(c)) {
            x = c[0];
            y = c[1];
        }
        else if (c instanceof Coordinate) {
            x = c.x;
            y = c.y;
        }
        sumX += x;
        sumY += y;
    }
    return new Coordinate(sumX / len, sumY / len);
}
export function setBottomHeight(geometry, bottomHeight, layer, cache) {
    if (bottomHeight === undefined || typeof bottomHeight !== 'number' || bottomHeight === 0) {
        return 0;
    }
    let position;
    if (geometry instanceof THREE.BufferGeometry) {
        position = geometry.attributes.position.array;
    }
    else if (Array.isArray(geometry)) {
        position = geometry;
    }
    else {
        position = geometry.position;
    }
    let h = 0;
    if (position) {
        if (cache) {
            if (cache[bottomHeight] === undefined) {
                cache[bottomHeight] = layer.distanceToVector3(bottomHeight, bottomHeight).x;
            }
            h = cache[bottomHeight];
        }
        else {
            h = layer.distanceToVector3(bottomHeight, bottomHeight).x;
        }
        const len = position.length;
        if (position[0] instanceof THREE.Vector3) {
            for (let i = 0; i < len; i++) {
                position[i].z += h;
            }
        }
        else {
            for (let i = 0; i < len; i += 3) {
                position[i + 2] += h;
            }
        }
    }
    return h;
}
export function getGeometriesColorArray(geometriesAttributes) {
    const len = geometriesAttributes.length;
    let colorsLen = 0;
    for (let i = 0; i < len; i++) {
        const { count } = geometriesAttributes[i].position;
        colorsLen += count;
    }
    return new Float32Array(colorsLen * 3);
}