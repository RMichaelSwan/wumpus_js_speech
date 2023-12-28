import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';

let controls;


const renderer = new THREE.WebGLRenderer({canvas: document.querySelector("canvas")});

// There's no reason to set the aspect here because we're going
// to set it every frame anyway so we'll set it to 2 since 2
// is the the aspect for the canvas default size (300w/150h = 2)
const camera = new THREE.PerspectiveCamera(70, 2, 1, 1000);
camera.position.z = 400;
controls = new MapControls( camera, renderer.domElement );
controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 100;
controls.maxDistance = 500;
controls.maxPolarAngle = 2*Math.PI;

const scene = new THREE.Scene();
scene.background = new THREE.Color( 0xcccccc );
const geometry = new THREE.DodecahedronGeometry(150, 0);
const material = new THREE.MeshPhongMaterial({
  color: 0x35F555,
  specular: 0xffffff,
  shininess: 30,
});

// Get vertices from the geometry.attributes.position
const positions = geometry.attributes.position.array;
const vertices = [];

// Extract unique vertices
for (let i = 0; i < positions.length; i += 3) {
  const x = positions[i];
  const y = positions[i + 1];
  const z = positions[i + 2];
  const vertex = new THREE.Vector3(x, y, z);

  // Check if the vertex is already in the array
  if (!vertices.some(v => v.equals(vertex))) {
    vertices.push(vertex);
  }
}

// Output unique vertices
console.log(vertices);
// Output unique vertices as a string
const verticesString = vertices.map(v => `(${v.x}, ${v.y}, ${v.z})`).join(', ');
console.log(verticesString);


function findClosestVertices(allVertices, targetVertex, minDistanceThreshold = 0.001) {
  // Calculate distances to all vertices
  const distances = allVertices.map(vertex => {
    return {
      vertex,
      distance: targetVertex.distanceTo(vertex),
    };
  });

  // Sort distances in ascending order
  distances.sort((a, b) => a.distance - b.distance);

  // Filter out vertices that are very close to the target vertex
  const filteredDistances = distances.filter(item => item.distance > minDistanceThreshold);

  // Get the closest 3 vertices after filtering
  const closestVertices = filteredDistances.slice(0, 3).map(item => item.vertex);

  return closestVertices;
}


const targetVertex = vertices[0];
const closestVertices = findClosestVertices(vertices, targetVertex);

const closestVerticesString = closestVertices.map(v => `(${v.x}, ${v.y}, ${v.z})`).join(', ');
console.log("Closest Vertices:", closestVerticesString);



// const uniqueVertices = Array.from(new Set(vertices.map(v => v.toArray().toString())), s => new THREE.Vector3(...s.split(',').map(Number)));
// Output unique vertices
// console.log(uniqueVertices);
// console.log("Dodecahedron vertices:" + geometry.attributes.position);

const pit_geo = new THREE.CylinderGeometry( 20, 1, 20, 32 ); 
const pit_mat = new THREE.MeshPhongMaterial({
  color: 0xcccccc,
  specular: 0xff0000,
  shininess: 10,
}); 
const pit = new THREE.Mesh( pit_geo, pit_mat );

const player_geo = new THREE.TetrahedronGeometry(25)
const player_mat = new THREE.MeshPhongMaterial({
  color: 0xF5F555,
  specular: 0xffffff,
  shininess: 30
});
const player = new THREE.Mesh( player_geo, player_mat ); 
const world = new THREE.Mesh(geometry, material);
scene.add(world);
// world.position.set(0,0,0);
world.add( player );
world.add( pit );

function calculateRotationTowardsCenter(shapePosition, orientation = [0,-1, 0], dodecahedronCenter = new THREE.Vector3(0, 0, 0)) {
  // Calculate the direction vector pointing from the shape to the center
  const direction = new THREE.Vector3().subVectors(dodecahedronCenter, shapePosition).normalize();

  // Calculate the rotation quaternion
  const rotationQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...orientation), direction);

  // Convert the rotation quaternion to Euler angles
  const rotationEuler = new THREE.Euler().setFromQuaternion(rotationQuaternion);
  // Output rotation as a tuple
  const rotationTuple = [rotationEuler.x, rotationEuler.y, rotationEuler.z];
  return rotationTuple;
}
// let shape_pos = [86.6,86.6,86.6]
let shape_pos = [0,-53.52,140.126];
// let shape_pos = [53.523,140.125,0];
let shapePosition = new THREE.Vector3(...shape_pos);
pit.position.set(...shape_pos);
pit.rotation.set(...calculateRotationTowardsCenter(shapePosition));

shape_pos = [0,53.523,140.125]
// shape_pos = [0,-53.52,140.126];
// shape_pos = [-86.6,86.6,86.6]
// shape_pos = [53.523,140.125,0]
shapePosition = new THREE.Vector3(...shape_pos);
player.position.set(...shape_pos);
// FIXME: for some reason tetrahedron rotation does not work properly
player.rotation.set(...calculateRotationTowardsCenter(shapePosition,[0.4,0.4,0.0]))
// player.rotation.set(-0.83,-0.83,1.57)


// const light1 = new THREE.PointLight(0xff80C0, 2, 0);
// light1.position.set(200, 100, 300);
// scene.add(light1);

const dirLight1 = new THREE.DirectionalLight( 0xffffff, 1 );
dirLight1.position.set( 1, 1, 1 );
scene.add( dirLight1 );

const dirLight2 = new THREE.DirectionalLight( 0xffffff, 1 );
dirLight2.position.set( - 1, - 1, - 1 );
scene.add( dirLight2 );

const ambientLight = new THREE.AmbientLight( 0x555555 );
scene.add( ambientLight );

function resizeCanvasToDisplaySize() {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  // you must pass false here or three.js sadly fights the browser
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  // set render target sizes here
}

function animate(time) {
  time *= 0.001;  // seconds

  // world.rotation.x = time * 0.5;
  // world.rotation.y = time * 1;
  controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

const resizeObserver = new ResizeObserver(resizeCanvasToDisplaySize);
resizeObserver.observe(renderer.domElement, {box: 'content-box'});
