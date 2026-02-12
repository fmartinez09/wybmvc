import * as THREE from 'three';

const tmpObject = new THREE.Object3D();
const tmpColor = new THREE.Color();

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}


function makeNoiseCanvas(size, alpha = 40) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(size, size);

  for (let i = 0; i < image.data.length; i += 4) {
    const n = Math.floor(Math.random() * 255);
    image.data[i] = n;
    image.data[i + 1] = n;
    image.data[i + 2] = n;
    image.data[i + 3] = alpha;
  }
  ctx.putImageData(image, 0, 0);

  return canvas;
}

function makeGroundTextures() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#699d4a');
  grad.addColorStop(0.5, '#5f8f44');
  grad.addColorStop(1, '#4f7938');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 6000; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const dark = 25 + Math.random() * 35;
    const alpha = 0.03 + Math.random() * 0.1;
    const r = 0.4 + Math.random() * 1.8;
    ctx.fillStyle = `rgba(${dark},${dark + 8},${dark - 6},${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'overlay';
  const noise = makeNoiseCanvas(size, 42);
  ctx.drawImage(noise, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  const roughnessCanvas = document.createElement('canvas');
  roughnessCanvas.width = size;
  roughnessCanvas.height = size;
  const roughCtx = roughnessCanvas.getContext('2d');
  roughCtx.fillStyle = '#c7c7c7';
  roughCtx.fillRect(0, 0, size, size);
  roughCtx.globalAlpha = 0.45;
  roughCtx.drawImage(noise, 0, 0);
  roughCtx.globalAlpha = 1;

  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = size;
  normalCanvas.height = size;
  const normCtx = normalCanvas.getContext('2d');
  const normalData = normCtx.createImageData(size, size);
  for (let i = 0; i < normalData.data.length; i += 4) {
    const nx = 122 + Math.floor(Math.random() * 16);
    const ny = 122 + Math.floor(Math.random() * 16);
    normalData.data[i] = nx;
    normalData.data[i + 1] = ny;
    normalData.data[i + 2] = 255;
    normalData.data[i + 3] = 255;
  }
  normCtx.putImageData(normalData, 0, 0);

  const map = new THREE.CanvasTexture(canvas);
  const roughnessMap = new THREE.CanvasTexture(roughnessCanvas);
  const normalMap = new THREE.CanvasTexture(normalCanvas);

  [map, roughnessMap, normalMap].forEach((texture) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(17, 17);
  });
  map.colorSpace = THREE.SRGBColorSpace;

  return { map, roughnessMap, normalMap };
}

function createGround() {
  const geo = new THREE.PlaneGeometry(220, 220, 112, 112);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const wave = Math.sin(x * 0.055) * 0.58 + Math.cos(y * 0.068) * 0.62;
    const hill = Math.sin((x + y) * 0.029) * 0.42;
    pos.setZ(i, wave + hill);
  }

  geo.computeVertexNormals();
  const textures = makeGroundTextures();
  const mat = new THREE.MeshStandardMaterial({
    map: textures.map,
    roughnessMap: textures.roughnessMap,
    normalMap: textures.normalMap,
    normalScale: new THREE.Vector2(0.23, 0.23),
    color: '#6ca34d',
    roughness: 0.96,
    metalness: 0,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI * 0.5;
  mesh.receiveShadow = true;
  return mesh;
}

function addWindShader(material, amp = 0.2, speed = 0.8, withColorVariation = false) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    material.userData.shader = shader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>\n      uniform float uTime;`,
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\n      float sway = sin((position.y * 5.2) + instanceMatrix[3][0] * 0.45 + uTime * ${speed.toFixed(2)}) * ${amp.toFixed(3)};\n      transformed.x += sway * (position.y + 0.25);\n      transformed.z += sway * 0.18 * (position.y + 0.25);`,
    );

    if (withColorVariation) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>\n        varying vec3 vInstanceColor;`,
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>\n        varying vec3 vInstanceColor;`,
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\n        vInstanceColor = instanceColor;`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        'vec4 diffuseColor = vec4( diffuse * vInstanceColor, opacity );',
      );
    }
  };
  material.needsUpdate = true;
}

function makeGrassTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
  grad.addColorStop(0, '#4b7e34');
  grad.addColorStop(0.5, '#6ea74a');
  grad.addColorStop(1, '#87ba57');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 800; i += 1) {
    ctx.fillStyle = `rgba(255,255,255,${(Math.random() * 0.08).toFixed(3)})`;
    ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 8 + Math.random() * 30);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createGrass(isMobile) {
  const count = isMobile ? 7000 : 15000;
  const blade = new THREE.PlaneGeometry(0.1, 1.1, 1, 5);
  blade.translate(0, 0.55, 0);

  const mat = new THREE.MeshStandardMaterial({
    color: '#72af50',
    roughness: 0.94,
    metalness: 0,
    map: makeGrassTexture(),
    side: THREE.DoubleSide,
    alphaTest: 0.1,
  });
  addWindShader(mat, isMobile ? 0.12 : 0.2, 0.9, true);

  const mesh = new THREE.InstancedMesh(blade, mat, count);
  mesh.castShadow = false;
  mesh.receiveShadow = false;

  const color = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.pow(Math.random(), 0.72) * 96;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = 0.08;

    tmpObject.position.set(x, y, z);
    tmpObject.rotation.set(0, Math.random() * Math.PI, 0.06 + Math.random() * 0.18);
    const s = randomRange(0.65, 1.25);
    tmpObject.scale.set(0.75, s, 0.75);
    tmpObject.updateMatrix();
    mesh.setMatrixAt(i, tmpObject.matrix);

    color.setHSL(0.27 + randomRange(-0.015, 0.015), 0.37 + randomRange(-0.05, 0.04), 0.5 + randomRange(-0.07, 0.05));
    mesh.setColorAt(i, color);
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

function makePetalTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#fffefb');
  grad.addColorStop(0.65, '#fff7ee');
  grad.addColorStop(1, '#f4e9df');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 460; i += 1) {
    ctx.fillStyle = `rgba(255,255,255,${(Math.random() * 0.08).toFixed(3)})`;
    ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1.2, 14);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeCenterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const radial = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  radial.addColorStop(0, '#f9d85c');
  radial.addColorStop(0.7, '#efbf3f');
  radial.addColorStop(1, '#d79f28');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, 128, 128);

  for (let i = 0; i < 720; i += 1) {
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    const a = Math.random() * 0.15;
    const r = Math.random() * 2.2;
    ctx.fillStyle = `rgba(115,70,8,${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createDaisies(isMobile) {
  const flowerCount = isMobile ? 380 : 840;
  const petalsPerFlower = 14;

  const stemGeo = new THREE.CylinderGeometry(0.02, 0.034, 0.88, 6);
  stemGeo.translate(0, 0.44, 0);

  const headGeo = new THREE.SphereGeometry(0.09, 10, 8);
  headGeo.scale(1, 0.55, 1);
  headGeo.translate(0, 0.88, 0);

  const leafGeo = new THREE.PlaneGeometry(0.18, 0.09, 1, 1);
  const petalGeo = new THREE.PlaneGeometry(0.055, 0.2, 1, 5);
  petalGeo.translate(0, 0.1, 0);

  const pos = petalGeo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    const bend = Math.sin((y / 0.2) * Math.PI) * 0.018;
    pos.setZ(i, bend);
  }
  petalGeo.computeVertexNormals();

  const stemMat = new THREE.MeshStandardMaterial({ color: '#5f8f42', roughness: 0.86, metalness: 0 });
  const leafMat = new THREE.MeshStandardMaterial({ color: '#6ea34f', roughness: 0.78, metalness: 0, side: THREE.DoubleSide });
  const headMat = new THREE.MeshStandardMaterial({
    color: '#f1cb49',
    roughness: 0.64,
    metalness: 0.02,
    map: makeCenterTexture(),
  });
  const petalMat = new THREE.MeshStandardMaterial({
    color: '#fffaf2',
    roughness: 0.52,
    metalness: 0.01,
    side: THREE.DoubleSide,
    map: makePetalTexture(),
  });

  const stems = new THREE.InstancedMesh(stemGeo, stemMat, flowerCount);
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, flowerCount * 2);
  const heads = new THREE.InstancedMesh(headGeo, headMat, flowerCount);
  const petals = new THREE.InstancedMesh(petalGeo, petalMat, flowerCount * petalsPerFlower);

  const offsets = new Float32Array(flowerCount);
  const bases = new Array(flowerCount);

  let leafIndex = 0;
  let petalIndex = 0;

  const stemColor = new THREE.Color();
  const petalColor = new THREE.Color();
  const headColor = new THREE.Color();

  for (let i = 0; i < flowerCount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.pow(Math.random(), 0.82) * 76;
    const x = Math.cos(angle) * radius + randomRange(-2.1, 2.1);
    const z = Math.sin(angle) * radius + randomRange(-2.1, 2.1);
    const scale = randomRange(0.74, 1.32);
    const rot = randomRange(-0.16, 0.16);

    bases[i] = { x, z, scale, rot };
    offsets[i] = Math.random() * Math.PI * 2;

    tmpObject.position.set(x, 0.06, z);
    tmpObject.rotation.set(rot, randomRange(0, Math.PI), 0);
    tmpObject.scale.setScalar(scale);
    tmpObject.updateMatrix();
    stems.setMatrixAt(i, tmpObject.matrix);
    heads.setMatrixAt(i, tmpObject.matrix);

    stemColor.setHSL(0.27 + randomRange(-0.018, 0.015), 0.35 + randomRange(-0.08, 0.06), 0.44 + randomRange(-0.06, 0.05));
    headColor.setHSL(0.13 + randomRange(-0.015, 0.012), 0.78 + randomRange(-0.08, 0.05), 0.57 + randomRange(-0.07, 0.05));
    stems.setColorAt(i, stemColor);
    heads.setColorAt(i, headColor);

    for (let l = 0; l < 2; l += 1) {
      const sign = l === 0 ? -1 : 1;
      tmpObject.position.set(x, 0.3 * scale + 0.15 + l * 0.08, z);
      tmpObject.rotation.set(0.2 * sign, rot + sign * 1.2, 0.25 * sign);
      tmpObject.scale.setScalar(scale * randomRange(0.9, 1.2));
      tmpObject.updateMatrix();
      leaves.setMatrixAt(leafIndex, tmpObject.matrix);
      leaves.setColorAt(leafIndex, stemColor.clone().offsetHSL(0, -0.02, 0.03));
      leafIndex += 1;
    }

    for (let p = 0; p < petalsPerFlower; p += 1) {
      const ring = p < petalsPerFlower / 2 ? 0 : 1;
      const segment = ring === 0 ? p : p - petalsPerFlower / 2;
      const countInRing = petalsPerFlower / 2;
      const petalAngle = (segment / countInRing) * Math.PI * 2 + (ring ? Math.PI / countInRing : 0);
      const radiusPetal = ring === 0 ? 0.12 : 0.085;
      const px = x + Math.cos(petalAngle) * radiusPetal * scale;
      const pz = z + Math.sin(petalAngle) * radiusPetal * scale;
      tmpObject.position.set(px, 0.9 * scale + 0.06 + ring * 0.01, pz);
      tmpObject.rotation.set(rot + 0.08 + ring * 0.07, -petalAngle, 0.45 + ring * 0.25);
      tmpObject.scale.set(1, 1 + ring * 0.07, 1);
      tmpObject.updateMatrix();
      petals.setMatrixAt(petalIndex, tmpObject.matrix);

      petalColor.setHSL(0.1 + randomRange(-0.008, 0.008), 0.34 + randomRange(-0.05, 0.04), 0.95 + randomRange(-0.04, 0.03));
      petals.setColorAt(petalIndex, petalColor);
      petalIndex += 1;
    }
  }

  stems.instanceMatrix.needsUpdate = true;
  leaves.instanceMatrix.needsUpdate = true;
  heads.instanceMatrix.needsUpdate = true;
  petals.instanceMatrix.needsUpdate = true;

  if (stems.instanceColor) stems.instanceColor.needsUpdate = true;
  if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
  if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
  if (petals.instanceColor) petals.instanceColor.needsUpdate = true;

  return { stems, leaves, heads, petals, offsets, bases, flowerCount, petalsPerFlower };
}

function makeBarkTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#6b4a37');
  grad.addColorStop(0.5, '#5b3d2f');
  grad.addColorStop(1, '#4f3429');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 512);

  for (let i = 0; i < 900; i += 1) {
    const x = Math.random() * 256;
    const y = Math.random() * 512;
    const w = Math.random() * 2.3;
    const h = 24 + Math.random() * 56;
    ctx.fillStyle = `rgba(25,12,8,${(Math.random() * 0.17).toFixed(3)})`;
    ctx.fillRect(x, y, w, h);
  }

  for (let i = 0; i < 240; i += 1) {
    ctx.strokeStyle = `rgba(120,88,66,${(Math.random() * 0.24).toFixed(3)})`;
    ctx.lineWidth = 0.6 + Math.random() * 1.6;
    const x = Math.random() * 256;
    const y = Math.random() * 512;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + randomRange(-8, 8), y + randomRange(12, 38));
    ctx.stroke();
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

function createTree(isMobile) {
  const treeGroup = new THREE.Group();
  const barkTexture = makeBarkTexture();

  const trunkMat = new THREE.MeshStandardMaterial({
    color: '#60402f',
    map: barkTexture,
    roughness: 0.9,
    metalness: 0.01,
  });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.25, 6.8, 11), trunkMat);
  trunk.position.y = 3.2;
  trunk.castShadow = true;
  treeGroup.add(trunk);

  for (let i = 0; i < 6; i += 1) {
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.35, randomRange(2.2, 3.5), 7), trunkMat);
    branch.position.set(randomRange(-0.4, 0.4), randomRange(5.0, 6.3), randomRange(-0.4, 0.4));
    branch.rotation.set(randomRange(0.3, 1), randomRange(0, Math.PI * 2), randomRange(-0.35, 0.35));
    branch.castShadow = true;
    treeGroup.add(branch);
  }

  const blossomCount = isMobile ? 540 : 1200;
  const bloomGeo = new THREE.IcosahedronGeometry(0.16, 0);
  const bloomMat = new THREE.MeshStandardMaterial({
    color: '#ffd3e7',
    emissive: '#311122',
    emissiveIntensity: 0.09,
    roughness: 0.62,
    transparent: true,
    opacity: 0,
  });

  const blossoms = new THREE.InstancedMesh(bloomGeo, bloomMat, blossomCount);

  for (let i = 0; i < blossomCount; i += 1) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    const r = randomRange(2.4, 4.8);
    const x = Math.sin(phi) * Math.cos(theta) * r;
    const y = Math.abs(Math.cos(phi)) * r * 0.9 + 5.8;
    const z = Math.sin(phi) * Math.sin(theta) * r;

    tmpObject.position.set(x, y, z);
    tmpObject.rotation.set(Math.random(), Math.random(), Math.random());
    tmpObject.scale.setScalar(randomRange(0.85, 1.3));
    tmpObject.updateMatrix();
    blossoms.setMatrixAt(i, tmpObject.matrix);
  }
  blossoms.instanceMatrix.needsUpdate = true;

  treeGroup.add(blossoms);
  treeGroup.position.set(4, 0, -54);
  treeGroup.scale.setScalar(0.82);

  return { treeGroup, blossoms };
}

function createRock() {
  const geo = new THREE.DodecahedronGeometry(1.2, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const noise = Math.sin(x * 5.2) * Math.cos(z * 4.5) * 0.08 + Math.sin(y * 6.1) * 0.06;
    pos.setXYZ(i, x + noise, y + noise * 0.6, z + noise);
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({ color: '#7a7a7d', roughness: 0.94, metalness: 0.03 });
  const rock = new THREE.Mesh(geo, mat);
  rock.castShadow = true;
  rock.receiveShadow = true;
  rock.position.set(0.55, 1.0, -56.5);
  rock.rotation.set(0.22, 0.75, 0.08);
  rock.scale.set(1, 0.7, 1.2);
  return rock;
}

function createSkyDome() {
  const skyGeo = new THREE.SphereGeometry(180, 32, 18);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color('#9ccde4') },
      uHorizon: { value: new THREE.Color('#f2e7d6') },
      uBottom: { value: new THREE.Color('#d7e8d2') },
      uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
      uSunColor: { value: new THREE.Color('#ffe6b6') },
      uSunIntensity: { value: 0.3 },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vWorldPos;
      uniform vec3 uTop;
      uniform vec3 uHorizon;
      uniform vec3 uBottom;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform float uSunIntensity;
      void main() {
        vec3 dir = normalize(vWorldPos);
        float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 base = mix(uBottom, uHorizon, smoothstep(0.0, 0.45, h));
        base = mix(base, uTop, smoothstep(0.4, 1.0, h));
        float sun = pow(max(dot(dir, normalize(uSunDir)), 0.0), 52.0) * uSunIntensity;
        vec3 col = base + uSunColor * sun;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  return new THREE.Mesh(skyGeo, skyMat);
}

function makeCloudTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, size, size);
  for (let i = 0; i < 12; i += 1) {
    const x = randomRange(30, 98);
    const y = randomRange(38, 82);
    const r = randomRange(16, 38);
    const gradient = ctx.createRadialGradient(x, y, 2, x, y, r);
    gradient.addColorStop(0, 'rgba(255,255,255,0.45)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createCloudLayer(isMobile) {
  const count = isMobile ? 20 : 36;
  const geo = new THREE.PlaneGeometry(9, 4.5);
  const mat = new THREE.MeshBasicMaterial({
    map: makeCloudTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0.42,
    blending: THREE.NormalBlending,
  });
  const clouds = new THREE.InstancedMesh(geo, mat, count);

  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = randomRange(45, 90);
    tmpObject.position.set(Math.cos(angle) * radius, randomRange(16, 28), Math.sin(angle) * radius - 28);
    tmpObject.rotation.set(0, randomRange(0, Math.PI * 2), 0);
    const s = randomRange(0.8, 1.7);
    tmpObject.scale.set(s, s, s);
    tmpObject.updateMatrix();
    clouds.setMatrixAt(i, tmpObject.matrix);
  }
  clouds.instanceMatrix.needsUpdate = true;
  return clouds;
}

function makeHeartTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  ctx.fillStyle = '#ff8fb0';
  ctx.beginPath();
  ctx.moveTo(32, 56);
  ctx.bezierCurveTo(16, 42, 4, 30, 10, 17);
  ctx.bezierCurveTo(15, 7, 27, 7, 32, 17);
  ctx.bezierCurveTo(37, 7, 49, 7, 54, 17);
  ctx.bezierCurveTo(60, 30, 48, 42, 32, 56);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createHeartParticles(isMobile) {
  const count = isMobile ? 90 : 170;
  const geo = new THREE.PlaneGeometry(0.55, 0.55);
  const mat = new THREE.MeshBasicMaterial({
    map: makeHeartTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  const hearts = new THREE.InstancedMesh(geo, mat, count);
  hearts.frustumCulled = false;

  const baseX = new Float32Array(count);
  const baseY = new Float32Array(count);
  const baseZ = new Float32Array(count);
  const speed = new Float32Array(count);
  const drift = new Float32Array(count);
  const rot = new Float32Array(count);
  const phase = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    baseX[i] = randomRange(-18, 16);
    baseY[i] = randomRange(1, 18);
    baseZ[i] = randomRange(-82, -42);
    speed[i] = randomRange(0.55, 1.1);
    drift[i] = randomRange(0.3, 0.9);
    rot[i] = randomRange(-1, 1);
    phase[i] = Math.random() * Math.PI * 2;

    tmpObject.position.set(baseX[i], baseY[i], baseZ[i]);
    const s = randomRange(0.65, 1.45);
    tmpObject.scale.setScalar(s);
    tmpObject.updateMatrix();
    hearts.setMatrixAt(i, tmpObject.matrix);
  }

  hearts.instanceMatrix.needsUpdate = true;
  return { hearts, baseX, baseY, baseZ, speed, drift, rot, phase, rangeY: 20 };
}

export function createExperience(canvas, isMobile) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = !isMobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = isMobile ? 1.02 : 1.08;

  const scene = new THREE.Scene();
  const bgBase = new THREE.Color('#bfd8d0');
  const bgPink = new THREE.Color('#f6d7e4');
  scene.background = bgBase.clone();
  scene.fog = new THREE.Fog(bgBase.clone(), 18, 130);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 220);
  camera.position.set(0, 2.35, 14);

  const skyDome = createSkyDome();
  scene.add(skyDome);

  const clouds = createCloudLayer(isMobile);
  scene.add(clouds);

  const hemi = new THREE.HemisphereLight('#ffe7c5', '#5f7f66', 0.95);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight('#fff5d8', isMobile ? 1.3 : 1.55);
  sun.position.set(14, 24, 10);
  sun.castShadow = !isMobile;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 80;
  sun.shadow.camera.left = -35;
  sun.shadow.camera.right = 35;
  sun.shadow.camera.top = 35;
  sun.shadow.camera.bottom = -35;
  scene.add(sun);

  const ground = createGround();
  scene.add(ground);

  const grass = createGrass(isMobile);
  scene.add(grass);

  const daisies = createDaisies(isMobile);
  scene.add(daisies.stems, daisies.leaves, daisies.heads, daisies.petals);

  const { treeGroup, blossoms } = createTree(isMobile);
  scene.add(treeGroup);

  const rock = createRock();
  rock.visible = false;
  scene.add(rock);

  const heartsData = createHeartParticles(isMobile);
  heartsData.hearts.visible = false;
  scene.add(heartsData.hearts);

  const state = {
    camX: 0,
    camY: 2.35,
    camZ: 14,
    lookX: 0,
    lookY: 1.7,
    lookZ: -20,
    treeProgress: 0,
    fogFar: 130,
    rockReveal: 0,
    hintAlpha: 1,
    romance: 0,
    heartsAlpha: 0,
    cardAlpha: 0,
    cardScale: 0.86,
    cardRotate: 34,
    cardShimmer: 0,
  };

  const overlayPoint = new THREE.Vector3();

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function update(timeSec, cardElement) {
    const swayX = Math.sin(timeSec * 0.24) * 0.035;
    const swayY = Math.cos(timeSec * 0.18) * 0.025;

    camera.position.set(state.camX + swayX, state.camY + swayY, state.camZ);
    camera.lookAt(state.lookX, state.lookY, state.lookZ);

    scene.fog.far = state.fogFar;
    tmpColor.copy(bgBase).lerp(bgPink, state.romance);
    scene.background.copy(tmpColor);
    scene.fog.color.copy(tmpColor);

    hemi.intensity = 0.95 - state.romance * 0.15;
    sun.intensity = (isMobile ? 1.3 : 1.55) - state.romance * 0.24;
    skyDome.material.uniforms.uTop.value.set('#9ccde4').lerp(new THREE.Color('#f0bcd4'), state.romance);
    skyDome.material.uniforms.uHorizon.value.set('#f2e7d6').lerp(new THREE.Color('#f6dce8'), state.romance);
    skyDome.material.uniforms.uSunIntensity.value = 0.3 - state.romance * 0.12;
    clouds.material.opacity = 0.42 - state.romance * 0.08;

    treeGroup.scale.setScalar(0.82 + state.treeProgress * 0.18);
    treeGroup.position.z = -54 + (1 - state.treeProgress) * 8;
    blossoms.material.opacity = state.treeProgress;

    rock.visible = state.rockReveal > 0.02;
    rock.position.y = 1.0 - (1 - state.rockReveal) * 1.1;

    for (let i = 0; i < daisies.flowerCount; i += 1) {
      const base = daisies.bases[i];
      const sway = Math.sin(timeSec * 1.25 + daisies.offsets[i]) * 0.04;

      tmpObject.position.set(base.x, 0.06, base.z);
      tmpObject.rotation.set(base.rot + sway, 0, 0);
      tmpObject.scale.setScalar(base.scale);
      tmpObject.updateMatrix();
      daisies.stems.setMatrixAt(i, tmpObject.matrix);
      daisies.heads.setMatrixAt(i, tmpObject.matrix);

      for (let l = 0; l < 2; l += 1) {
        const leafIdx = i * 2 + l;
        const sign = l === 0 ? -1 : 1;
        tmpObject.position.set(base.x, 0.3 * base.scale + 0.15 + l * 0.08, base.z);
        tmpObject.rotation.set(0.2 * sign + sway * 0.5, base.rot + sign * 1.2, 0.25 * sign);
        tmpObject.scale.setScalar(base.scale * (l === 0 ? 1 : 1.08));
        tmpObject.updateMatrix();
        daisies.leaves.setMatrixAt(leafIdx, tmpObject.matrix);
      }

      for (let p = 0; p < daisies.petalsPerFlower; p += 1) {
        const idx = i * daisies.petalsPerFlower + p;
        const ring = p < daisies.petalsPerFlower / 2 ? 0 : 1;
        const segment = ring === 0 ? p : p - daisies.petalsPerFlower / 2;
        const countInRing = daisies.petalsPerFlower / 2;
        const petalAngle = (segment / countInRing) * Math.PI * 2 + (ring ? Math.PI / countInRing : 0);
        const radiusPetal = ring === 0 ? 0.12 : 0.085;
        const px = base.x + Math.cos(petalAngle) * radiusPetal * base.scale;
        const pz = base.z + Math.sin(petalAngle) * radiusPetal * base.scale;
        tmpObject.position.set(px, 0.9 * base.scale + 0.06 + ring * 0.01, pz);
        tmpObject.rotation.set(base.rot + sway + 0.08 + ring * 0.07, -petalAngle, 0.45 + ring * 0.25);
        tmpObject.scale.set(1, 1 + ring * 0.07, 1);
        tmpObject.updateMatrix();
        daisies.petals.setMatrixAt(idx, tmpObject.matrix);
      }
    }
    daisies.stems.instanceMatrix.needsUpdate = true;
    daisies.leaves.instanceMatrix.needsUpdate = true;
    daisies.heads.instanceMatrix.needsUpdate = true;
    daisies.petals.instanceMatrix.needsUpdate = true;

    const grassShader = grass.material.userData.shader;
    if (grassShader) grassShader.uniforms.uTime.value = timeSec;

    heartsData.hearts.visible = state.heartsAlpha > 0.01;
    heartsData.hearts.material.opacity = state.heartsAlpha;
    if (heartsData.hearts.visible) {
      for (let i = 0; i < heartsData.baseX.length; i += 1) {
        const loop = (timeSec * heartsData.speed[i] + heartsData.phase[i]) % heartsData.rangeY;
        const y = heartsData.baseY[i] + (heartsData.rangeY - loop) - 9;
        const x = heartsData.baseX[i] + Math.sin(timeSec * heartsData.drift[i] + heartsData.phase[i]) * 0.8;
        const z = heartsData.baseZ[i] + Math.cos(timeSec * heartsData.drift[i] * 0.6 + heartsData.phase[i]) * 0.4;
        tmpObject.position.set(x, y, z);
        tmpObject.rotation.set(0, 0, timeSec * heartsData.rot[i]);
        tmpObject.scale.setScalar(0.85 + Math.sin(timeSec + heartsData.phase[i]) * 0.15);
        tmpObject.updateMatrix();
        heartsData.hearts.setMatrixAt(i, tmpObject.matrix);
      }
      heartsData.hearts.instanceMatrix.needsUpdate = true;
    }

    if (rock.visible) {
      overlayPoint.copy(rock.position).add(new THREE.Vector3(0, 1.55, 0.1)).project(camera);
      const sx = (overlayPoint.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-overlayPoint.y * 0.5 + 0.5) * window.innerHeight;

      cardElement.style.left = `${sx}px`;
      cardElement.style.top = `${sy}px`;
      cardElement.style.opacity = `${state.cardAlpha}`;
      cardElement.style.setProperty('--card-scale', `${state.cardScale}`);
      cardElement.style.setProperty('--card-rot-y', `${state.cardRotate}`);
      cardElement.style.setProperty('--shine-x', `${state.cardShimmer * 130 - 20}%`);
      cardElement.style.transform = `translate(-50%, -50%)`;
    }

    renderer.render(scene, camera);
  }

  return {
    renderer,
    scene,
    camera,
    rock,
    state,
    resize,
    update,
  };
}
