import { version } from '../../package.json';
import * as THREE from '../three/build/three.module';
import { cvt3 } from '../control/util/geoutil';
import Map from '../map/handler/Map';

export let map = {
  canvas:null,
  renderer:null,
  scene:null,
  camera:null,
  spatialReference:null,
  handler:null,
  inputElement:null,
  mapConfig:null,
};

export function addScene(obj) {
  map.scene.add(obj);
}

export function init(data) {   /* eslint-disable-line no-unused-vars */

  const {canvas, inputElement, mapConfig} = data;
  map.inputElement = inputElement;
  map.mapConfig = mapConfig;
  map.canvas = canvas;
  map.renderer = new THREE.WebGLRenderer({ canvas:map.canvas });
  map.renderer.setSize(inputElement.width, inputElement.height, false);

  map.scene = new THREE.Scene();
  const light = new THREE.DirectionalLight(0xFFFFFF, 1);
  light.position.set(-1, 2, 4);
  map.scene.add(light);
 
  onLoadRender(map.scene);
  makeBox();
  addEvent();
}

function addEvent(){
  let maptalks = new Map(map);
  //let dragHandler = new DragHandler(map);
}

function onLoadRender(scene){
  scene.background = new THREE.Color(0xcccccc);
  scene.fog = new THREE.FogExp2(0xcccccc, 0.00002);

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false }));
  let centerPos = cvt3([map.mapConfig.center[0], map.mapConfig.center[1]], 0);
  centerPos = [centerPos.x, centerPos.y, centerPos.z];
  mesh.position.set(centerPos[0], 0, centerPos[1]);
  mesh.rotation.x = - Math.PI / 2;
  scene.add(mesh);



  const axesHelper = new THREE.AxesHelper(50000);
  axesHelper.position.set(centerPos[0], 0, centerPos[1]);
  scene.add(axesHelper);


  const grid = new THREE.GridHelper(200, 40, 0x000000, 0x000000);
  grid.material.opacity = 0.2;
  grid.material.transparent = true;
  scene.add(grid);

  grid.position.set(centerPos[0], 0, centerPos[1]);


  requestAnimationFrame(render);

  const fov = 75;
  const aspect = 2; // the canvas default
  const near = 0.1;
  const far = 500000;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  map.camera = camera;
  camera.position.set(centerPos[0], 20, centerPos[1] + 100);

  

  camera.lookAt(centerPos[0], 0, centerPos[1]);

  const helper = new THREE.CameraHelper(camera);
  scene.add(helper);
  helper.position.set(centerPos[0], centerPos[1], 0);
}

let cubes = [];
function makeBox(){
  const boxWidth = 1;
  const boxHeight = 1;
  const boxDepth = 1;
  const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

  cubes = [
    makeInstance(geometry, 0xff0000, -2),
    makeInstance(geometry, 0x00ff00, 0),
    makeInstance(geometry, 0x0000ff, 2),
  ];
}

function makeInstance(geometry, color, x) {
  const material = new THREE.MeshPhongMaterial({
    color,
  });

  const cube = new THREE.Mesh(geometry, material);
  map.scene.add(cube);
  cube.position.x = x;

  let centerPos = cvt3([map.mapConfig.center[0], map.mapConfig.center[1]], 0);
  centerPos = [centerPos.x, centerPos.y, centerPos.z];

  cube.position.x = centerPos[0] + x;
  cube.position.z = centerPos[1] + x;
  cube.position.y = x;

  return cube;
}

let matrix4 = new THREE.Matrix4();
function syncCamera(){
  if(camera){
    //const map = maptalks.getMap();
    camera.matrix.elements = map.cameraWorldMatrix;
    camera.projectionMatrix.elements = map.projMatrix;
    //https://github.com/mrdoob/three.js/commit/d52afdd2ceafd690ac9e20917d0c968ff2fa7661
    if (matrix4.invert) {
        camera.projectionMatrixInverse.elements = matrix4.copy(camera.projectionMatrix).invert().elements;
    } else {
        camera.projectionMatrixInverse.elements = matrix4.getInverse(camera.projectionMatrix).elements;
    }
  }
}

function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement;
  const width = map.inputElement.clientWidth;
  const height = map.inputElement.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
}

function render(time) {
  time *= 0.001;

  if (resizeRendererToDisplaySize(map.renderer)) {
    //camera.aspect = inputElement.clientWidth / inputElement.clientHeight;
    //camera.updateProjectionMatrix();
  }
  //console.log(camera.zoom);

  cubes.forEach((cube, ndx) => {
    const speed = 1 + ndx * .1;
    const rot = time * speed;
    cube.rotation.x = rot;
    cube.rotation.y = rot;
  });

//   //pickHelper.pick(pickPosition, scene, camera, time);

  map.renderer.render(map.scene, map.camera);
//   //console.log(controls);
//   //camera.rotation.x =  Math.PI / 2;
//   // camera.projectionMatrix.elements = [
//   //   1.5,0,0,0,
//   //   0,3,0,0,
//   //   0,0,-1,-1,
//   //   0, 0, -350,1];
//   //camera.projectionMatrixInverse.copy(renderer.matrix4).invert();
//   //console.log(camera.aspect, camera.far, camera.fov, camera.matrix, camera.matrixWorld, camera.matrixWorldInverse, camera.near, camera.position, camera.projectionMatrix, camera.projectionMatrixInverse, camera.quaternion, camera.rotation);

//   // console.log('camera matrix m', camera.matrix);
//   // console.log('camera projection m', camera.projectionMatrix);
//   // console.log('camera projectionInverse m', camera.projectionMatrixInverse);
//   // console.log('camera matrixWorld m', camera.matrixWorld);
//   // console.log('camera matrixWorldInverse m', camera.matrixWorldInverse);
//   //console.log(controls);

  //syncCamera();
  requestAnimationFrame(render);
}