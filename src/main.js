import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createExperience } from './scene';

gsap.registerPlugin(ScrollTrigger);

const canvas = document.querySelector('#scene-canvas');
const scrollContainer = document.querySelector('#scroll-container');
const card = document.querySelector('#love-card');
const scrollHint = document.querySelector('#scroll-hint');

const isMobile = window.matchMedia('(max-width: 768px)').matches;
const experience = createExperience(canvas, isMobile);

const { state } = experience;

let pointerTiltX = 0;
let pointerTiltY = 0;
let pointerTargetX = 0;
let pointerTargetY = 0;

const timeline = gsap.timeline({
  scrollTrigger: {
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.8,
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

timeline.to(
  state,
  {
    camZ: -53,
    camX: 1.1,
    lookX: 1.0,
    lookY: 1.4,
    lookZ: -57,
    rockReveal: 1,
    romance: 1,
    heartsAlpha: 0.8,
    cardAlpha: 1,
    cardScale: isMobile ? 1.02 : 1.08,
    cardRotate: 0,
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

if (!isMobile) {
  window.addEventListener('pointermove', (event) => {
    const px = event.clientX / window.innerWidth - 0.5;
    const py = event.clientY / window.innerHeight - 0.5;
    pointerTargetX = gsap.utils.clamp(-5, 5, px * 9);
    pointerTargetY = gsap.utils.clamp(-4, 4, -py * 8);
  });
}

let rafId = 0;

function frame(now) {
  const elapsed = now * 0.001;

  pointerTiltX += (pointerTargetX - pointerTiltX) * 0.08;
  pointerTiltY += (pointerTargetY - pointerTiltY) * 0.08;
  card.style.setProperty('--tilt-x', `${pointerTiltX.toFixed(3)}deg`);
  card.style.setProperty('--tilt-y', `${pointerTiltY.toFixed(3)}deg`);

  experience.update(elapsed, card);
  scrollHint.style.opacity = `${state.hintAlpha}`;

  rafId = requestAnimationFrame(frame);
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
  shineTween.kill();
  experience.renderer.dispose();
});
