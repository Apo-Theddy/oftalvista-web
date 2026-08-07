const comparisons = document.querySelectorAll("[data-comparison]");
const header = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelectorAll(".main-nav__link");

comparisons.forEach((comparison) => {
  const range = comparison.querySelector(".comparison__range");

  const setPosition = (value) => {
    const clamped = Math.max(0, Math.min(100, Number(value)));
    comparison.style.setProperty("--position", `${clamped}%`);
    range.value = clamped;
  };

  const updateFromPointer = (event) => {
    const rect = comparison.getBoundingClientRect();
    const x = event.clientX - rect.left;
    setPosition((x / rect.width) * 100);
  };

  range.addEventListener("input", (event) => setPosition(event.target.value));

  comparison.addEventListener("pointerdown", (event) => {
    comparison.setPointerCapture(event.pointerId);
    updateFromPointer(event);
  });

  comparison.addEventListener("pointermove", (event) => {
    if (comparison.hasPointerCapture(event.pointerId)) {
      updateFromPointer(event);
    }
  });
});

const easeOutCubic = (value) => {
  return 1 - Math.pow(1 - value, 3);
};

const smoothScrollTo = (targetY, duration = 620) => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo(0, targetY);
    return;
  }

  const startY = window.scrollY;
  const distance = targetY - startY;
  const startTime = performance.now();

  const step = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    window.scrollTo(0, startY + distance * easeOutCubic(progress));

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
};

const closeMobileMenu = () => {
  header?.classList.remove("site-header--menu-open");
  menuToggle?.setAttribute("aria-expanded", "false");
};

const updateHeaderState = () => {
  if (!header) return;
  header.classList.toggle("site-header--scrolled", window.scrollY > 24);
};

const updateActiveNavigation = () => {
  const sections = [...navLinks]
    .map((link) => {
      const id = link.getAttribute("href");
      const section = id?.startsWith("#") ? document.querySelector(id) : null;
      return section ? { link, section } : null;
    })
    .filter(Boolean);

  if (!sections.length) return;

  const checkpoint = window.scrollY + window.innerHeight * 0.38;
  let active = sections[0];

  sections.forEach((item) => {
    if (item.section.offsetTop <= checkpoint) {
      active = item;
    }
  });

  navLinks.forEach((link) => link.classList.remove("main-nav__link--active"));
  active.link.classList.add("main-nav__link--active");
};

menuToggle?.addEventListener("click", () => {
  const isOpen = header.classList.toggle("site-header--menu-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const hash = link.getAttribute("href");
    const target = hash && hash !== "#" ? document.querySelector(hash) : null;

    closeMobileMenu();

    if (!target) return;

    event.preventDefault();

    const headerHeight = header?.getBoundingClientRect().height ?? 0;
    const targetY = target.id === "inicio"
      ? 0
      : target.getBoundingClientRect().top + window.scrollY - headerHeight - 18;

    smoothScrollTo(Math.max(targetY, 0));
    history.pushState(null, "", hash);
  });
});

window.addEventListener("scroll", () => {
  updateHeaderState();
  updateActiveNavigation();
}, { passive: true });

window.addEventListener("resize", () => {
  updateHeaderState();
  updateActiveNavigation();
});

updateHeaderState();
updateActiveNavigation();
