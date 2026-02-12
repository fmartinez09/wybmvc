import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createExperience } from './scene';

gsap.registerPlugin(ScrollTrigger);

const canvas = document.querySelector('#scene-canvas');
const scrollContainer = document.querySelector('#scroll-container');
const rockText = document.querySelector('#rock-text');
const scrollHint = document.querySelector('#scroll-hint');

const isMobile = window.matchMedia('(max-width: 768px)').matches;
const experience = createExperience(canvas, isMobile);

const { state } = experience;

// Single scrubbed timeline with three narrative sections.
const timeline = gsap.timeline({
  scrollTrigger: {
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.8,
    pin: '#scene-canvas',
  },
});

// Section A: calm meadow traversal.
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

// Section B: tree reveal, slight camera yaw, atmospheric clarity.
timeline.to(
  state,
  {
    camZ: -45,
    camX: 2.4,
    lookX: 3.8,
    lookZ: -56,
    treeProgress: 1,
    fogFar: 170,
    duration: 0.35,
    ease: 'none',
  },
  0.4,
);

// Section C: settle near the rock and reveal the romantic question.
timeline.to(
  state,
  {
    camZ: -53,
    camX: 1.1,
    lookX: 1.0,
    lookY: 1.4,
    lookZ: -57,
    rockReveal: 1,
    textAlpha: 1,
    textScale: isMobile ? 1.05 : 1.12,
    hintAlpha: 0,
    duration: 0.25,
    ease: 'power1.inOut',
  },
  0.75,
);

let rafId = 0;
const clock = { last: performance.now() };

function frame(now) {
  const elapsed = now * 0.001;
  experience.update(elapsed, rockText);
  scrollHint.style.opacity = `${state.hintAlpha}`;
  rafId = requestAnimationFrame(frame);
  clock.last = now;
}

rafId = requestAnimationFrame(frame);

window.addEventListener('resize', () => {
  experience.resize();
  ScrollTrigger.refresh();
});

window.addEventListener('beforeunload', () => {
  cancelAnimationFrame(rafId);
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  timeline.kill();
  experience.renderer.dispose();
});
