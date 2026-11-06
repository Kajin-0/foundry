import * as THREE from 'three';
import {mergeStaticDrawCalls} from '../scene/merge-static.js';
// Retained equipment geometry and resist shader adapted from spincoat.html.
// A bay-local group shares Foundry's ONE renderer, camera, lighting and floor.
export const SPIN_BAY_X=78;
export function buildSpin({scene}){
const group=new THREE.Group();group.name='Spin coater · photoresist';
group.position.x=SPIN_BAY_X;scene.add(group);
const cutState={value:.58};
const cutPlane=new THREE.Plane(new THREE.Vector3(0,0,-1),2-cutState.value*3.2);
function clippedMat(mat){mat.clippingPlanes=[cutPlane];mat.clipShadows=true;return mat}
function std(color, metalness, roughness) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}
const matBase = clippedMat(std(0x243040, 0.72, 0.42));
const matRim = clippedMat(std(0x3a4a60, 0.85, 0.28));
const matBowl = clippedMat(std(0x2a3648, 0.72, 0.38));
matBowl.side = THREE.DoubleSide;
const matBowlEdge = clippedMat(std(0x3a4a60, 0.85, 0.28));
const matSpindle = clippedMat(std(0xc0ccd8, 0.98, 0.12));
const matMotor = clippedMat(std(0x18222e, 0.62, 0.55));
const matFin = clippedMat(std(0x1e2836, 0.55, 0.62));
const matCable = clippedMat(std(0x1a1e24, 0.35, 0.75));
const matPort = clippedMat(std(0x3a4a60, 0.65, 0.50));

const matChuck = std(0x3a4659, 0.88, 0.24);
const matChuckRim = std(0xa0b0c0, 1.0, 0.10);
const matGroove = std(0x1a2431, 0.5, 0.6);
const matWafer = std(0x8899ab, 0.7, 0.32);
const matPost = std(0xa8b5c4, 0.92, 0.18);
const matArm = std(0xbcc8d4, 0.94, 0.16);
const matNozzle = new THREE.MeshPhysicalMaterial({ color: 0xe8eef4, metalness: 1.0, roughness: 0.10, clearcoat: 1.0 });
const matNozzleTip = std(0x3a4659, 0.85, 0.30);
const matHotBase = std(0x2a3648, 0.68, 0.42);
const matHotTop = std(0xb0bcc8, 0.95, 0.18);
const matHotRing = new THREE.MeshStandardMaterial({ color: 0xff8a2a, metalness: 0.4, roughness: 0.4, emissive: 0xff8a2a, emissiveIntensity: 0.35 });
const matLed = new THREE.MeshStandardMaterial({ color: 0x7fc4ff, emissive: 0x7fc4ff, emissiveIntensity: 0.5 });
const matDroplet = new THREE.MeshPhysicalMaterial({ color: 0xffd060, metalness: 0.2, roughness: 0.15, clearcoat: 1.0, emissive: 0xff9020, emissiveIntensity: 0.5 });

const base = new THREE.Mesh(new THREE.CylinderGeometry(1.10, 1.10, 0.84, 48), matBase);
base.position.y = 0.42;
base.castShadow = true; base.receiveShadow = true;
group.add(base);

const baseRim = new THREE.Mesh(new THREE.TorusGeometry(1.10, 0.025, 12, 64), matRim);
baseRim.rotation.x = Math.PI / 2;
baseRim.position.y = 0.84;
group.add(baseRim);

const baseBottom = new THREE.Mesh(new THREE.TorusGeometry(1.10, 0.02, 12, 64), matRim);
baseBottom.rotation.x = Math.PI / 2;
baseBottom.position.y = 0.02;
group.add(baseBottom);

const bowlBottomY = 0.84;
const bowlHeight = 0.72;
const bowlTopY = bowlBottomY + bowlHeight;

const bowl = new THREE.Mesh(
  new THREE.CylinderGeometry(1.14, 1.08, bowlHeight, 64, 1, true),
  matBowl
);
bowl.position.y = bowlBottomY + bowlHeight / 2;
bowl.castShadow = true;
group.add(bowl);

const bowlRim = new THREE.Mesh(
  new THREE.TorusGeometry(1.14, 0.022, 12, 96),
  matBowlEdge
);
bowlRim.rotation.x = Math.PI / 2;
bowlRim.position.y = bowlTopY;
group.add(bowlRim);

const drainPort = new THREE.Mesh(
  new THREE.CylinderGeometry(0.055, 0.055, 0.22, 16),
  matPort
);
drainPort.position.set(0.86, bowlBottomY + 0.06, 0.24);
drainPort.rotation.z = Math.PI / 2;
drainPort.rotation.y = -0.45;
group.add(drainPort);

const exhaustPort = new THREE.Mesh(
  new THREE.CylinderGeometry(0.048, 0.048, 0.18, 16),
  matPort
);
exhaustPort.position.set(-0.55, bowlTopY - 0.05, 0.58);
exhaustPort.rotation.z = Math.PI / 3;
exhaustPort.rotation.y = -0.55;
group.add(exhaustPort);

const drainFlange = new THREE.Mesh(
  new THREE.TorusGeometry(0.065, 0.012, 8, 24),
  matBowlEdge
);
drainFlange.position.set(0.72, bowlBottomY + 0.02, 0.20);
drainFlange.rotation.y = -0.45;
drainFlange.rotation.x = Math.PI / 2;
group.add(drainFlange);

const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.72, 20), matSpindle);
spindle.position.y = 0.32;
spindle.castShadow = true;
group.add(spindle);

const spindleTop = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.07, 0.05, 20), matSpindle);
spindleTop.position.y = 0.66;
group.add(spindleTop);

const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.44, 24), matMotor);
motor.position.y = 0.06;
motor.castShadow = true;
group.add(motor);

const motorCap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 24), matRim);
motorCap.position.y = 0.28;
group.add(motorCap);

for (let i = 0; i < 14; i++) {
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.32, 0.28), matFin);
  const a = i * (Math.PI * 2 / 14);
  fin.position.set(0.30 * Math.cos(a), 0.06, 0.30 * Math.sin(a));
  fin.rotation.y = -a;
  group.add(fin);
}

const cableCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.30, 0.10, 0),
  new THREE.Vector3(0.65, 0.08, 0.05),
  new THREE.Vector3(0.95, 0.02, 0.15),
  new THREE.Vector3(1.20, 0.01, 0.30),
]);
group.add(new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 24, 0.022, 8, false), matCable));

const vacCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.02, 0.70, 0),
  new THREE.Vector3(0.35, 0.55, 0.15),
  new THREE.Vector3(0.80, 0.30, 0.30),
  new THREE.Vector3(1.05, 0.05, 0.42),
]);
group.add(new THREE.Mesh(new THREE.TubeGeometry(vacCurve, 24, 0.025, 8, false), matCable));

const chuckGroup = new THREE.Group();
chuckGroup.position.y = 0.92;

const chuckDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.86, 0.14, 64), matChuck);
chuckDisc.castShadow = true; chuckDisc.receiveShadow = true;
chuckGroup.add(chuckDisc);

const chuckRim = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.012, 12, 96), matChuckRim);
chuckRim.rotation.x = Math.PI / 2;
chuckRim.position.y = 0.075;
chuckGroup.add(chuckRim);

[0.70, 0.55, 0.40].forEach(r => {
  const groove = new THREE.Mesh(new THREE.TorusGeometry(r, 0.007, 8, 96), matGroove);
  groove.rotation.x = Math.PI / 2;
  groove.position.y = 0.071;
  chuckGroup.add(groove);
});

for (let i = 0; i < 12; i++) {
  const a = (i / 12) * Math.PI * 2;
  const port = new THREE.Mesh(new THREE.CircleGeometry(0.015, 12), matGroove);
  port.rotation.x = -Math.PI / 2;
  port.position.set(0.82 * Math.cos(a), 0.0725, 0.82 * Math.sin(a));
  chuckGroup.add(port);
}

const waferMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.018, 96), matWafer);
waferMesh.position.y = 0.079;
waferMesh.castShadow = true; waferMesh.receiveShadow = true;
chuckGroup.add(waferMesh);

const notchAngle = Math.PI * 0.25;
const notch = new THREE.Mesh(new THREE.CircleGeometry(0.014, 16), matGroove);
notch.rotation.x = -Math.PI / 2;
notch.position.set(
  0.772 * Math.cos(notchAngle),
  0.0895,
  0.772 * Math.sin(notchAngle)
);
chuckGroup.add(notch);

group.add(chuckGroup);

const WAFER_TOP_LOCAL_Y = 0.088;

const filmUniforms = {
  uThickness: { value: 0.0 },
  uSpread:    { value: 0.0 },
  uTime:      { value: 0.0 },
  uWetness:   { value: 1.0 },
  uOpacity:   { value: 0.0 }
};

const filmTopMat = new THREE.ShaderMaterial({
  uniforms: filmUniforms,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  vertexShader: [
    "varying vec2 vUv;",
    "varying vec3 vWorldNormal;",
    "varying vec3 vWorldPos;",
    "void main() {",
    "  vUv = uv;",
    "  vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);",
    "  vec4 wp = modelMatrix * vec4(position, 1.0);",
    "  vWorldPos = wp.xyz;",
    "  gl_Position = projectionMatrix * viewMatrix * wp;",
    "}"
  ].join("\n"),
  fragmentShader: [
    "varying vec2 vUv;",
    "varying vec3 vWorldNormal;",
    "varying vec3 vWorldPos;",
    "uniform float uThickness;",
    "uniform float uSpread;",
    "uniform float uTime;",
    "uniform float uWetness;",
    "uniform float uOpacity;",
    "",
    "// Thin-film interference: resist (n=1.55) on Si (n=3.5).",
    "// Both interfaces give π shift → net 2π ≡ 0 → constructive at d=mλ/(2n).",
    "float filmReflectance(float d, float lambda_nm) {",
    "  float n = 1.55;",
    "  float phase = 4.0 * 3.14159265 * n * d * 1000.0 / lambda_nm;",
    "  return 0.5 + 0.5 * cos(phase);",
    "}",
    "vec3 thinFilm(float d) {",
    "  return vec3(",
    "    filmReflectance(d, 620.0),",
    "    filmReflectance(d, 545.0),",
    "    filmReflectance(d, 460.0)",
    "  );",
    "}",
    "",
    "void main() {",
    "  vec2 c = vUv * 2.0 - 1.0;",
    "  float r = length(c);",
    "  if (r > 1.0) discard;",
    "",
    "  float angle = atan(c.y, c.x);",
    "  float wobble = sin(angle * 9.0 + uTime * 1.5) * 0.012",
    "               + sin(angle * 17.0 - uTime * 2.3) * 0.006;",
    "  float edgeR = uSpread + wobble;",
    "  float edge = smoothstep(edgeR - 0.03, edgeR, r);",
    "  float mask = 1.0 - edge;",
    "  if (mask < 0.01) discard;",
    "",
    "  vec3 ifCol = thinFilm(max(uThickness, 0.001));",
    "  vec3 amber = vec3(0.82, 0.50, 0.20);",
    "  float ifAmt = clamp(1.0 - (uThickness - 0.2) / 2.0, 0.10, 1.0);",
    "  vec3 col = mix(amber, ifCol, ifAmt);",
    "",
    "  float ripple = (sin(r * 24.0 - uTime * 7.5) * 0.5 + 0.5);",
    "  ripple *= uWetness * 0.20 * (1.0 - r * 0.4);",
    "  col += ripple;",
    "",
    "  float swirl = sin(angle * 5.0 + uTime * 2.4) * 0.5 + 0.5;",
    "  col += swirl * 0.06 * uWetness * (1.0 - r);",
    "",
    "  float men = smoothstep(edgeR - 0.07, edgeR, r);",
    "  col += vec3(1.0, 0.85, 0.60) * men * 0.35 * uWetness;",
    "",
    "  vec3 vd = normalize(cameraPosition - vWorldPos);",
    "  vec3 n = normalize(vWorldNormal);",
    "  vec3 ld = normalize(vec3(0.45, 0.85, 0.30));",
    "  vec3 hv = normalize(ld + vd);",
    "  float spec = pow(max(dot(n, hv), 0.0), 28.0);",
    "  col += spec * uWetness * 0.55;",
    "",
    "  float fres = pow(1.0 - max(dot(vd, n), 0.0), 3.0);",
    "  col += fres * 0.12;",
    "",
    "  gl_FragColor = vec4(col, mask * uOpacity);",
    "}"
  ].join("\n")
});

const filmGroup = new THREE.Group();
filmGroup.position.y = WAFER_TOP_LOCAL_Y;
chuckGroup.add(filmGroup);

const filmTopGeom = new THREE.CircleGeometry(0.775, 128);
filmTopGeom.rotateX(-Math.PI / 2);
const filmTopMesh = new THREE.Mesh(filmTopGeom, filmTopMat);
filmTopMesh.position.y = 1.0;
filmGroup.add(filmTopMesh);

const filmSideMat = new THREE.MeshStandardMaterial({
  color: 0xb88040, roughness: 0.35, metalness: 0.10,
  transparent: true, opacity: 0.0, depthWrite: false
});
const filmSideGeom = new THREE.CylinderGeometry(1, 1, 1, 128, 1, true);
const filmSideMesh = new THREE.Mesh(filmSideGeom, filmSideMat);
filmSideMesh.position.y = 0.5;
filmSideMesh.scale.set(0.001, 1, 0.001);
filmGroup.add(filmSideMesh);

const splashGeom = new THREE.RingGeometry(0.01, 0.03, 32);
const splashMat = new THREE.MeshBasicMaterial({
  color: 0xffd060, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false
});
const splashRing = new THREE.Mesh(splashGeom, splashMat);
splashRing.rotation.x = -Math.PI / 2;
splashRing.position.y = WAFER_TOP_LOCAL_Y + 0.001;
chuckGroup.add(splashRing);
let splashTime = -1;

const dispenseBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.10, 24), matMotor);
dispenseBase.position.set(-1.65, 0.05, 0);
dispenseBase.castShadow = true;
group.add(dispenseBase);

const pivotRing = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.014, 8, 32), matArm);
pivotRing.rotation.x = Math.PI / 2;
pivotRing.position.set(-1.65, 0.105, 0);
group.add(pivotRing);

const dispensePost = new THREE.Mesh(new THREE.BoxGeometry(0.10, 1.85, 0.10), matPost);
dispensePost.position.set(-1.65, 0.97, 0);
dispensePost.castShadow = true;
group.add(dispensePost);

const supplyTube = new THREE.Mesh(
  new THREE.CylinderGeometry(0.013, 0.013, 1.60, 10),
  matCable
);
supplyTube.position.set(-1.62, 1.00, 0.07);
group.add(supplyTube);

const dispenseArm = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.06, 0.06), matArm);
dispenseArm.position.set(-0.875, 1.85, 0);
dispenseArm.castShadow = true;
group.add(dispenseArm);

const dispenseElbow = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.10), matArm);
dispenseElbow.position.set(-1.65, 1.85, 0);
dispenseElbow.castShadow = true;
group.add(dispenseElbow);

const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.045, 0.28, 20), matNozzle);
nozzle.position.set(-0.10, 1.68, 0);
nozzle.castShadow = true;
group.add(nozzle);

const nozzleTip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.028, 0.06, 16), matNozzleTip);
nozzleTip.position.set(-0.10, 1.51, 0);
nozzleTip.castShadow = true;
group.add(nozzleTip);

const droplet = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 16), matDroplet);
droplet.position.set(-0.10, 1.48, 0);
droplet.visible = false;
droplet.castShadow = true;
group.add(droplet);

const hotGroup = new THREE.Group();
hotGroup.position.set(1.85, 0, 0.55);

const hotBase = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.16, 0.72), matHotBase);
hotBase.position.y = 0.08;
hotBase.castShadow = true; hotBase.receiveShadow = true;
hotGroup.add(hotBase);

const hotDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 48), matHotTop);
hotDisc.position.y = 0.175;
hotDisc.castShadow = true;
hotGroup.add(hotDisc);

const hotRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.006, 8, 64), matHotRing);
hotRing.rotation.x = Math.PI / 2;
hotRing.position.y = 0.191;
hotGroup.add(hotRing);

group.add(hotGroup);

for (let i = 0; i < 3; i++) {
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 12), matLed);
  const a = Math.PI * 0.25 + i * Math.PI * 0.5;
  led.position.set(1.06 * Math.cos(a), 0.60, 1.06 * Math.sin(a));
  group.add(led);
}

for (let i = 0; i < 8; i++) {
  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.012, 8),
    clippedMat(std(0x607080, 0.9, 0.25)));
  const a = (i / 8) * Math.PI * 2;
  bolt.position.set(1.0 * Math.cos(a), 0.86, 1.0 * Math.sin(a));
  group.add(bolt);
}


const staticStats=mergeStaticDrawCalls(group,{exclude:new Set([
 chuckGroup,filmGroup,filmTopMesh,filmSideMesh,droplet,splashRing,hotGroup
])});
let rotation=0,ledPulse=0;
function setVisual(s,dt,time){
 const rpm=Math.max(0,s.rpm||0),thickness=Math.max(0,s.thickness||0),t=s.simTime||0;
 rotation+=dt*(rpm/3000)*Math.PI*1.1;chuckGroup.rotation.y=rotation;
 const spread=t<.95?0:t<1.6?.32*(t-.95)/.65:t<3.6?.32+.78*(t-1.6)/2:1.10;
 const wet=t<7?1:t<27?1-.55*(t-7)/20:t<36?.45-.20*(t-27)/9:.15;
 filmUniforms.uThickness.value=Math.max(.02,thickness);
 filmUniforms.uSpread.value=spread;
 filmUniforms.uTime.value=t;
 filmUniforms.uWetness.value=wet;
 const opacity=thickness>.05?Math.min(1,thickness):0;
 filmUniforms.uOpacity.value=opacity;
 filmSideMat.opacity=opacity*.9;
 filmSideMat.color.setRGB(.72,.50,.25).multiplyScalar(.6+.4*wet);
 const height=thickness<=0?.0002:.002+Math.pow(Math.min(1,thickness/100),.55)*.042;
 filmGroup.scale.y=Math.max(.0002,height);
 const poolR=Math.max(.0005,Math.min(.775,spread*.775));
 filmSideMesh.scale.set(poolR,1,poolR);
 droplet.visible=s.running&&t>.3&&t<1;
 if(droplet.visible){const d=(t-.3)/.7;droplet.position.y=1.48-d*.55;droplet.scale.setScalar(1-d*.45)}
 if(s.running&&t>=1&&t<1.06&&splashTime<0)splashTime=t;
 if(splashTime>=0){
  const st=t-splashTime;
  if(st>=0&&st<.6){const q=st/.6;splashRing.scale.setScalar(1+q*6);splashMat.opacity=(1-q)*.55}
  else {splashMat.opacity=0;if(st>=.6)splashTime=-1}
 }else splashMat.opacity=0;
 ledPulse+=dt*4;
 matLed.emissiveIntensity=s.running?1.2+Math.sin(ledPulse)*.6:s.phase==='done'?1:.4;
 const col=s.phase==='done'?0x7ee6a0:0x7fc4ff;
 matLed.color.setHex(col);matLed.emissive.setHex(col);
 matHotRing.emissiveIntensity=.3+Math.sin(time)*.08;
 cutPlane.constant=2-cutState.value*3.2;
}
return {group,setVisual,setCut:value=>{cutState.value=Math.max(0,Math.min(1,value));cutPlane.constant=2-cutState.value*3.2},staticStats};
}
