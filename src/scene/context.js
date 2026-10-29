import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

export function createSceneContext() {
/* ============ RENDERER ============ */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.localClippingEnabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06070a);
scene.fog = new THREE.Fog(0x06070a, 40, 110);

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(7.5, 11, 22);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(7.5, 3, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 6;
controls.maxDistance = 55;
controls.maxPolarAngle = Math.PI * 0.495;

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

/* ============ CLIP PLANES ============ */
const clipPlane    = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.0);
const clipPlaneIMM = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.0);
const CLIP     = { clippingPlanes: [clipPlane],    clipShadows: true };
const CLIP_IMM = { clippingPlanes: [clipPlaneIMM], clipShadows: true };

/* ============ LIGHTS ============ */
scene.add(new THREE.AmbientLight(0xffffff, 0.25));
scene.add(new THREE.HemisphereLight(0x9dc4ff, 0x0a0d12, 0.55));

const keyLight = new THREE.DirectionalLight(0xfff2e0, 2.2);
keyLight.position.set(9, 18, 14);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(window.innerWidth < 900 ? 1024 : 2048, window.innerWidth < 900 ? 1024 : 2048);
const sh = keyLight.shadow.camera;
sh.left = -22; sh.right = 22; sh.top = 20; sh.bottom = -20; sh.near = 1; sh.far = 80;
keyLight.shadow.bias = -0.0005;
keyLight.shadow.normalBias = 0.025;
scene.add(keyLight);

const fill = new THREE.DirectionalLight(0x8ab8e8, 1.0);
fill.position.set(-12, 6, -10);
scene.add(fill);

const rimLPE = new THREE.PointLight(0xff8040, 40, 34, 2);
rimLPE.position.set(-11, 5, -8);
scene.add(rimLPE);

const rimIMM = new THREE.PointLight(0x6fb8ff, 35, 30, 2);
rimIMM.position.set(20, 6, -6);
scene.add(rimIMM);

/* ============ MATERIALS ============ */
const MAT = {
  shell:    new THREE.MeshStandardMaterial({ color: 0x6c737c, metalness: 0.80, roughness: 0.58, envMapIntensity: 0.9, ...CLIP }),
  insul:    new THREE.MeshStandardMaterial({ color: 0xe4dcc8, metalness: 0.02, roughness: 0.98, ...CLIP }),
  former:   new THREE.MeshStandardMaterial({ color: 0xd2cec5, metalness: 0.04, roughness: 0.92, ...CLIP }),
  coil:     new THREE.MeshStandardMaterial({ color: 0x3a2517, metalness: 0.92, roughness: 0.42, emissive: 0xff5a10, emissiveIntensity: 2.3, ...CLIP }),
  ceramic:  new THREE.MeshStandardMaterial({ color: 0xd6d2ca, metalness: 0.04, roughness: 0.85, ...CLIP }),
  tcSheath: new THREE.MeshStandardMaterial({ color: 0x8a8a85, metalness: 0.90, roughness: 0.40 }),
  terminal: new THREE.MeshStandardMaterial({ color: 0xb8b8b0, metalness: 0.95, roughness: 0.35 }),

  steel:    new THREE.MeshStandardMaterial({ color: 0xc3ccd5, metalness: 1.0, roughness: 0.24, envMapIntensity: 1.5 }),
  steel2:   new THREE.MeshStandardMaterial({ color: 0x939da8, metalness: 1.0, roughness: 0.38, envMapIntensity: 1.3 }),
  steel3:   new THREE.MeshStandardMaterial({ color: 0x5b636d, metalness: 1.0, roughness: 0.52, envMapIntensity: 1.1 }),
  dark:     new THREE.MeshStandardMaterial({ color: 0x14161a, metalness: 0.55, roughness: 0.62 }),
  copper:   new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 1.0, roughness: 0.30, envMapIntensity: 1.7 }),
  rubber:   new THREE.MeshStandardMaterial({ color: 0x0c0e11, metalness: 0.1, roughness: 0.94 }),
  hoseBlue: new THREE.MeshStandardMaterial({ color: 0x1550a0, metalness: 0.1, roughness: 0.72 }),
  hoseRed:  new THREE.MeshStandardMaterial({ color: 0x8a2418, metalness: 0.1, roughness: 0.72 }),

  glass:    new THREE.MeshPhysicalMaterial({
              color: 0xdff4ff, metalness: 0.0, roughness: 0.03,
              transparent: true, opacity: 0.11, depthWrite: false,
              envMapIntensity: 2.6, clearcoat: 1.0, clearcoatRoughness: 0.02,
              side: THREE.DoubleSide
            }),

  graphite:     new THREE.MeshStandardMaterial({ color: 0x33373c, metalness: 0.45, roughness: 0.72 }),
  graphiteDark: new THREE.MeshStandardMaterial({ color: 0x202327, metalness: 0.40, roughness: 0.80 }),
  substrate:    new THREE.MeshStandardMaterial({ color: 0x6db8e8, metalness: 0.75, roughness: 0.20, emissive: 0x0a2a44, emissiveIntensity: 1.0 }),

  ledG: new THREE.MeshStandardMaterial({ color: 0x001a05, emissive: 0x36ff78, emissiveIntensity: 3.5 }),
  ledA: new THREE.MeshStandardMaterial({ color: 0x1a0d00, emissive: 0xffa02a, emissiveIntensity: 3.5 }),
  ledR: new THREE.MeshStandardMaterial({ color: 0x1a0505, emissive: 0xff2a2a, emissiveIntensity: 3.0 }),

  bubblerGlass: new THREE.MeshPhysicalMaterial({ color: 0xcfe9ff, metalness: 0, roughness: 0.04,
    transparent: true, opacity: 0.18, clearcoat: 1, clearcoatRoughness: 0.02 }),
  oil: new THREE.MeshStandardMaterial({ color: 0x2a7fd6, metalness: 0.2, roughness: 0.15, emissive: 0x0a3a6a, emissiveIntensity: 0.9 }),
  bubble: new THREE.MeshPhysicalMaterial({ color: 0xdff4ff, metalness: 0, roughness: 0.05,
    transparent: true, opacity: 0.55, clearcoat: 1 }),
  pd: new THREE.MeshStandardMaterial({ color: 0xbfc7d0, metalness: 1.0, roughness: 0.22, envMapIntensity: 1.6 }),
  hotPd: new THREE.MeshStandardMaterial({ color: 0x331a08, emissive: 0xff5a15, emissiveIntensity: 1.8, roughness: 0.5 }),
  gaugeFace: new THREE.MeshStandardMaterial({ color: 0xf0ede2, metalness: 0.05, roughness: 0.85 }),

  /* ion-mill */
  alum:   new THREE.MeshStandardMaterial({ color: 0xc8d2dc, metalness: 0.85, roughness: 0.40, envMapIntensity: 1.2, ...CLIP_IMM }),
  resist: new THREE.MeshStandardMaterial({ color: 0xd04830, metalness: 0.1, roughness: 0.70, emissive: 0x401008, emissiveIntensity: 0.5 }),
  beam:   new THREE.MeshBasicMaterial({ color: 0x8fe0ff, transparent: true, opacity: 0, depthWrite: false }),
  plasma: new THREE.MeshBasicMaterial({ color: 0xb0e0ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
  plasmaCore: new THREE.MeshBasicMaterial({ color: 0xe0f4ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
  vpGlow: new THREE.MeshBasicMaterial({ color: 0x7fc4ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
  sput:   new THREE.MeshBasicMaterial({ color: 0xd0e0f0, transparent: true, opacity: 0.8 }),
};


return {renderer,scene,camera,controls,clipPlane,clipPlaneIMM,MAT};
}
