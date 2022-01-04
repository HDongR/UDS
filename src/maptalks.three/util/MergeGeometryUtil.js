import * as THREE from '../../three/build/three.module';
import { addAttribute } from './ThreeAdaptUtil';
export function mergeBufferGeometries(geometries) {
    const { position, normal, uv, indices } = mergeBufferGeometriesAttribute(geometries);
    const bufferGeomertry = new THREE.BufferGeometry();
    const color = new Float32Array(position.length);
    color.fill(1, 0, position.length);
    addAttribute(bufferGeomertry, 'color', new THREE.BufferAttribute(color, 3));
    addAttribute(bufferGeomertry, 'normal', new THREE.BufferAttribute(normal, 3));
    addAttribute(bufferGeomertry, 'position', new THREE.BufferAttribute(position, 3));
    if (uv && uv.length) {
        addAttribute(bufferGeomertry, 'uv', new THREE.BufferAttribute(uv, 2));
    }
    bufferGeomertry.setIndex(new THREE.BufferAttribute(indices, 1));
    return bufferGeomertry;
}
export function mergeBufferGeometriesAttribute(geometries) {
    const attributes = {}, attributesLen = {};
    for (let i = 0; i < geometries.length; ++i) {
        const geometry = geometries[i];
        for (const name in geometry) {
            if (attributes[name] === undefined) {
                attributes[name] = [];
                attributesLen[name] = 0;
            }
            attributes[name].push(geometry[name]);
            attributesLen[name] += geometry[name].length;
        }
    }
    // merge attributes
    const mergedGeometry = {};
    let indexOffset = 0;
    const mergedIndex = new Uint32Array(attributesLen['indices']);
    for (const name in attributes) {
        if (name === 'indices') {
            const indices = attributes[name];
            let iIndex = 0;
            for (let i = 0, len = indices.length; i < len; i++) {
                const index = indices[i];
                for (let j = 0, len1 = index.length; j < len1; j++) {
                    mergedIndex[iIndex] = index[j] + indexOffset;
                    iIndex++;
                    // mergedIndex.push(index[j] + indexOffset);
                }
                indexOffset += attributes['position'][i].length / 3;
            }
        }
        else {
            const mergedAttribute = mergeBufferAttributes(attributes[name], attributesLen[name]);
            if (!mergedAttribute)
                return null;
            mergedGeometry[name] = mergedAttribute;
        }
    }
    mergedGeometry['indices'] = mergedIndex;
    return mergedGeometry;
}
function mergeBufferAttributes(attributes, arrayLength) {
    const array = new Float32Array(arrayLength);
    let offset = 0;
    for (let i = 0; i < attributes.length; ++i) {
        array.set(attributes[i], offset);
        offset += attributes[i].length;
    }
    return array;
}
export function generateBufferGeometry(data) {
    //arraybuffer data
    const { position, normal, uv, indices } = data;
    // const color = new Float32Array(position.length);
    // color.fill(1, 0, position.length);
    const bufferGeomertry = new THREE.BufferGeometry();
    // addAttribute(bufferGeomertry, 'color', new THREE.BufferAttribute(color, 3));
    addAttribute(bufferGeomertry, 'normal', new THREE.BufferAttribute(new Float32Array(normal), 3));
    addAttribute(bufferGeomertry, 'position', new THREE.BufferAttribute(new Float32Array(position), 3));
    addAttribute(bufferGeomertry, 'uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
    bufferGeomertry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
    return bufferGeomertry;
}
export function generatePickBufferGeometry(geometry) {
    const bufferGeomertry = new THREE.BufferGeometry();
    addAttribute(bufferGeomertry, 'normal', geometry.getAttribute('normal'));
    addAttribute(bufferGeomertry, 'position', geometry.getAttribute('position').clone());
    bufferGeomertry.setIndex(geometry.getIndex());
    return bufferGeomertry;
}
let defaultBufferGeometry;
export function getDefaultBufferGeometry() {
    if (!defaultBufferGeometry) {
        const SIZE = 0.000001;
        defaultBufferGeometry = new THREE.BoxBufferGeometry(SIZE, SIZE, SIZE);
    }
    return defaultBufferGeometry;
}