import * as THREE from 'three';

const tmpObject = new THREE.Object3D();

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function makeGroundTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#5f9442');
  grad.addColorStop(1, '#4f7c37');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 2600; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const alpha = Math.random() * 0.08;
    const size = Math.random() * 3.2;
    ctx.fillStyle = `rgba(20,40,18,${alpha.toFixed(3)})`;
    ctx.fillRect(x, y, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(18, 18);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createGround() {
  const geo = new THREE.PlaneGeometry(220, 220, 96, 96);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const wave = Math.sin(x * 0.06) * 0.6 + Math.cos(y * 0.07) * 0.65;
    const hill = Math.sin((x + y) * 0.03) * 0.4;
    pos.setZ(i, wave + hill);
  }

  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    map: makeGroundTexture(),
    color: '#5f9242',
    roughness: 0.94,
    metalness: 0,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI * 0.5;
  mesh.receiveShadow = true;
  return mesh;
}

function addWindShader(material, amp = 0.2, speed = 0.8) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    material.userData.shader = shader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      uniform float uTime;`,
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      float sway = sin((position.y * 5.2) + instanceMatrix[3][0] * 0.45 + uTime * ${speed.toFixed(2)}) * ${amp.toFixed(3)};
      transformed.x += sway * (position.y + 0.25);
      transformed.z += sway * 0.18 * (position.y + 0.25);`,
    );
  };
  material.needsUpdate = true;
}

function createGrass(isMobile) {
  const count = isMobile ? 5000 : 12000;
  const blade = new THREE.PlaneGeometry(0.09, 1.0, 1, 4);
  blade.translate(0, 0.5, 0);

  const mat = new THREE.MeshStandardMaterial({
    color: '#6ea84f',
    roughness: 0.95,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  addWindShader(mat, isMobile ? 0.12 : 0.22, 0.95);

  const mesh = new THREE.InstancedMesh(blade, mat, count);
  mesh.castShadow = false;
  mesh.receiveShadow = false;

  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.pow(Math.random(), 0.72) * 95;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = 0.08;

    tmpObject.position.set(x, y, z);
    tmpObject.rotation.set(0, Math.random() * Math.PI, 0.07 + Math.random() * 0.22);
    const s = randomRange(0.7, 1.25);
    tmpObject.scale.set(0.75, s, 0.75);
    tmpObject.updateMatrix();
    mesh.setMatrixAt(i, tmpObject.matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function createDaisies(isMobile) {
  const flowerCount = isMobile ? 260 : 620;
  const stemGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.75, 5);
  stemGeo.translate(0, 0.38, 0);

  const headGeo = new THREE.SphereGeometry(0.09, 6, 5);
  headGeo.translate(0, 0.76, 0);

  const petalGeo = new THREE.BoxGeometry(0.04, 0.012, 0.12);

  const stemMat = new THREE.MeshStandardMaterial({ color: '#5f8f42', roughness: 0.9 });
  const headMat = new THREE.MeshStandardMaterial({ color: '#f0c948', roughness: 0.7 });
  const petalMat = new THREE.MeshStandardMaterial({ color: '#fffaf4', roughness: 0.55 });

  const stems = new THREE.InstancedMesh(stemGeo, stemMat, flowerCount);
  const heads = new THREE.InstancedMesh(headGeo, headMat, flowerCount);
  const petals = new THREE.InstancedMesh(petalGeo, petalMat, flowerCount * 7);

  const offsets = new Float32Array(flowerCount);
  const bases = new Array(flowerCount);

  let petalIndex = 0;

  for (let i = 0; i < flowerCount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.pow(Math.random(), 0.85) * 70;
    const x = Math.cos(angle) * radius + randomRange(-2.8, 2.8);
    const z = Math.sin(angle) * radius + randomRange(-2.8, 2.8);
    const scale = randomRange(0.75, 1.35);
    const rot = randomRange(-0.16, 0.16);

    bases[i] = { x, z, scale, rot };
    offsets[i] = Math.random() * Math.PI * 2;

    tmpObject.position.set(x, 0.06, z);
    tmpObject.rotation.set(rot, randomRange(0, Math.PI), 0);
    tmpObject.scale.setScalar(scale);
    tmpObject.updateMatrix();
    stems.setMatrixAt(i, tmpObject.matrix);
    heads.setMatrixAt(i, tmpObject.matrix);

    for (let p = 0; p < 7; p += 1) {
      const petalAngle = (p / 7) * Math.PI * 2;
      const px = x + Math.cos(petalAngle) * 0.1 * scale;
      const pz = z + Math.sin(petalAngle) * 0.1 * scale;
      tmpObject.position.set(px, 0.8 * scale + 0.06, pz);
      tmpObject.rotation.set(rot, -petalAngle, 0.35);
      tmpObject.scale.setScalar(scale);
      tmpObject.updateMatrix();
      petals.setMatrixAt(petalIndex, tmpObject.matrix);
      petalIndex += 1;
    }
  }

  stems.instanceMatrix.needsUpdate = true;
  heads.instanceMatrix.needsUpdate = true;
  petals.instanceMatrix.needsUpdate = true;

  return { stems, heads, petals, offsets, bases, flowerCount };
}

function createTree(isMobile) {
  const treeGroup = new THREE.Group();

  const trunkMat = new THREE.MeshStandardMaterial({
    color: '#5f402e',
    roughness: 0.86,
    metalness: 0.02,
  });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.25, 6.8, 9), trunkMat);
  trunk.position.y = 3.2;
  trunk.castShadow = true;
  treeGroup.add(trunk);

  for (let i = 0; i < 5; i += 1) {
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.35, randomRange(2.2, 3.4), 6), trunkMat);
    branch.position.set(randomRange(-0.4, 0.4), randomRange(5.0, 6.2), randomRange(-0.4, 0.4));
    branch.rotation.set(randomRange(0.3, 0.95), randomRange(0, Math.PI * 2), randomRange(-0.35, 0.35));
    branch.castShadow = true;
    treeGroup.add(branch);
  }

  const blossomCount = isMobile ? 500 : 1100;
  const bloomGeo = new THREE.IcosahedronGeometry(0.16, 0);
  const bloomMat = new THREE.MeshStandardMaterial({
    color: '#ffd3e7',
    emissive: '#2d1122',
    emissiveIntensity: 0.08,
    roughness: 0.65,
    transparent: true,
    opacity: 0,
  });

  const blossoms = new THREE.InstancedMesh(bloomGeo, bloomMat, blossomCount);
  blossoms.castShadow = false;

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

export function createExperience(canvas, isMobile) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = !isMobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = isMobile ? 1.0 : 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#bfd8d0');
  scene.fog = new THREE.Fog('#bfd8d0', 18, 130);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 220);
  camera.position.set(0, 2.35, 14);

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
  scene.add(daisies.stems, daisies.heads, daisies.petals);

  const { treeGroup, blossoms } = createTree(isMobile);
  scene.add(treeGroup);

  const rock = createRock();
  rock.visible = false;
  scene.add(rock);

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
    textAlpha: 0,
    textScale: 0.86,
    hintAlpha: 1,
  };

  const overlayPoint = new THREE.Vector3();

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function update(timeSec, rockTextElement) {
    const swayX = Math.sin(timeSec * 0.24) * 0.035;
    const swayY = Math.cos(timeSec * 0.18) * 0.025;

    camera.position.set(state.camX + swayX, state.camY + swayY, state.camZ);
    camera.lookAt(state.lookX, state.lookY, state.lookZ);

    scene.fog.far = state.fogFar;

    treeGroup.scale.setScalar(0.82 + state.treeProgress * 0.18);
    treeGroup.position.z = -54 + (1 - state.treeProgress) * 8;
    blossoms.material.opacity = state.treeProgress;

    rock.visible = state.rockReveal > 0.02;
    rock.position.y = 1.0 - (1 - state.rockReveal) * 1.1;

    daisies.stems.material.userData.time = timeSec;

    // Lightweight sway for flower groups by updating each instance matrix from base placement.
    for (let i = 0; i < daisies.flowerCount; i += 1) {
      const base = daisies.bases[i];
      const sway = Math.sin(timeSec * 1.25 + daisies.offsets[i]) * 0.04;

      tmpObject.position.set(base.x, 0.06, base.z);
      tmpObject.rotation.set(base.rot + sway, 0, 0);
      tmpObject.scale.setScalar(base.scale);
      tmpObject.updateMatrix();
      daisies.stems.setMatrixAt(i, tmpObject.matrix);
      daisies.heads.setMatrixAt(i, tmpObject.matrix);

      for (let p = 0; p < 7; p += 1) {
        const idx = i * 7 + p;
        const petalAngle = (p / 7) * Math.PI * 2;
        const px = base.x + Math.cos(petalAngle) * 0.1 * base.scale;
        const pz = base.z + Math.sin(petalAngle) * 0.1 * base.scale;
        tmpObject.position.set(px, 0.8 * base.scale + 0.06, pz);
        tmpObject.rotation.set(base.rot + sway, -petalAngle, 0.35);
        tmpObject.scale.setScalar(base.scale);
        tmpObject.updateMatrix();
        daisies.petals.setMatrixAt(idx, tmpObject.matrix);
      }
    }
    daisies.stems.instanceMatrix.needsUpdate = true;
    daisies.heads.instanceMatrix.needsUpdate = true;
    daisies.petals.instanceMatrix.needsUpdate = true;

    const shader = grass.material.userData.shader;
    if (shader) shader.uniforms.uTime.value = timeSec;

    if (rock.visible) {
      overlayPoint.copy(rock.position).add(new THREE.Vector3(0, 1.45, 0)).project(camera);
      const sx = (overlayPoint.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-overlayPoint.y * 0.5 + 0.5) * window.innerHeight;

      rockTextElement.style.left = `${sx}px`;
      rockTextElement.style.top = `${sy}px`;
      rockTextElement.style.opacity = `${state.textAlpha}`;
      rockTextElement.style.transform = `translate(-50%, -50%) scale(${state.textScale})`;
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
