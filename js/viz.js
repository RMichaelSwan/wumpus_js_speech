import * as THREE from 'three';

const  renderer = new THREE.WebGLRenderer({canvas: document.querySelector("canvas")});

// There's no reason to set the aspect here because we're going
// to set it every frame anyway so we'll set it to 2 since 2
// is the the aspect for the canvas default size (300w/150h = 2)
const  camera = new THREE.PerspectiveCamera(70, 2, 1, 1000);
camera.position.z = 400;

const scene = new THREE.Scene();
const geometry = new THREE.DodecahedronGeometry(150);
const material = new THREE.MeshPhongMaterial({
  color: 0x35F555,
  specular: 0xffffff,
  shininess: 30,
  shading: THREE.SmoothShading
});

const player_geo = new THREE.TetrahedronGeometry(25)
const player_mat = new THREE.MeshPhongMaterial({
  color: 0xF5F555,
  specular: 0xffffff,
  shininess: 30,
  shading: THREE.SmoothShading
});
const player = new THREE.Mesh( player_geo, player_mat ); 
const world = new THREE.Mesh(geometry, material);
scene.add(world);
world.add( player );
player.position.set(0,50,150);
player.rotation.set(15,15,0)

const light1 = new THREE.PointLight(0xff80C0, 2, 0);
light1.position.set(200, 100, 300);
scene.add(light1);

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

  world.rotation.x = time * 0.5;
  world.rotation.y = time * 1;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

const resizeObserver = new ResizeObserver(resizeCanvasToDisplaySize);
resizeObserver.observe(renderer.domElement, {box: 'content-box'});
