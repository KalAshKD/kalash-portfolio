
(() => {
  'use strict';

  // Accessibility: respect reduced-motion preference.
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (reduceMotion) return;

  const isTouch = window.matchMedia(
    '(hover: none), (pointer: coarse)'
  ).matches;

  // Avoid creating duplicate effects.
  if (document.getElementById('reactive-canvas')) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'reactive-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const progress = document.createElement('div');
  progress.id = 'reactive-scroll-progress';
  progress.setAttribute('aria-hidden', 'true');

  document.body.append(canvas, progress);

  const ctx = canvas.getContext('2d', { alpha: true });

  if (!ctx) {
    canvas.remove();
    progress.remove();
    return;
  }

  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];
  
  let experienceMode = 'calm';
  const savedModeKey = 'portfolio-experience-mode';

  function getSavedExperienceMode() {
    try {
      return localStorage.getItem(savedModeKey) === 'play'
        ? 'play'
        : 'calm';
    } catch {
      return 'calm';
    }
  }

  let frame = 0;
  let scrollQueued = false;
  let isVisible = true;

  const pointer = {
    x: -1000,
    y: -1000,
    active: false
  };

  
  // Cursor trail particles
  const trailParticles = [];
  let maxTrailParticles = 8;
    let trailSpawnInterval = 45;

  let lastTrailTime = 0;

  function addTrailParticle(x, y) {
    const now = performance.now();

    // Limit particle creation for smooth performance.
    if (now - lastTrailTime < trailSpawnInterval) return;
    lastTrailTime = now;

    trailParticles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.7,
      vy: (Math.random() - 0.5) * 0.7,
      radius: 1.5 + Math.random() * 2,
      life: 1,
      decay: 0.018 + Math.random() * 0.018
    });

    if (trailParticles.length > maxTrailParticles) {
      trailParticles.shift();
    }
  }

  function drawTrail() {
    for (let i = trailParticles.length - 1; i >= 0; i--) {
      const p = trailParticles[i];

      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;

      if (p.life <= 0) {
        trailParticles.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(
        p.x,
        p.y,
        p.radius * p.life,
        0,
        Math.PI * 2
      );

      ctx.fillStyle =
        `rgba(115, 124, 89, ${p.life * 0.65})`;

      ctx.fill();
    }
  }

  
  function getParticleCount() {
    const spacing = width < 700 ? 115 : 145;
    const areaCount = Math.floor(
      (width * height) / (spacing * spacing)
    );

    const calmLimit = width < 700 ? 14 : 30;
    const playLimit = width < 700 ? 24 : 58;

    const limit = experienceMode === 'play'
      ? playLimit
      : calmLimit;

    return Math.min(limit, Math.max(8, areaCount));
  }


  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    particles = Array.from(
      { length: getParticleCount() },
      () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: 1 + Math.random() * 1.25
      })
    );
  }

  function draw() {
    if (!isVisible) return;

    ctx.clearRect(0, 0, width, height);
    drawTrail();

    const maxLink = width < 700 ? 105 : 135;
    
    const scrollAmount = Number(
    getComputedStyle(document.documentElement)
        .getPropertyValue('--reactive-scroll')
        .trim()
    ) || 0;

    const scrollDrift = (scrollAmount - 0.5) * 0.30;


    // Draw and move particles.
    for (const p of particles) {
      p.x += p.vx;
        p.y += p.vy + scrollDrift;

      if (p.x < -5) p.x = width + 5;
      if (p.x > width + 5) p.x = -5;
      if (p.y < -5) p.y = height + 5;
      if (p.y > height + 5) p.y = -5;

      // Gently repel particles near the cursor.
      if (pointer.active && !isTouch) {
        const dx = pointer.x - p.x;
        const dy = pointer.y - p.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 125 && dist > 0) {
          p.x -= (dx / dist) * (125 - dist) * 0.006;
          p.y -= (dy / dist) * (125 - dist) * 0.006;
        }
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(115, 124, 89, 0.55)';
      ctx.fill();
    }

    // Connect nearby particles.
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];

        const dist = Math.hypot(
          a.x - b.x,
          a.y - b.y
        );

        if (dist < maxLink) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);

          ctx.strokeStyle =
            `rgba(115, 124, 89, ${
              (1 - dist / maxLink) * 0.22
            })`;

          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
    }

    // Connect the cursor to nearby particles.
    if (pointer.active && !isTouch) {
      for (const p of particles) {
        const dist = Math.hypot(
          pointer.x - p.x,
          pointer.y - p.y
        );

        if (dist < 150) {
          ctx.beginPath();
          ctx.moveTo(pointer.x, pointer.y);
          ctx.lineTo(p.x, p.y);

          ctx.strokeStyle =
            `rgba(115, 124, 89, ${
              (1 - dist / 150) * 0.24
            })`;

          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    frame = window.requestAnimationFrame(draw);
  }

  function updateScroll() {
    const maxScroll =
      document.documentElement.scrollHeight -
      window.innerHeight;

    const amount = maxScroll > 0
      ? window.scrollY / maxScroll
      : 0;

    document.documentElement.style.setProperty(
      '--reactive-scroll',
      String(Math.min(1, Math.max(0, amount)))
    );

    scrollQueued = false;
  }

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;

    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;

    if (!isTouch) {
    addTrailParticle(pointer.x, pointer.y);
    }
  }, { passive: true });

  window.addEventListener('pointerleave', () => {
    pointer.active = false;
  }, { passive: true });

  window.addEventListener('blur', () => {
    pointer.active = false;
  });

  window.addEventListener('resize', resize, {
    passive: true
  });

  window.addEventListener('scroll', () => {
    if (!scrollQueued) {
      scrollQueued = true;
      window.requestAnimationFrame(updateScroll);
    }
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    isVisible = !document.hidden;

    if (!isVisible) {
      window.cancelAnimationFrame(frame);
    } else {
      frame = window.requestAnimationFrame(draw);
    }
  });

  resize();
  updateScroll();
  frame = window.requestAnimationFrame(draw);




  
  
  // =====================================
  // MAGNETIC BUTTON INTERACTION
  // WITH SKILL CONSTELLATION LINE SYNC
  // =====================================
  
  const magneticTargets = document.querySelectorAll(
    'a, button, .btn'
    );

    const filteredMagneticTargets = [...magneticTargets].filter(
    (element) => !element.matches(
        '#skill-constellation .constellation-node'
    )
    );

  const canUseMagnetic = window.matchMedia(
    '(hover: hover) and (pointer: fine)'
  ).matches;

  if (canUseMagnetic) {
    filteredMagneticTargets.forEach((element) => {
      const rect = element.getBoundingClientRect();

      if (rect.width > 320 || rect.height > 100) return;

      // Keep the original transform transition.
      element.style.transition =
        'transform 220ms cubic-bezier(0.2, 0.7, 0.3, 1)';

      element.addEventListener('pointermove', (event) => {
        const bounds = element.getBoundingClientRect();

        const x = event.clientX -
          (bounds.left + bounds.width / 2);

        const y = event.clientY -
          (bounds.top + bounds.height / 2);

        const strength = 0.16;

        const moveX = x * strength;
        const moveY = y * strength;

        element.style.transform =
          `translate(${moveX}px, ${moveY}px)`;

        // Sync constellation lines with the moving circle.
        if (element.matches('#skills .constellation-node')) {
          element.dataset.magneticX = String(moveX);
          element.dataset.magneticY = String(moveY);

          updateConstellationLines();
        }
      });

      function resetMagnetic() {
        element.style.transform = '';

        if (element.matches('#skills .constellation-node')) {
          delete element.dataset.magneticX;
          delete element.dataset.magneticY;

          updateConstellationLines();
        }
      }

      element.addEventListener('pointerleave', resetMagnetic);
      element.addEventListener('blur', resetMagnetic);
    });
  }

  // =====================================
  // CONSTELLATION LINE MOVEMENT SYNC
  // =====================================

  function updateConstellationLines() {
    const constellation = document.querySelector(
      '#skill-constellation'
    );

    if (!constellation) return;

    const svg = constellation.querySelector(
      '.constellation-lines'
    );

    if (!svg) return;

    const nodes = [
      ...constellation.querySelectorAll('.constellation-node')
    ];

    const lines = [...svg.querySelectorAll('line')];

    // Convert pixel movement into SVG viewBox coordinates.
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const scaleX = 600 / rect.width;
    const scaleY = 420 / rect.height;

    const nodeOffsets = new Map();

    nodes.forEach(node => {
      const key = node.dataset.skill;

      nodeOffsets.set(key, {
        x: (Number(node.dataset.magneticX) || 0) * scaleX,
        y: (Number(node.dataset.magneticY) || 0) * scaleY
      });
    });

    lines.forEach(line => {
      const from = nodeOffsets.get(line.dataset.from);
      const to = nodeOffsets.get(line.dataset.to);

      if (!from || !to) return;

      const originalX1 = Number(line.getAttribute('data-base-x1')
        ?? line.getAttribute('x1'));
      const originalY1 = Number(line.getAttribute('data-base-y1')
        ?? line.getAttribute('y1'));
      const originalX2 = Number(line.getAttribute('data-base-x2')
        ?? line.getAttribute('x2'));
      const originalY2 = Number(line.getAttribute('data-base-y2')
        ?? line.getAttribute('y2'));

      // Save original coordinates once.
      line.dataset.baseX1 = String(originalX1);
      line.dataset.baseY1 = String(originalY1);
      line.dataset.baseX2 = String(originalX2);
      line.dataset.baseY2 = String(originalY2);

      line.setAttribute('x1', originalX1 + from.x);
      line.setAttribute('y1', originalY1 + from.y);
      line.setAttribute('x2', originalX2 + to.x);
      line.setAttribute('y2', originalY2 + to.y);
    });
  }

  window.addEventListener('resize', updateConstellationLines, {
    passive: true
  });


  // =====================================
  // INTERACTIVE TEXT EFFECTS
  // =====================================

  const textEffectSelectors = [
    '.section-title',
    '.hero-title',
    '.section-heading'
  ];

  document.querySelectorAll(
    textEffectSelectors.join(',')
  ).forEach((element) => {
    element.classList.add('reactive-text');
  });

  // Apply lift only to headings that opt in.
  document.querySelectorAll(
    '[data-reactive="lift"]'
  ).forEach((element) => {
    element.classList.add('reactive-lift');
  });

  // Apply underline to links that opt in.
  document.querySelectorAll(
    '[data-reactive="underline"]'
  ).forEach((element) => {
    element.classList.add('reactive-underline');
  });








  
  // =====================================
  // CUSTOM CURSOR FEEDBACK
  // =====================================

  const cursorFinePointer = window.matchMedia(
    '(hover: hover) and (pointer: fine)'
  ).matches;

  const cursorReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (cursorFinePointer && !cursorReducedMotion) {
    const cursorRing = document.createElement('div');

    cursorRing.id = 'reactive-cursor-ring';
    cursorRing.setAttribute('aria-hidden', 'true');

    document.body.appendChild(cursorRing);

    let cursorX = -100;
    let cursorY = -100;
    let cursorFrame = 0;

    function moveCursorRing() {
      cursorRing.style.transform =
        `translate3d(${cursorX - cursorRing.offsetWidth / 2}px, ` +
        `${cursorY - cursorRing.offsetHeight / 2}px, 0)`;

      cursorFrame = 0;
    }

    document.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;

      cursorX = event.clientX;
      cursorY = event.clientY;

      cursorRing.classList.add('is-visible');

      if (!cursorFrame) {
        cursorFrame = requestAnimationFrame(moveCursorRing);
      }
    }, { passive: true });

    document.addEventListener('pointerover', (event) => {
      const target = event.target;

      if (!(target instanceof Element)) return;

      const interactive = target.closest(
        'a, button, [role="button"], input[type="submit"]'
      );

      const link = target.closest('a');

      cursorRing.classList.toggle(
        'is-interactive',
        Boolean(interactive)
      );

      cursorRing.classList.toggle(
        'is-link',
        Boolean(link)
      );
    }, { passive: true });

    document.addEventListener('pointerleave', () => {
      cursorRing.classList.remove('is-visible');
    });

    document.addEventListener('pointerout', (event) => {
      if (!event.relatedTarget) {
        cursorRing.classList.remove('is-visible');
      }
    });
  }














  
  // =====================================
  // CALM / PLAY MODE CONTROLLER
  // =====================================

  const modeToggle = document.createElement('div');

  modeToggle.id = 'reactive-mode-toggle';
  modeToggle.setAttribute('role', 'group');
  modeToggle.setAttribute('aria-label', 'Animation mode');

  modeToggle.innerHTML = `
    <button type="button" data-mode="calm"
      aria-pressed="true">
      Calm
    </button>
    <button type="button" data-mode="play"
      aria-pressed="false">
      ✨ Play
    </button>
  `;

  document.body.appendChild(modeToggle);
  // RESUME BUTTON
const resumeButton = document.createElement('a');

resumeButton.id = 'reactive-resume-button';
resumeButton.href = '/static/home/resume.pdf';
resumeButton.target = '_blank';
resumeButton.rel = 'noopener noreferrer';
resumeButton.textContent = 'Resume ↗';

document.body.appendChild(resumeButton);
// Magnetic Resume Button
resumeButton.addEventListener('mousemove', (e) => {
    const rect = resumeButton.getBoundingClientRect();

    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    resumeButton.style.transform =
        `translate(${x * 0.18}px, ${y * 0.18}px)`;
});

resumeButton.addEventListener('mouseleave', () => {
    resumeButton.style.transform = 'translate(0, 0)';
});
  const modeButtons = modeToggle.querySelectorAll(
    'button[data-mode]'
  );

  
  function setExperienceMode(mode) {
    experienceMode = mode === 'play' ? 'play' : 'calm';

    const playMode = experienceMode === 'play';

    document.documentElement.classList.toggle(
      'play-mode',
      playMode
    );

    document.documentElement.classList.toggle(
      'calm-mode',
      !playMode
    );

    // Change trail density.
    maxTrailParticles = playMode ? 18 : 8;
    trailSpawnInterval = playMode ? 24 : 45;

    // Rebuild particles for the selected mode.
    resize();

    // Update accessible selected-state indicators.
    modeButtons.forEach((button) => {
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.mode === experienceMode)
      );
    });

    // Remember the visitor's preference.
    try {
      localStorage.setItem(savedModeKey, experienceMode);
    } catch {
      // The effect still works if storage is unavailable.
    }
  }


  modeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setExperienceMode(button.dataset.mode);
    });
  });

  // Calm mode is the default on every page load.
  setExperienceMode(getSavedExperienceMode());






  
  
  // =====================================
  // REPEATING SCROLL-REACTIVE REVEAL
  // =====================================

  const revealElements = document.querySelectorAll(
    '[data-reactive-reveal]'
  );

  const revealReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (
    revealReducedMotion ||
    !('IntersectionObserver' in window)
  ) {
    revealElements.forEach((element) => {
      element.classList.add('reactive-revealed');
    });
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reactive-revealed');
          } else {
            entry.target.classList.remove('reactive-revealed');
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -35px 0px'
      }
    );

    revealElements.forEach((element) => {
      revealObserver.observe(element);
    });
  }
















  
  // =====================================
  // STAGGERED CONTENT REVEAL
  // =====================================

  const staggerContainers = document.querySelectorAll(
    '[data-reactive-stagger]'
  );

  const staggerReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (
    staggerReducedMotion ||
    !('IntersectionObserver' in window)
  ) {
    staggerContainers.forEach((container) => {
      container.querySelectorAll(
        '.reactive-stagger-item'
      ).forEach((item) => {
        item.classList.add('reactive-stagger-visible');
      });
    });
  } else {
    staggerContainers.forEach((container) => {
      const items = Array.from(container.children);

      items.forEach((item) => {
        item.classList.add('reactive-stagger-item');
      });

      const staggerObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            items.forEach((item) => {
              item.classList.toggle(
                'reactive-stagger-visible',
                entry.isIntersecting
              );
            });
          });
        },
        {
          threshold: 0.12,
          rootMargin: '0px 0px -25px 0px'
        }
      );

      staggerObserver.observe(container);
    });
  }













  
/* STEP 8: CURSOR-FOLLOWING SPOTLIGHT */

const spotlightCards = document.querySelectorAll(
  '[data-reactive-depth]'
);

const spotlightFinePointer = window.matchMedia(
  '(hover: hover) and (pointer: fine)'
).matches;

if (spotlightFinePointer) {
  spotlightCards.forEach(card => {
    card.addEventListener('pointermove', event => {
      const rect = card.getBoundingClientRect();

      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      card.style.setProperty('--spot-x', `${x}px`);
      card.style.setProperty('--spot-y', `${y}px`);
    });

    card.addEventListener('pointerleave', () => {
      card.style.removeProperty('--spot-x');
      card.style.removeProperty('--spot-y');
    });
  });
}
 




/* STEP 11: SKILL BAR REVEAL */

const skillItems = document.querySelectorAll('[data-reactive-skill]');
const skillReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

if (skillReducedMotion || !('IntersectionObserver' in window)) {
  skillItems.forEach(item => item.classList.add('skill-visible'));
} else {
  const skillObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      entry.target.classList.toggle(
        'skill-visible',
        entry.isIntersecting
      );
    });
  }, {
    threshold: 0.25
  });

  skillItems.forEach(item => skillObserver.observe(item));
}

})();
