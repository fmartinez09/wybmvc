import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createExperience } from './scene';

gsap.registerPlugin(ScrollTrigger);

const canvas = document.querySelector('#scene-canvas');
const scrollContainer = document.querySelector('#scroll-container');
const card = document.querySelector('#love-card');
const scrollHint = document.querySelector('#scroll-hint');

const mobileQuery = window.matchMedia('(max-width: 900px), (pointer: coarse), (hover: none)');
const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

function getViewportHeight() {
  return window.visualViewport ? window.visualViewport.height : window.innerHeight;
}

function setVhUnit() {
  const vh = getViewportHeight() * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

function createQualityProfile() {
  const isMobile = mobileQuery.matches;
  const reducedMotion = reduceMotionQuery.matches;
  const lowPowerHint = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
  const mobileDensity = isMobile || lowPowerHint ? 0.52 : 1;

  return {
    isMobile,
    reducedMotion,
    maxDpr: isMobile ? 1.2 : 1.6,
    grassCount: Math.floor(15000 * mobileDensity),
    daisyCount: Math.floor(840 * mobileDensity),
    blossomCount: Math.floor(1200 * mobileDensity),
    cloudCount: Math.floor((isMobile ? 30 : 36) * (isMobile ? 0.76 : 1)),
    heartCount: Math.floor(170 * (isMobile ? 0.5 : 1)),
    shadowsEnabled: !isMobile,
    shadowMapSize: isMobile ? 512 : 1024,
    toneMappingExposure: isMobile ? 1.02 : 1.08,
    sunIntensity: isMobile ? 1.28 : 1.55,
    windAmp: reducedMotion ? 0.08 : isMobile ? 0.12 : 0.2,
    windSpeed: reducedMotion ? 0.56 : 0.9,
    cameraBaseY: isMobile ? 2.7 : 2.35,
    lookBaseY: isMobile ? 1.95 : 1.7,
    cameraSwayX: reducedMotion ? 0.018 : 0.035,
    cameraSwayY: reducedMotion ? 0.014 : 0.025,
    heartDriftX: reducedMotion ? 0.35 : 0.8,
    heartDriftZ: reducedMotion ? 0.2 : 0.4,
    heartScaleAmp: reducedMotion ? 0.08 : 0.15,
    heartSpeedScale: reducedMotion ? 0.6 : 1,
    daisySwayAmp: reducedMotion ? 0.02 : 0.04,
    getCameraFov(aspect) {
      if (!isMobile) return 50;
      return aspect < 0.75 ? 58 : 54;
    },
  };
}

setVhUnit();
let qualityProfile = createQualityProfile();
const experience = createExperience(canvas, qualityProfile);
const { state } = experience;

let pointerTiltX = 0;
let pointerTiltY = 0;
let pointerTargetX = 0;
let pointerTargetY = 0;
let isTouchTilting = false;
let rafId = 0;

const timeline = gsap.timeline({
  scrollTrigger: {
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: qualityProfile.reducedMotion ? 0.35 : 0.8,
    invalidateOnRefresh: true,
  },
});

timeline.to(
  state,
  {
    camZ: -18,
    lookZ: -36,
    duration: 0.4,
    ease: 'none',
    onUpdate: () => {
      scrollHint.style.opacity = `${state.hintAlpha}`;
    },
  },
  0,
);
timeline.to(state, { hintAlpha: 0.15, duration: 0.4, ease: 'none' }, 0);

timeline.to(
  state,
  {
    camZ: -45,
    camX: qualityProfile.isMobile ? 1.8 : 2.4,
    lookX: qualityProfile.isMobile ? 3.2 : 3.8,
    lookZ: -56,
    treeProgress: 1,
    fogFar: 170,
    duration: 0.35,
    ease: 'none',
  },
  0.4,
);

timeline.to(
  state,
  {
    camZ: -53,
    camX: qualityProfile.isMobile ? 0.7 : 1.1,
    camY: qualityProfile.isMobile ? 2.95 : qualityProfile.cameraBaseY,
    lookX: qualityProfile.isMobile ? 0.45 : 1.0,
    lookY: qualityProfile.isMobile ? 1.75 : 1.4,
    lookZ: -57,
    rockReveal: 1,
    romance: 1,
    heartsAlpha: 0.8,
    cardAlpha: 1,
    cardScale: qualityProfile.isMobile ? 1.01 : 1.08,
    cardRotate: qualityProfile.isMobile ? 0 : 2,
    cardShimmer: 1,
    hintAlpha: 0,
    duration: 0.25,
    ease: 'power1.inOut',
  },
  0.75,
);

timeline.to(
  state,
  {
    cardShimmer: 0,
    duration: 0.18,
    ease: 'none',
  },
  0.91,
);

const shineTween = gsap.to(card, {
  '--shine-loop': '120%',
  duration: 2.3,
  repeat: -1,
  ease: 'none',
  paused: true,
});

ScrollTrigger.create({
  trigger: scrollContainer,
  start: '66% top',
  end: 'bottom bottom',
  onEnter: () => shineTween.play(),
  onEnterBack: () => shineTween.play(),
  onLeaveBack: () => shineTween.pause(0),
});

function bindDesktopTilt() {
  window.addEventListener('pointermove', (event) => {
    if (qualityProfile.isMobile) return;
    const px = event.clientX / window.innerWidth - 0.5;
    const py = event.clientY / getViewportHeight() - 0.5;
    pointerTargetX = gsap.utils.clamp(-5, 5, px * 9);
    pointerTargetY = gsap.utils.clamp(-4, 4, -py * 8);
  });
}

function bindMobileTilt() {
  card.addEventListener('touchstart', () => {
    isTouchTilting = true;
  }, { passive: true });

  card.addEventListener('touchmove', (event) => {
    if (!qualityProfile.isMobile || event.touches.length === 0) return;
    const touch = event.touches[0];
    const rect = card.getBoundingClientRect();
    const nx = (touch.clientX - rect.left) / rect.width - 0.5;
    const ny = (touch.clientY - rect.top) / rect.height - 0.5;
    pointerTargetX = gsap.utils.clamp(-5, 5, nx * 10);
    pointerTargetY = gsap.utils.clamp(-4, 4, -ny * 10);
  }, { passive: true });

  card.addEventListener('touchend', () => {
    isTouchTilting = false;
  }, { passive: true });
}

bindDesktopTilt();
bindMobileTilt();

function frame(now) {
  const elapsed = now * 0.001;

  if (qualityProfile.isMobile && !isTouchTilting) {
    pointerTargetX = Math.sin(elapsed * 0.7) * 1.7;
    pointerTargetY = Math.cos(elapsed * 0.58) * 1.2;
  }

  pointerTiltX += (pointerTargetX - pointerTiltX) * 0.08;
  pointerTiltY += (pointerTargetY - pointerTiltY) * 0.08;
  card.style.setProperty('--tilt-x', `${pointerTiltX.toFixed(3)}deg`);
  card.style.setProperty('--tilt-y', `${pointerTiltY.toFixed(3)}deg`);

  experience.update(elapsed, card);
  scrollHint.style.opacity = `${state.hintAlpha}`;

  rafId = requestAnimationFrame(frame);
}

rafId = requestAnimationFrame(frame);

function handleViewportChange() {
  setVhUnit();
  Object.assign(qualityProfile, createQualityProfile());
  experience.resize();
  ScrollTrigger.refresh(true);
}

window.addEventListener('resize', handleViewportChange);
window.addEventListener('orientationchange', () => {
  setTimeout(handleViewportChange, 120);
});

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', handleViewportChange);
}

mobileQuery.addEventListener('change', handleViewportChange);
reduceMotionQuery.addEventListener('change', handleViewportChange);

window.addEventListener('beforeunload', () => {
  cancelAnimationFrame(rafId);
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  timeline.kill();
  shineTween.kill();
  experience.renderer.dispose();
});
