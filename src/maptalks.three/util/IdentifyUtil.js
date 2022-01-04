import * as THREE from '../../three/build/three.module';
import { distanceToVector3 } from './index';
function positionsConvert(worldPoints, altitude = 0, layer) {
    const vectors = [], cache = {};
    for (let i = 0, len = worldPoints.length; i < len; i += 3) {
        let x = worldPoints[i], y = worldPoints[i + 1], z = worldPoints[i + 2];
        if (altitude > 0) {
            z += distanceToVector3(altitude, layer, cache);
        }
        vectors.push(new THREE.Vector3(x, y, z));
    }
    return vectors;
}
export function vectors2Pixel(worldPoints, size, camera, altitude = 0, layer) {
    if (!(worldPoints[0] instanceof THREE.Vector3)) {
        worldPoints = positionsConvert(worldPoints, altitude, layer);
    }
    const pixels = worldPoints.map(worldPoint => {
        return vector2Pixel(worldPoint, size, camera);
    });
    return pixels;
}
// eslint-disable-next-line camelcase
export function vector2Pixel(world_vector, size, camera) {
    // eslint-disable-next-line camelcase
    const vector = world_vector.project(camera);
    const halfWidth = size.width / 2;
    const halfHeight = size.height / 2;
    const result = {
        x: Math.round(vector.x * halfWidth + halfWidth),
        y: Math.round(-vector.y * halfHeight + halfHeight)
    };
    return result;
}