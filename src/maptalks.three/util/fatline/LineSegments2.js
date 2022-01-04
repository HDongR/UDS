/**
 * @author WestLangley / http://github.com/WestLangley
 *
 */
 import * as THREE from '../../../three/build/three.module';
import LineSegmentsGeometry from './LineSegmentsGeometry';
import { addAttribute } from '../ThreeAdaptUtil';
import LineMaterial from './LineMaterial';
class LineSegments2 extends THREE.Mesh {
    constructor(geometry, material) {
        super(geometry, material);
        this.isLineSegments2 = true;
        this.type = 'LineSegments2';
        this.geometry = geometry !== undefined ? geometry : new LineSegmentsGeometry();
        this.material = material !== undefined ? material : new LineMaterial({ color: Math.random() * 0xffffff });
    }
    computeLineDistances() {
        var start = new THREE.Vector3();
        var end = new THREE.Vector3();
        var geometry = this.geometry;
        var instanceStart = geometry.attributes.instanceStart;
        var instanceEnd = geometry.attributes.instanceEnd;
        var lineDistances = new Float32Array(2 * instanceStart.data.count);
        for (var i = 0, j = 0, l = instanceStart.data.count; i < l; i++, j += 2) {
            start.fromBufferAttribute(instanceStart, i);
            end.fromBufferAttribute(instanceEnd, i);
            lineDistances[j] = (j === 0) ? 0 : lineDistances[j - 1];
            lineDistances[j + 1] = lineDistances[j] + start.distanceTo(end);
        }
        var instanceDistanceBuffer = new THREE.InstancedInterleavedBuffer(lineDistances, 2, 1); // d0, d1
        addAttribute(geometry, 'instanceDistanceStart', new THREE.InterleavedBufferAttribute(instanceDistanceBuffer, 1, 0));
        addAttribute(geometry, 'instanceDistanceEnd', new THREE.InterleavedBufferAttribute(instanceDistanceBuffer, 1, 1));
        // geometry.addAttribute('instanceDistanceStart', new THREE.InterleavedBufferAttribute(instanceDistanceBuffer, 1, 0)); // d0
        // geometry.addAttribute('instanceDistanceEnd', new THREE.InterleavedBufferAttribute(instanceDistanceBuffer, 1, 1)); // d1
        return this;
    }
}
;
export default LineSegments2;