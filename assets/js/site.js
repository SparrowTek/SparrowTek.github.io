"use strict";

(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------------------------------------------------------- Header */

  const header = document.querySelector("[data-header]");
  if (header) {
    const update = () => header.toggleAttribute("data-stuck", window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  /* ------------------------------------------------------------ Year */

  for (const node of document.querySelectorAll("[data-year]")) {
    node.textContent = String(new Date().getFullYear());
  }

  /* ---------------------------------------- Spotting a field guide entry */

  const spot = (entry) => {
    entry.classList.remove("is-spotted");
    void entry.offsetWidth; // restart the animation
    entry.classList.add("is-spotted");
  };

  const spotWhenVisible = (entry) => {
    const observer = new IntersectionObserver(
      (records) => {
        if (records.some((record) => record.isIntersecting)) {
          observer.disconnect();
          spot(entry);
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(entry);
  };

  document.addEventListener("click", (event) => {
    const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
    const id = link?.getAttribute("href")?.slice(1);
    const entry = id ? document.getElementById(id) : null;
    if (entry?.classList.contains("entry")) spotWhenVisible(entry);
  });

  const initial = window.location.hash ? document.getElementById(window.location.hash.slice(1)) : null;
  if (initial?.classList.contains("entry")) spotWhenVisible(initial);

  /* ------------------------------------------------- Birds on a wire */

  const stage = document.querySelector("[data-wire]");
  if (stage) perch(stage);

  function perch(stage) {
    const svg = stage.querySelector(".wire");
    const front = stage.querySelector(".wire-line--front");
    const back = stage.querySelector(".wire-line--back");
    const birds = Array.from(stage.querySelectorAll(".bird"), (el) => ({
      el,
      img: el.querySelector("img"),
      fx: 0, // position along the stage, 0...1
      h: 0, // height above the wire, px
      vy: 0, // vertical velocity, px/s (up is positive)
      squash: 0,
      squashV: 0,
      airborne: false,
      waiting: false,
      startAt: 0,
      drift: 0,
      h0: 1,
      fadeFrom: 0,
    }));
    if (!svg || !front || !back || birds.length === 0) return;

    // Spacing that looks like real birds on wide screens, tidier on small ones.
    const loose = [0.075, 0.19, 0.3, 0.425, 0.545, 0.65, 0.78, 0.915];

    const GRAVITY = 2600;
    const WIRE_K = 90;
    const WIRE_C = 4.6;
    const SQUASH_K = 520;
    const SQUASH_C = 18;

    let width = 0;
    let size = 0;
    let baseSag = 0;
    let x0 = 0;
    let x1 = 0;
    let y0 = 0;
    let sag = 0;
    let sagV = 0;
    let running = false;
    let last = 0;
    let inView = true;

    const layout = () => {
      width = stage.clientWidth;
      const height = stage.clientHeight;
      size = birds[0].el.offsetWidth;
      const head = Math.max(36, size * 0.55);
      baseSag = 0.034 * window.innerWidth;
      x0 = -0.04 * width;
      x1 = width * 1.04;
      y0 = head + size;
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      const gutter = clamp(width * 0.04, 16, 40);
      const inset = (gutter + size / 2) / width;
      const even = (i) => inset + (i * (1 - 2 * inset)) / Math.max(1, birds.length - 1);
      const t = clamp((width - 560) / 520, 0, 1);
      birds.forEach((bird, i) => {
        bird.fx = lerp(even(i), loose[i % loose.length], t);
      });
    };

    const wireY = (x, s) => {
      const u = (x - x0) / (x1 - x0);
      return y0 + 4 * s * u * (1 - u);
    };

    const draw = (now) => {
      const s = baseSag + sag;
      const mid = (x0 + x1) / 2;
      front.setAttribute("d", `M${x0} ${y0}Q${mid} ${y0 + 2 * s} ${x1} ${y0}`);
      const yb = y0 + Math.max(16, size * 0.26);
      const sb = baseSag * 1.12 + sag * 0.35;
      back.setAttribute("d", `M${x0} ${yb}Q${mid} ${yb + 2 * sb} ${x1} ${yb}`);

      for (const bird of birds) {
        const x = bird.fx * width + (bird.airborne && bird.drift ? bird.drift * clamp(bird.h / bird.h0, 0, 1) : 0);
        const u = (x - x0) / (x1 - x0);
        const slope = (4 * s * (1 - 2 * u)) / (x1 - x0);
        const lean = bird.airborne ? clamp(-bird.vy * 0.012, -9, 9) : 0;
        const angle = (Math.atan(slope) * 180) / Math.PI + lean;
        const y = wireY(x, s) - size - bird.h;
        bird.el.style.transform = `translate3d(${(x - size / 2).toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
        bird.img.style.transform = `rotate(${angle.toFixed(2)}deg) scale(${(1 + bird.squash * 0.55).toFixed(4)}, ${(1 - bird.squash).toFixed(4)})`;
        if (bird.waiting) {
          bird.el.style.opacity = "0";
        } else if (bird.fadeFrom) {
          const alpha = clamp((now - bird.fadeFrom) / 220, 0, 1);
          bird.el.style.opacity = alpha >= 1 ? "" : alpha.toFixed(3);
          if (alpha >= 1) bird.fadeFrom = 0;
        }
      }
    };

    const land = (bird) => {
      const impact = Math.min(-bird.vy, 650);
      bird.h = 0;
      bird.drift = 0;
      sagV += impact * 0.17 * (size / 88);
      bird.squashV += impact * 0.0011;
      if (impact > 300) {
        bird.vy = impact * 0.16; // one small rebound
      } else {
        bird.vy = 0;
        bird.airborne = false;
      }
    };

    const tick = (now) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      let moving = false;

      sagV += (-WIRE_K * sag - WIRE_C * sagV) * dt;
      sag += sagV * dt;
      if (Math.abs(sag) > 0.04 || Math.abs(sagV) > 0.4) {
        moving = true;
      } else {
        sag = 0;
        sagV = 0;
      }

      for (const bird of birds) {
        if (bird.waiting) {
          moving = true;
          if (now < bird.startAt) continue;
          bird.waiting = false;
          bird.airborne = true;
          bird.fadeFrom = now;
        }
        if (bird.airborne) {
          moving = true;
          bird.vy -= GRAVITY * dt;
          bird.h += bird.vy * dt;
          if (bird.h <= 0) land(bird);
        }
        if (bird.squash !== 0 || bird.squashV !== 0) {
          bird.squashV += (-SQUASH_K * bird.squash - SQUASH_C * bird.squashV) * dt;
          bird.squash += bird.squashV * dt;
          if (Math.abs(bird.squash) < 0.0004 && Math.abs(bird.squashV) < 0.02) {
            bird.squash = 0;
            bird.squashV = 0;
          } else {
            moving = true;
          }
        }
        if (bird.fadeFrom) moving = true;
      }

      draw(now);
      if (moving) {
        window.requestAnimationFrame(tick);
      } else {
        running = false;
      }
    };

    const wake = () => {
      if (running) return;
      running = true;
      last = performance.now();
      window.requestAnimationFrame(tick);
    };

    const hop = (bird, strength = 1) => {
      if (reducedMotion.matches || bird.airborne || bird.waiting) return;
      bird.airborne = true;
      bird.vy = Math.sqrt(2 * GRAVITY * size * 0.5 * strength);
      sagV -= bird.vy * 0.05; // the wire springs up as the bird lets go
      wake();
    };

    const arrive = () => {
      const order = [3, 0, 6, 1, 5, 2, 7, 4];
      const start = performance.now() + 160;
      order.forEach((index, step) => {
        const bird = birds[index];
        if (!bird) return;
        bird.waiting = true;
        bird.startAt = start + step * 115;
        bird.h0 = size * 2.2 + (index % 3) * size * 0.35;
        bird.h = bird.h0;
        bird.vy = -120;
        bird.drift = (index % 2 === 0 ? -1 : 1) * size * 0.6;
      });
      wake();
    };

    // Lay out first, then reveal: no bird is ever drawn in the wrong spot.
    layout();
    const animateIn = !reducedMotion.matches && stage.getBoundingClientRect().top < window.innerHeight;
    if (animateIn) arrive();
    draw(performance.now());
    stage.setAttribute("data-ready", "");

    let pending = false;
    new ResizeObserver(() => {
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(() => {
        pending = false;
        layout();
        draw(performance.now());
      });
    }).observe(stage);

    for (const bird of birds) {
      bird.el.addEventListener("pointerenter", (event) => {
        if (event.pointerType === "mouse") hop(bird);
      });
      bird.el.addEventListener("focus", () => {
        if (bird.el.matches(":focus-visible")) hop(bird, 0.6);
      });
    }

    // Now and then one of the flock shuffles its feet.
    new IntersectionObserver((records) => {
      inView = records.some((record) => record.isIntersecting);
    }).observe(stage);

    const fidget = () => {
      window.setTimeout(() => {
        if (inView && document.visibilityState === "visible") {
          const bird = birds[Math.floor(Math.random() * birds.length)];
          if (bird) hop(bird, 0.32);
        }
        fidget();
      }, 5500 + Math.random() * 6000);
    };
    fidget();
  }
})();
