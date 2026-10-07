((cssText, artDataUrl, rawConfig) => {
  if(window.top!==window)return {installed:false,reason:'child-frame'};
  const STATE_KEY = "__CODEX_DREAM_SKIN_STATE__";
  const STYLE_ID = "codex-dream-skin-style";
  const CHROME_ID = "codex-dream-skin-chrome";
  const PETAL_ID = "codex-dream-skin-petals";
  const CONTENT_LAYER_CLASS = "codex-dream-skin-content-layer";
  const PETAL_SEEDS = [
    [3, 7, 18, -5, -8, 430, .54, "rgb(247 183 196)"],
    [8, 9, 22, -15, 6, 590, .46, "rgb(231 150 173)"],
    [11, 9, 21, -12, 7, 610, .48, "rgb(232 151 174)"],
    [16, 6, 17, -9, -5, 510, .59, "rgb(251 205 214)"],
    [18, 6, 16, -8, -5, 520, .6, "rgb(250 202 210)"],
    [23, 10, 24, -19, 11, 760, .43, "rgb(219 127 155)"],
    [26, 10, 23, -16, 10, 740, .46, "rgb(221 132 159)"],
    [31, 7, 19, -6, -8, 460, .56, "rgb(246 177 194)"],
    [34, 7, 19, -3, -9, 490, .58, "rgb(248 189 204)"],
    [38, 8, 18, -12, -7, 600, .55, "rgb(245 173 191)"],
    [42, 9, 20, -14, 8, 680, .5, "rgb(235 157 180)"],
    [46, 6, 17, -7, -4, 550, .61, "rgb(252 211 218)"],
    [49, 6, 17, -9, -6, 560, .62, "rgb(252 211 218)"],
    [53, 10, 24, -20, 12, 780, .42, "rgb(216 123 151)"],
    [57, 8, 22, -18, 11, 710, .45, "rgb(228 143 168)"],
    [61, 7, 18, -5, -7, 480, .57, "rgb(244 172 190)"],
    [64, 7, 18, -7, -7, 470, .58, "rgb(246 177 194)"],
    [68, 11, 25, -21, 13, 810, .41, "rgb(214 120 149)"],
    [70, 10, 24, -15, 9, 760, .44, "rgb(218 126 154)"],
    [73, 8, 20, -9, 8, 720, .46, "rgb(236 159 182)"],
    [76, 6, 16, -10, -4, 540, .61, "rgb(251 205 214)"],
    [81, 9, 21, -17, 10, 690, .49, "rgb(234 150 175)"],
    [86, 7, 19, -6, -8, 510, .56, "rgb(247 181 198)"],
    [91, 10, 23, -13, 7, 730, .43, "rgb(222 133 160)"],
    [96, 6, 17, -11, -5, 580, .59, "rgb(250 199 210)"],
    [99, 8, 20, -4, 5, 640, .47, "rgb(230 148 172)"],
  ];
  const ROOT_CLASSES = [
    "codex-dream-skin",
    "dream-theme-light",
    "dream-theme-dark",
    "dream-art-wide",
    "dream-art-standard",
    "dream-focus-left",
    "dream-focus-center",
    "dream-focus-right",
    "dream-safe-left",
    "dream-safe-center",
    "dream-safe-right",
    "dream-safe-none",
    "dream-task-ambient",
    "dream-task-banner",
    "dream-task-off",
  ];
  const ROOT_PROPERTIES = [
    "--dream-art",
    "--dream-art-position",
    "--dream-focus-x",
    "--dream-focus-y",
    "--dream-accent",
    "--dream-accent-ink",
    "--dream-image-luma",
  ];
  const HOME_UTILITY_CLASS = "dream-home-utility";
  const MAIN_SURFACE_ALIAS_ATTRIBUTE = "data-codex-dream-main-surface-alias";
  const installToken = {};
  let samplingNativeShell = false;
  let observer = null;
  window.__CODEX_DREAM_SKIN_DISABLED__ = false;

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, Number(value)));
  const luminance = (red, green, blue) => {
    const linear = [red, green, blue].map((value) => {
      const channel = value / 255;
      return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
    });
    return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
  };
  const defaultProfile = {
    appearance: "dark",
    accent: [108, 131, 142],
    focusX: .5,
    focusY: .5,
    aspect: 1.6,
    luma: .32,
    safeArea: "center",
  };

  const normalizeConfig = (value) => {
    const config = value && typeof value === "object" ? value : {};
    const art = config.art && typeof config.art === "object" ? config.art : {};
    const hasNumber = (candidate) =>
      (typeof candidate === "number" || (typeof candidate === "string" && candidate.trim() !== "")) &&
      Number.isFinite(Number(candidate));
    const requestedAccent = typeof config?.palette?.accent === "string"
      ? config.palette.accent.trim()
      : "";
    const safeAccent = /^(?:#[\da-f]{3,8}|(?:rgb|hsl|oklch|oklab)\([^;{}]{1,96}\))$/i.test(requestedAccent)
      ? requestedAccent
      : null;
    const appearance = ["auto", "light", "dark"].includes(config.appearance)
      ? config.appearance
      : "auto";
    const safeArea = ["auto", "left", "right", "center", "none"].includes(art.safeArea)
      ? art.safeArea
      : "auto";
    const taskMode = ["auto", "ambient", "banner", "off"].includes(art.taskMode)
      ? art.taskMode
      : "auto";
    const metadataRatio = Number(config?.artMetadata?.ratio);
    return {
      appearance,
      safeArea,
      taskMode,
      focusX: hasNumber(art.focusX) ? clamp(art.focusX) : null,
      focusY: hasNumber(art.focusY) ? clamp(art.focusY) : null,
      accent: safeAccent,
      initialAspect: Number.isFinite(metadataRatio) && metadataRatio > 0 ? metadataRatio : null,
    };
  };

  const previous = window[STATE_KEY];
  if (previous?.observer) previous.observer.disconnect();
  if (previous?.timer) clearInterval(previous.timer);
  if (previous?.scheduler?.timeout) clearTimeout(previous.scheduler.timeout);
  // Retain the old decoded image until its replacement has loaded.
  const newArtUrl = (() => {
    const comma = artDataUrl.indexOf(",");
    const binary = atob(artDataUrl.slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    const mime = /^data:([^;,]+)/.exec(artDataUrl)?.[1] || "image/png";
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  })();
  let artUrl = previous?.artUrl || newArtUrl;
  let artReady = Boolean(previous?.artUrl);
  const config = normalizeConfig(rawConfig);
  let profile = {
    ...defaultProfile,
    aspect: config.initialAspect ?? defaultProfile.aspect,
  };
  const existingStyle = document.getElementById(STYLE_ID);
  if (existingStyle) {
    existingStyle.textContent = cssText;
    existingStyle.dataset.dreamVersion = "10";
  }

  const analyzeArt = () => new Promise((resolve) => {
    if (typeof Image !== "function") {
      resolve(defaultProfile);
      return;
    }
    const image = new Image();
    image.onload = () => {
      try {
        const width = 48;
        const height = Math.max(12, Math.round(width * image.naturalHeight / image.naturalWidth));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext?.("2d", { willReadFrequently: true });
        if (!context) throw new Error("Canvas is unavailable");
        context.drawImage(image, 0, 0, width, height);
        const pixels = context.getImageData(0, 0, width, height).data;
        let count = 0;
        let totalRed = 0;
        let totalGreen = 0;
        let totalBlue = 0;
        let totalBrightness = 0;
        const samples = [];
        const sampleMap = new Array(width * height);
        for (let offset = 0; offset < pixels.length; offset += 4) {
          if (pixels[offset + 3] < 96) continue;
          const red = pixels[offset];
          const green = pixels[offset + 1];
          const blue = pixels[offset + 2];
          const light = (.2126 * red + .7152 * green + .0722 * blue) / 255;
          const sample = { red, green, blue, light, index: offset / 4 };
          samples.push(sample);
          sampleMap[sample.index] = sample;
          totalRed += red;
          totalGreen += green;
          totalBlue += blue;
          totalBrightness += light;
          count += 1;
        }
        if (!count) throw new Error("Image contains no opaque pixels");
        const average = [totalRed / count, totalGreen / count, totalBlue / count];
        const averageBrightness = totalBrightness / count;
        const information = (start, end) => {
          let total = 0;
          let totalSquared = 0;
          let edges = 0;
          let edgeCount = 0;
          let sampleCount = 0;
          for (let y = 0; y < height; y += 1) {
            for (let x = start; x < end; x += 1) {
              const sample = sampleMap[y * width + x];
              if (!sample) continue;
              total += sample.light;
              totalSquared += sample.light * sample.light;
              sampleCount += 1;
              const previousSample = x > start ? sampleMap[y * width + x - 1] : null;
              const above = y > 0 ? sampleMap[(y - 1) * width + x] : null;
              if (previousSample) { edges += Math.abs(sample.light - previousSample.light); edgeCount += 1; }
              if (above) { edges += Math.abs(sample.light - above.light); edgeCount += 1; }
            }
          }
          const mean = sampleCount ? total / sampleCount : 0;
          const variance = sampleCount ? Math.max(0, totalSquared / sampleCount - mean * mean) : 1;
          return Math.sqrt(variance) * .58 + (edgeCount ? edges / edgeCount : 1) * .42;
        };
        const zoneWidth = Math.max(1, Math.floor(width * .38));
        const leftInformation = information(0, zoneWidth);
        const rightInformation = information(width - zoneWidth, width);
        let safeArea = "center";
        if (leftInformation < rightInformation * .86) safeArea = "left";
        else if (rightInformation < leftInformation * .86) safeArea = "right";
        let focusWeight = 0;
        let focusX = 0;
        let focusY = 0;
        let accentWeight = 0;
        let accent = [0, 0, 0];
        for (const sample of samples) {
          const x = sample.index % width;
          const y = Math.floor(sample.index / width);
          const difference = Math.sqrt(
            (sample.red - average[0]) ** 2 +
            (sample.green - average[1]) ** 2 +
            (sample.blue - average[2]) ** 2,
          ) / 441.7;
          const saliency = .03 + difference ** 1.35;
          focusX += (x / Math.max(1, width - 1)) * saliency;
          focusY += (y / Math.max(1, height - 1)) * saliency;
          focusWeight += saliency;
          const max = Math.max(sample.red, sample.green, sample.blue);
          const min = Math.min(sample.red, sample.green, sample.blue);
          const saturation = max ? (max - min) / max : 0;
          const usableLight = 1 - Math.min(1, Math.abs(sample.light - .46) / .54);
          const weight = saturation ** 2 * (.15 + usableLight);
          accent[0] += sample.red * weight;
          accent[1] += sample.green * weight;
          accent[2] += sample.blue * weight;
          accentWeight += weight;
        }
        const resolvedAccent = accentWeight > 1
          ? accent.map((channel) => Math.round(channel / accentWeight))
          : average.map((channel) => Math.round(channel));
        let resolvedFocusX = clamp(focusX / focusWeight);
        if (safeArea === "left") resolvedFocusX = Math.max(.64, resolvedFocusX);
        if (safeArea === "right") resolvedFocusX = Math.min(.36, resolvedFocusX);
        resolve({
          appearance: averageBrightness >= .58 ? "light" : "dark",
          accent: resolvedAccent,
          focusX: resolvedFocusX,
          focusY: clamp(focusY / focusWeight),
          aspect: image.naturalWidth / Math.max(1, image.naturalHeight),
          luma: clamp(averageBrightness),
          safeArea,
        });
      } catch {
        resolve(defaultProfile);
      }
    };
    image.onerror = () => resolve(defaultProfile);
    image.src = artUrl;
  });

  const detectShellAppearance = () => {
    const root = document.documentElement;
    const body = document.body;
    const classes = `${root?.className || ""} ${body?.className || ""}`
      .toLowerCase()
      .replace(/\bdream-theme-(?:dark|light)\b/g, "");
    if (/\b(dark|electron-dark|theme-dark|appearance-dark)\b/.test(classes)) return "dark";
    if (/\b(light|electron-light|theme-light|appearance-light)\b/.test(classes)) return "light";

    const dataTheme = (
      root?.getAttribute?.("data-theme") ||
      root?.getAttribute?.("data-appearance") ||
      root?.getAttribute?.("data-color-mode") ||
      body?.getAttribute?.("data-theme") ||
      body?.getAttribute?.("data-appearance") ||
      ""
    ).toLowerCase();
    if (dataTheme.includes("dark")) return "dark";
    if (dataTheme.includes("light")) return "light";

    try {
      const hadSkin = root?.classList?.contains?.("codex-dream-skin");
      const savedSkinClasses = hadSkin
        ? ROOT_CLASSES.filter((className) => root.classList.contains(className))
        : [];
      samplingNativeShell = true;
      if (hadSkin) root.classList.remove(...ROOT_CLASSES);
      try {
        const colorScheme = getComputedStyle(root).colorScheme || "";
        if (colorScheme.includes("dark") && !colorScheme.includes("light")) return "dark";
        if (colorScheme.includes("light") && !colorScheme.includes("dark")) return "light";
      } finally {
        if (hadSkin) root.classList.add(...savedSkinClasses);
        observer?.takeRecords?.();
        samplingNativeShell = false;
      }
    } catch {
      samplingNativeShell = false;
    }
    try {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch {}
    return "light";
  };

  const clearSkinDom = () => {
    const root = document.documentElement;
    root?.classList.remove(...ROOT_CLASSES);
    for (const property of ROOT_PROPERTIES) root?.style.removeProperty(property);
    document.querySelectorAll(".dream-home").forEach((node) => node.classList.remove("dream-home"));
    document.querySelectorAll(".dream-task").forEach((node) => node.classList.remove("dream-task"));
    document.querySelectorAll(".dream-home-shell").forEach((node) => node.classList.remove("dream-home-shell"));
    document.querySelectorAll(".dream-task-shell").forEach((node) => node.classList.remove("dream-task-shell"));
    document.querySelectorAll(`.${HOME_UTILITY_CLASS}`).forEach((node) => node.classList.remove(HOME_UTILITY_CLASS));
    document.querySelectorAll(`[${MAIN_SURFACE_ALIAS_ATTRIBUTE}]`).forEach((node) => {
      node.classList.remove("main-surface");
      node.removeAttribute(MAIN_SURFACE_ALIAS_ATTRIBUTE);
    });
    document.getElementById(STYLE_ID)?.remove();
    document.getElementById(CHROME_ID)?.remove();
    document.getElementById(PETAL_ID)?.remove();
    document.getElementById("root")?.classList.remove(CONTENT_LAYER_CLASS);
  };

  const ensurePetals = () => {
    const contentLayer = document.getElementById("root");
    contentLayer?.classList.add(CONTENT_LAYER_CLASS);

    let field = document.getElementById(PETAL_ID);
    if (!field || field.parentElement !== document.body) {
      field?.remove();
      field = document.createElement("div");
      field.id = PETAL_ID;
      field.setAttribute("aria-hidden", "true");
      document.body.appendChild(field);
    }

    if (field.childElementCount === PETAL_SEEDS.length) return;
    field.replaceChildren();
    for (const [left, size, duration, delay, drift, turn, opacity, color] of PETAL_SEEDS) {
      const petal = document.createElement("span");
      petal.className = "dream-petal";
      petal.style.setProperty("--petal-left", `${left}vw`);
      petal.style.setProperty("--petal-size", `${size}px`);
      petal.style.setProperty("--petal-duration", `${duration}s`);
      petal.style.setProperty("--petal-delay", `${delay}s`);
      petal.style.setProperty("--petal-drift", `${drift}vw`);
      petal.style.setProperty("--petal-turn", `${turn}deg`);
      petal.style.setProperty("--petal-opacity", String(opacity));
      petal.style.setProperty("--petal-color", color);
      field.appendChild(petal);
    }
  };

  const applyProfile = (root) => {
    const focusX = config.focusX ?? profile.focusX;
    const focusY = config.focusY ?? profile.focusY;
    const appearance = config.appearance === "auto" ? detectShellAppearance() : config.appearance;
    const focus = focusX < .4 ? "left" : focusX > .6 ? "right" : "center";
    const safeArea = config.safeArea === "auto" ? (profile.safeArea ||
      (focus === "left" ? "right" : focus === "right" ? "left" : "center")) : config.safeArea;
    const taskMode = config.taskMode === "auto"
      ? profile.aspect >= 2.25 ? "banner" : "ambient"
      : config.taskMode;
    const accent = config.accent || `rgb(${profile.accent.join(" ")})`;
    const accentInk = luminance(...profile.accent) > .42 ? "rgb(26 24 28)" : "rgb(250 248 251)";
    root.classList.toggle("dream-theme-light", appearance === "light");
    root.classList.toggle("dream-theme-dark", appearance === "dark");
    root.classList.toggle("dream-art-wide", profile.aspect >= 1.75);
    root.classList.toggle("dream-art-standard", profile.aspect < 1.75);
    for (const value of ["left", "center", "right"]) {
      root.classList.toggle(`dream-focus-${value}`, focus === value);
    }
    for (const value of ["left", "center", "right", "none"]) {
      root.classList.toggle(`dream-safe-${value}`, safeArea === value);
    }
    for (const value of ["ambient", "banner", "off"]) {
      root.classList.toggle(`dream-task-${value}`, taskMode === value);
    }
    root.style.setProperty("--dream-art", `url("${artUrl}")`);
    root.style.setProperty("--dream-art-position", `${Math.round(focusX * 100)}% ${Math.round(focusY * 100)}%`);
    root.style.setProperty("--dream-focus-x", String(focusX));
    root.style.setProperty("--dream-focus-y", String(focusY));
    root.style.setProperty("--dream-accent", accent);
    root.style.setProperty("--dream-accent-ink", accentInk);
    root.style.setProperty("--dream-image-luma", profile.luma.toFixed(3));
  };

  const ensure = () => {
    if (!artReady) return;
    if (window.__CODEX_DREAM_SKIN_DISABLED__) return;
    const root = document.documentElement;
    if (!root || !document.body) return;

    // Compact auxiliary windows, including the pet avatar overlay, intentionally
    // use a transparent body. They are not Codex content surfaces and must never
    // inherit the themed canvas background.
    const initialRoute = new URL(window.location.href).searchParams.get("initialRoute");
    const isAuxiliaryWindow = root.classList.contains("compact-window") ||
      initialRoute === "/avatar-overlay";
    if (isAuxiliaryWindow) {
      clearSkinDom();
      return;
    }

    // Main Codex shell is the content surface. The left rail is optional: Codex
    // removes or rebuilds aside.app-shell-left-panel while collapsing/expanding
    // it, and clearing the skin there flashes native colors over the active theme.
    // Recent Codex builds can leave a hidden, previous-route <main> in the DOM
    // while mounting the live MainContentSurface beside it. Prefer a rendered
    // surface so theme markers never attach to the discarded route.
    const isRenderedSurface = (node) => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) !== 0 &&
        rect.width > 320 &&
        rect.height > 320;
    };
    const pickRenderedSurface = (selector) =>
      [...document.querySelectorAll(selector)].find(isRenderedSurface) || null;
    const shellMain = pickRenderedSurface("main.main-surface") ||
      pickRenderedSurface('main[class*="MainContentSurface_"]') ||
      pickRenderedSurface("main") ||
      pickRenderedSurface('[role="main"]');
    if (!shellMain) {
      // Route transitions temporarily unmount <main>; keep the last wallpaper.
      return;
    }

    // Remove aliases and route-shell markers from obsolete, hidden surfaces.
    // The active shell below will receive fresh markers for the current route.
    for (const candidate of document.querySelectorAll(`main[${MAIN_SURFACE_ALIAS_ATTRIBUTE}]`)) {
      if (candidate === shellMain) continue;
      candidate.classList.remove("main-surface", "dream-home-shell", "dream-task-shell");
      candidate.removeAttribute(MAIN_SURFACE_ALIAS_ATTRIBUTE);
    }

    // Codex 26.727 replaced the stable `main-surface` class with a CSS-module
    // hash. Restore that semantic hook only for this live renderer so the
    // existing theme rules keep targeting the real content surface.
    if (!shellMain.classList.contains("main-surface")) {
      shellMain.classList.add("main-surface");
      shellMain.setAttribute(MAIN_SURFACE_ALIAS_ATTRIBUTE, "true");
    }

    root.classList.add("codex-dream-skin");
    applyProfile(root);

    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      (document.head || root).appendChild(style);
    }
    if (style.dataset.dreamVersion !== "10") {
      style.textContent = cssText;
      style.dataset.dreamVersion = "10";
    }

    // Treat a surface without rendered conversation content as a home shell.
    // Codex 26.721 changed that page's DOM substantially, so never attach the
    // legacy `dream-home` layout class to live app content.
    const explicitHome = document.querySelector('[role="main"]:has([data-testid="home-icon"])');
    const mainCandidates = [...document.querySelectorAll('[role="main"]')];
    if (!mainCandidates.length) mainCandidates.push(shellMain);
    // Codex retains the outer main shell while changing routes. Clear route
    // classes from every previously marked surface before classifying the
    // newly mounted page, otherwise a stale task pseudo-element can redraw the
    // artwork over the fresh-task canvas.
    for (const candidate of document.querySelectorAll('.dream-home, .dream-task')) {
      candidate.classList.remove("dream-home", "dream-task");
    }
    const hasConversationContent = (candidate) => Boolean(
      candidate.querySelector("article, [data-message-author-role], .thread-scroll-container")
    );
    const home = explicitHome || mainCandidates.find((candidate) => !hasConversationContent(candidate)) || null;
    for (const candidate of mainCandidates) {
      candidate.classList.remove("dream-home");
      candidate.classList.toggle("dream-task", candidate !== home && hasConversationContent(candidate));
    }
    const utilityBars = new Set(home ? home.querySelectorAll('[class*="_homeUtilityBar_"]') : []);
    for (const candidate of document.querySelectorAll(`.${HOME_UTILITY_CLASS}`)) {
      if (!utilityBars.has(candidate)) candidate.classList.remove(HOME_UTILITY_CLASS);
    }
    for (const candidate of utilityBars) candidate.classList.add(HOME_UTILITY_CLASS);
    shellMain.classList.toggle("dream-home-shell", Boolean(home));
    shellMain.classList.toggle("dream-task-shell", !home && mainCandidates.some((candidate) => candidate.classList.contains("dream-task")));

    let chrome = document.getElementById(CHROME_ID);
    if (!chrome || chrome.parentElement !== document.body) {
      chrome?.remove();
      chrome = document.createElement("div");
      chrome.id = CHROME_ID;
      chrome.setAttribute("aria-hidden", "true");
      document.body.appendChild(chrome);
    }
    chrome.classList.toggle("dream-home-shell", Boolean(home));
    ensurePetals();
    // Consume our synchronous class/DOM writes so they cannot schedule another
    // ensure pass indefinitely. Native mutations after this call still notify.
    observer?.takeRecords();
  };

  const cleanup = () => {
    const state = window[STATE_KEY];
    if (state?.installToken !== installToken) return false;
    window.__CODEX_DREAM_SKIN_DISABLED__ = true;
    clearSkinDom();
    state?.observer?.disconnect();
    if (state?.timer) clearInterval(state.timer);
    if (state?.scheduler?.timeout) clearTimeout(state.scheduler.timeout);
    if (state?.artUrl) URL.revokeObjectURL(state.artUrl);
    delete window[STATE_KEY];
    return true;
  };

  const scheduler = { timeout: null };
  const scheduleEnsure = () => {
    if (scheduler.timeout) clearTimeout(scheduler.timeout);
    scheduler.timeout = setTimeout(() => {
      scheduler.timeout = null;
      ensure();
    }, 180);
  };
  observer = new MutationObserver(() => {
    if (samplingNativeShell) return;
    scheduleEnsure();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "data-theme", "data-appearance", "data-color-mode"],
  });
  const timer = setInterval(ensure, 5000);
  window[STATE_KEY] = {
    ensure, cleanup, observer, timer, scheduler, artUrl, profile, config, installToken, version: "1.3.0",
  };
  ensure();
  const prepared = new Image();
  prepared.onload = () => {
    if (window[STATE_KEY]?.installToken !== installToken) { URL.revokeObjectURL(newArtUrl); return; }
    const oldUrl = artUrl;
    artUrl = newArtUrl;
    artReady = true;
    window[STATE_KEY].artUrl = artUrl;
    ensure();
    if (oldUrl !== newArtUrl) URL.revokeObjectURL(oldUrl);
  };
  prepared.onerror = () => { if (newArtUrl !== artUrl) URL.revokeObjectURL(newArtUrl); };
  prepared.src = newArtUrl;
  analyzeArt().then((result) => {
    const state = window[STATE_KEY];
    if (state?.installToken !== installToken || window.__CODEX_DREAM_SKIN_DISABLED__) return;
    profile = result;
    state.profile = result;
    ensure();
  });
  return { installed: true, version: "1.3.0", adaptive: true };
})(__DREAM_CSS_JSON__, __DREAM_ART_JSON__, __DREAM_THEME_JSON__)
;
(async function installWallpaperSettings(config) {
  if(window.top!==window)return;
  if (!document.body) await new Promise(resolve => document.addEventListener('DOMContentLoaded',resolve,{once:true}));
  if (new URL(location.href).searchParams.get("initialRoute") === "/avatar-overlay" ||
      document.documentElement.classList.contains("compact-window")) return;
  const key = "__SAKURA_WALLPAPER_SETTINGS__";
  if (window[key]?.version === 19) { window[key].library = config.wallpaperLibrary || [];window[key].libraryReady=config.wallpaperLibraryReady!==false;window[key].refreshLibrary?.(); return; }
  const priorSettings = window[key];
  priorSettings?.disposeUI?.();
  if(priorSettings)priorSettings.reflow=()=>{};
  document.querySelectorAll("#sakura-wallpaper-settings").forEach(element=>element.remove());
  document.querySelectorAll("#sakura-wallpaper-media").forEach(element=>{if(element!==priorSettings?.media){element.pause?.();element.remove()}});
  const state = window[key] = { version: 19, library: config.wallpaperLibrary || [], libraryReady:config.wallpaperLibraryReady!==false, ready:false, objectUrl: priorSettings?.objectUrl || null,
    media: priorSettings?.media || null, revision: 0, cache: priorSettings?.cache || new Map() };
  state.thumbnailCache=priorSettings?.thumbnailCache||new Map();
  if(priorSettings){priorSettings.media=null;priorSettings.objectUrl=null;priorSettings.cache=new Map();}
  const nativeRequests = new Map();
  window.__sakuraReceiveWallpaper = (id, chunk, mime, error) => {
    const request = nativeRequests.get(id); if (!request) return;
    if (error || chunk === null) {
      clearTimeout(request.timeout); nativeRequests.delete(id);
      if (error) request.reject(new Error(error));
      else { const blob = new Blob(request.chunks, { type: mime }); if (blob.size < 64 * 1024 * 1024) { state.cache.clear(); state.cache.set(request.cacheKey, blob); } request.resolve(blob); }
      return;
    }
    const binary = atob(chunk); const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    request.size += bytes.length;
    if (request.size > 128 * 1024 * 1024) { clearTimeout(request.timeout); nativeRequests.delete(id); request.reject(new Error("文件过大")); return; }
    request.chunks.push(bytes);
  };
  const readNative = (id, kind) => new Promise((resolve, reject) => {
    const cacheKey = id + ":" + kind + ":" + (state.library.find(item => item.id === id)?.fingerprint || "");
    if (state.cache.has(cacheKey)) { resolve(state.cache.get(cacheKey)); return; }
    if (typeof window.__sakuraReadWallpaper !== "function") { reject(new Error("请从落樱快捷方式重新启动，以连接本地壁纸库")); return; }
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    const requestId = [...bytes].map(value => value.toString(16).padStart(2, "0")).join("");
    const timeout = setTimeout(() => { nativeRequests.delete(requestId); reject(new Error("壁纸读取超时，请重试")); }, 60000);
    nativeRequests.set(requestId, { resolve, reject, timeout, chunks: [], size: 0, cacheKey });
    window.__sakuraReadWallpaper(JSON.stringify({ requestId, id, kind }));
  });
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open("sakura-wallpaper-settings", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("preferences");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch(() => null);
  const store = (value, remove = false) => new Promise((resolve, reject) => {
    if (!db) { reject(new Error("本机存储不可用，无法保存壁纸")); return; }
    const transaction = db.transaction("preferences", "readwrite");
    const preferences = transaction.objectStore("preferences");
    remove ? preferences.delete("active") : preferences.put(value, "active");
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error("保存失败"));
  });
  const load = () => new Promise(resolve => {
    if (!db) { resolve(null); return; }
    const request = db.transaction("preferences").objectStore("preferences").get("active");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
  const previousStyle=document.getElementById('sakura-custom-wallpaper-style');
  const customStyle = document.createElement("style");customStyle.textContent=previousStyle?.textContent||'';
  document.querySelectorAll('#sakura-custom-wallpaper-style').forEach(element=>element.remove());
  customStyle.id = "sakura-custom-wallpaper-style";
  document.head.appendChild(customStyle);
  const host = document.createElement("div");
  state.host=host;
  host.id = "sakura-wallpaper-settings";
  const guardParent=parent=>{
    if(!parent||parent.__sakuraAppendGuard)return;
    const nativeAppend=parent.appendChild;
    parent.appendChild=function(child){if(child?.id==='sakura-wallpaper-settings'&&(window[key]?.host!==child||window.__CODEX_DREAM_SKIN_DISABLED__))return child;return nativeAppend.call(this,child)};
    parent.__sakuraAppendGuard=true;
  };
  guardParent(document.body);
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `<style>
    :host{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:36px;height:36px;font:13px system-ui;color:var(--sakura-rail-icon-color,#e8e4da)}
    button,label.pick{border:1px solid #ffffff24;border-radius:10px;background:#252632;color:inherit;padding:10px 14px;cursor:pointer;font:inherit}
    button:hover,label.pick:hover{background:#353747}button:disabled{opacity:.45;cursor:wait}
    .entry{position:relative;display:flex;align-items:center;justify-content:center;width:36px;height:36px;padding:7px;border:0;background:transparent;border-radius:12.5px;box-shadow:none}.entry svg{position:relative;width:22px;height:22px}.entry:hover{background:transparent;box-shadow:none}.entry::before{content:'';position:absolute;inset:0;border-radius:inherit;background:transparent;pointer-events:none}.entry:hover::before{background:rgba(255,255,255,.08)}.entry:focus-visible{outline:2px solid var(--color-ring-primary-ghost,#b89cda);outline-offset:2px}
    .tooltip{display:none;position:fixed;inset:auto;margin:0;z-index:2147483647;background:var(--tooltip-background-color,rgba(54,54,54,.96));color:var(--tooltip-text-color,#f0edf5);border:0;border-radius:var(--tooltip-border-radius,10px);padding:var(--tooltip-padding-sm,8px 12px);box-shadow:var(--tooltip-box-shadow,0 10px 15px -3px #0003);font-size:var(--tooltip-font-size,12px);font-weight:var(--tooltip-font-weight,400);line-height:1.4;white-space:nowrap;pointer-events:none}.tooltip:popover-open{display:block}
    dialog{box-sizing:border-box;width:min(680px,calc(100vw - 48px));height:min(720px,calc(100vh - 64px));overflow:hidden;border:1px solid #ffffff25;border-radius:20px;background:#191a23;color:#eef0f5;padding:0;box-shadow:0 24px 80px #0008;font:13px system-ui}dialog[open]{display:flex;flex-direction:column}header{position:relative;padding:24px 26px 16px;flex-shrink:0;border-bottom:1px solid #ffffff15}.scroll{padding:10px 26px 20px;overflow:auto;min-height:0;flex:1}header .sub{margin:0}select{background:#252632;color:#eef0f5;border:1px solid #ffffff24;border-radius:8px;padding:8px;font:inherit}.dimension{color:#a9a5d8;line-height:1.5}
    dialog::backdrop{background:#0005;backdrop-filter:blur(5px)}h2{font-size:23px;margin:0 0 6px}.sub{color:#a8abbc;margin:0 0 20px}
    .row{display:flex;gap:10px;align-items:center;margin:14px 0;flex-wrap:wrap}.close{position:absolute;top:18px;right:20px;padding:6px 10px}.primary{background:#7665d5!important;border:0!important}
    .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:14px 0}.card{text-align:left;padding:0;overflow:hidden}.card img{width:100%;height:100px;object-fit:cover;display:block;background:#292b36}.card strong,.card small{display:block;padding:7px 10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.card small{padding-top:0;color:#a8abbc}
    input[type=range]{accent-color:#9885f3;flex:1}input[type=file]{display:none}#status{color:#b9bfd0;min-height:36px;line-height:1.6}.note{color:#9298aa;line-height:1.6}#pause{margin-left:auto}
    @media(max-width:550px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    dialog{background:rgba(28,25,40,.91);backdrop-filter:blur(12px) saturate(1.05);border:1px solid rgba(233,224,247,.12);border-radius:16px;font-family:"Segoe UI","Microsoft YaHei UI",system-ui}dialog::backdrop{background:rgba(10,8,18,.35);backdrop-filter:none}h2{font-size:20px;font-weight:600}header{padding:22px 24px 14px}.scroll{padding:16px 24px 22px}button,label.pick,select{background:rgba(255,255,255,.05);border-color:rgba(233,224,247,.12);font-family:inherit}button:hover,label.pick:hover{background:rgba(255,255,255,.078)}.primary{background:rgba(176,143,214,.24)!important;border:1px solid rgba(218,193,243,.14)!important}.card{background:rgba(255,255,255,.035);border-color:rgba(233,224,247,.10);border-radius:12px}.card img{height:116px}.close{width:32px;height:32px;padding:0;border:0;background:transparent;border-radius:10px;top:18px;right:18px}.tabs{display:flex;gap:6px;padding:10px 24px 0;border-bottom:1px solid #ffffff12;flex-shrink:0}.tab{border:0;background:transparent;border-radius:8px 8px 0 0;padding:10px 14px;color:#a9a5b6}.tab[aria-selected=true]{color:#f0edf5;background:rgba(176,143,214,.12);box-shadow:inset 0 -2px #bca2db}.pane[hidden]{display:none!important}.animation-intro{color:#b8b3c4;line-height:1.6;margin:0 0 16px}.row label{cursor:pointer}#animation-host{width:100%}#animation-host iframe{display:block;width:100%;border:0;background:transparent}
    .scrim{position:fixed;inset:0;margin:0;padding:0;border:0;width:100vw;height:100vh;background:rgba(10,8,18,.35)}dialog[popover]{position:fixed;inset:auto;left:50%;top:50%;transform:translate(-50%,-50%);margin:0}dialog[popover]::backdrop{background:transparent;pointer-events:none}
    select[hidden]{display:none!important}.picker{display:inline-flex;align-items:center;justify-content:space-between;gap:12px;min-width:210px;height:38px;padding:0 12px;text-align:left;font-size:13px;white-space:nowrap;box-sizing:border-box}.picker.short{min-width:90px}.picker svg{width:14px;height:14px;flex-shrink:0;color:#b9b3c6}.picker-label{overflow:hidden;text-overflow:ellipsis}.choices{position:fixed;inset:auto;margin:0;padding:5px;min-width:90px;max-width:calc(100vw - 24px);background:#282431;color:#f0edf5;border:1px solid #e9e0f71f;border-radius:10px;box-shadow:0 12px 32px #0006;font:13px "Segoe UI","Microsoft YaHei UI",system-ui;z-index:2147483647}.choices:popover-open{display:block}.choice{display:flex;width:100%;align-items:center;justify-content:space-between;gap:16px;border:0;background:transparent;color:#f0edf5;min-height:36px;border-radius:6px;padding:8px 10px;text-align:left}.choice:hover,.choice:focus-visible{background:#b08fd622;outline:none}.choice[aria-selected=true]{background:#b08fd630}.field-row{display:grid;grid-template-columns:86px minmax(0,1fr);gap:10px;align-items:center;margin:18px 0}.control-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.control-row input[type=range]{min-width:120px}.control-row .percent{min-width:34px;text-align:right;font-variant-numeric:tabular-nums}#status{min-height:24px;overflow-wrap:anywhere;margin:14px 0 18px}.dimension{margin:4px 0 18px;font-size:12px;overflow-wrap:anywhere;line-height:1.5}.note{font-size:12px}.field-row~h3{font-size:14px;font-weight:600}@media(max-width:480px){.field-row{grid-template-columns:1fr;gap:8px}.picker{min-width:0;flex:1}.control-row{gap:8px}}
  </style><button class="entry" aria-label="壁纸"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.5"/><path d="m4 18 5-5 4 3 4-6 4 7"/></svg></button><span class="tooltip" id="wallpaper-tooltip" role="tooltip" popover="manual">壁纸</span><dialog>
    <header><button class="close" aria-label="关闭设置">×</button><h2>外观设置</h2><p class="sub">壁纸和开场动画，统一在这里设置。</p></header>
    <nav class="tabs" role="tablist" aria-label="外观设置分类"><button class="tab" id="wallpaper-tab" role="tab" data-tab="wallpaper" aria-controls="wallpaper-pane" aria-selected="true">壁纸</button><button class="tab" id="animation-tab" role="tab" data-tab="animation" aria-controls="animation-pane" aria-selected="false" tabindex="-1">启动动画</button></nav><section class="scroll"><div class="pane" id="wallpaper-pane" role="tabpanel" aria-labelledby="wallpaper-tab">
    <div class="row"><label class="pick primary">＋ 选择图片或视频<input type="file" accept=".png,.jpg,.jpeg,.webp,.gif,.bmp,.avif,.mp4,.webm"></label><button id="restore">恢复落樱默认</button></div>
    <div id="status" role="status">支持 PNG/JPEG/WebP/GIF/BMP/AVIF、MP4 和 WebM；文件只保存在本机。</div>
    <div class="field-row"><span>背景遮罩</span><div class="control-row"><input id="shade" type="range" min="0" max="70" value="20"><span id="percent" class="percent">20%</span><button id="pause">暂停动画</button></div></div>
    <div class="field-row"><span>画面适配</span><div class="control-row"><select id="fit" hidden><option value="auto">自动铺满 · 保持比例</option><option value="cover">铺满 · 允许裁剪</option><option value="contain">完整显示 · 保持比例</option><option value="original">原始尺寸 · 不放大</option><option value="fill">拉伸填满</option></select><select id="position" hidden><option value="center">居中</option><option value="left">靠左</option><option value="right">靠右</option></select></div></div><div class="dimension" id="dimensions">选择壁纸后显示原始分辨率。</div>
    <div class="row"><button id="boot-preview">预览启动动画</button><button id="boot-settings">设置启动动画</button></div>
    <h3>Wallpaper Engine · 本地已下载</h3><div class="grid"></div>
    <p class="note">只应用原始图片、视频或已提取的高清底图；缩略图仅用于列表。无法完整还原的多层场景、骨骼动画项目不会使用预览图代替。</p>
  </div><div class="pane" id="animation-pane" role="tabpanel" aria-labelledby="animation-tab" hidden><p class="animation-intro">修改头像、背景、标题和字幕。保存后预览；壁纸设置独立保留。</p><div id="animation-host"></div></div></section></dialog>`;
  const dialog = shadow.querySelector("dialog");
  const scrim=document.createElement('div');scrim.className='scrim';scrim.setAttribute('popover','manual');scrim.setAttribute('aria-hidden','true');shadow.appendChild(scrim);
  dialog.setAttribute('popover','manual');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','外观设置');
  const nativeShow=dialog.show.bind(dialog),nativeClose=dialog.close.bind(dialog);
  let focusBeforeSettings=null;
  dialog.showModal=()=>{if(dialog.open)return;focusBeforeSettings=shadow.activeElement||document.activeElement;scrim.showPopover();nativeShow();dialog.showPopover();shadow.querySelector('.close').focus({preventScroll:true});};
  dialog.close=()=>{if(dialog.matches(':popover-open'))dialog.hidePopover();if(scrim.matches(':popover-open'))scrim.hidePopover();nativeClose();if(focusBeforeSettings?.isConnected)focusBeforeSettings.focus();};
  scrim.onclick=()=>dialog.close();
  const message = shadow.querySelector("#status");
  const shade = shadow.querySelector("#shade");
  const fit = shadow.querySelector("#fit");
  const position = shadow.querySelector("#position");
  const pickerControllers=[];
  const closePickers=()=>{for(const controller of pickerControllers)controller.close();};
  for(const select of [fit,position]){
    const trigger=document.createElement('button');trigger.type='button';trigger.className='picker'+(select===position?' short':'');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-label',select===fit?'画面适配':'画面对齐');
    trigger.innerHTML='<span class="picker-label"></span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m4 6 4 4 4-4"/></svg>';
    const menu=document.createElement('div');menu.className='choices';menu.id='choices-'+select.id;menu.setAttribute('popover','manual');menu.setAttribute('role','listbox');menu.setAttribute('aria-label',trigger.getAttribute('aria-label'));trigger.setAttribute('aria-controls',menu.id);dialog.appendChild(menu);select.after(trigger);
    let highlighted=0;
    const options=[...select.options].map((option,index)=>{const button=document.createElement('button');button.type='button';button.className='choice';button.setAttribute('role','option');button.tabIndex=-1;button.dataset.value=option.value;const label=document.createElement('span');label.textContent=option.textContent;const tick=document.createElement('span');tick.className='tick';button.append(label,tick);button.onclick=()=>{select.value=option.value;select.dispatchEvent(new Event('change'));sync();close();trigger.focus();};button.onpointerenter=()=>highlighted=index;menu.appendChild(button);return button;});
    const sync=()=>{trigger.querySelector('.picker-label').textContent=select.selectedOptions[0]?.textContent||'';for(const option of options){const chosen=option.dataset.value===select.value;option.setAttribute('aria-selected',String(chosen));option.querySelector('.tick').textContent=chosen?'✓':'';}};
    const close=()=>{if(menu.matches(':popover-open'))menu.hidePopover();trigger.setAttribute('aria-expanded','false');};
    const open=()=>{closePickers();sync();const rect=trigger.getBoundingClientRect(),width=Math.max(rect.width,select===fit?235:100),height=Math.min(innerHeight-24,options.length*36+12);menu.style.width=width+'px';menu.style.maxHeight=(innerHeight-24)+'px';menu.style.overflowY='auto';menu.style.left=Math.max(12,Math.min(rect.x,innerWidth-width-12))+'px';menu.style.top=Math.max(12,rect.bottom+height+8<innerHeight?rect.bottom+6:rect.top-height-6)+'px';menu.showPopover();trigger.setAttribute('aria-expanded','true');highlighted=Math.max(0,options.findIndex(option=>option.dataset.value===select.value));options[highlighted].focus();};
    trigger.onclick=()=>menu.matches(':popover-open')?close():open();trigger.onkeydown=event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();open();}};
    menu.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();trigger.focus();return;}if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();event.stopPropagation();highlighted=event.key==='Home'?0:event.key==='End'?options.length-1:(highlighted+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;options[highlighted].focus();}};
    pickerControllers.push({trigger,menu,close,sync});sync();
  }
  const outsidePicker=event=>{const path=event.composedPath();for(const controller of pickerControllers)if(!path.includes(controller.menu)&&!path.includes(controller.trigger))controller.close();};
  document.addEventListener('pointerdown',outsidePicker,true);window.addEventListener('resize',closePickers);
  dialog.addEventListener('close',closePickers);
  const mountEntry = () => {
    const rail = [...document.querySelectorAll('[class~="group/nav-list"]')].find(element => { const rect=element.getBoundingClientRect();return rect.x<90&&rect.width<90&&rect.height>150; });
    if(window[key]!==state)return;
    guardParent(rail);
    if (rail && host.parentElement !== rail) rail.appendChild(host);
    const reference=rail?.querySelector('button:not([aria-current="page"]) svg');
    if(reference){const color=getComputedStyle(reference).color;if(host.style.getPropertyValue('--sakura-rail-icon-color')!==color)host.style.setProperty('--sakura-rail-icon-color',color);}
    document.querySelectorAll('#sakura-wallpaper-settings').forEach(element=>{if(element!==host)element.remove()});
    const canvasKey=[0,0,innerWidth,innerHeight].join(':');
    if(state.layoutKey!==canvasKey)state.reflow?.();
  };
  mountEntry();
  let railFrame=0;
  const railObserver = new MutationObserver(()=>{if(!railFrame)railFrame=requestAnimationFrame(()=>{railFrame=0;mountEntry();});});
  railObserver.observe(document.body, { childList:true, subtree:true });
  state.disposeUI=()=>{if(dialog.open)dialog.close();railObserver.disconnect();cancelAnimationFrame(railFrame);document.removeEventListener('pointerdown',outsidePicker,true);document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('resize',closePickers);closePickers();window.removeEventListener('resize',state.reflow);window.removeEventListener('keydown',appearanceShortcut,true);if(window.__SAKURA_APPEARANCE_SETTINGS__?.owner===state)delete window.__SAKURA_APPEARANCE_SETTINGS__;hideTooltip();disposeEditor();host.remove();db?.close();clearTimeout(shadeTimer);};
  const report = text => { message.textContent = text; };
  let active = null;
  let shadeTimer;
  const shadeStyle = () => {
    for(const controller of pickerControllers)controller.sync();
    const value = Number(shade.value) / 100;
    const width=state.media?.naturalWidth || state.media?.videoWidth || 0;
    const height=state.media?.naturalHeight || state.media?.videoHeight || 0;
    const surface=[...document.querySelectorAll('main.main-surface')].find(e=>{const r=e.getBoundingClientRect();return r.width>320&&r.height>320;});
    // Wallpaper belongs to the full application canvas, including the rail,
    // project sidebar and composer footer, rather than only the chat <main>.
    const bounds={x:0,y:0,width:innerWidth,height:innerHeight};
    state.workBounds={x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height};
    state.layoutKey=[bounds.x,bounds.y,bounds.width,bounds.height].join(':');
    let mode=fit.value;
    if(mode==='auto') mode='cover';
    const sizing=mode==='original' ? `left:${bounds.x+bounds.width/2}px;top:${bounds.y+bounds.height/2}px;transform:translate(-50%,-50%);width:${Math.min(bounds.width,width/devicePixelRatio)}px;height:${Math.min(bounds.height,height/devicePixelRatio)}px;object-fit:contain;` : `left:${bounds.x}px;top:${bounds.y}px;width:${bounds.width}px;height:${bounds.height}px;object-fit:${mode};object-position:${position.value};`;
    customStyle.textContent = state.media ? `html.codex-dream-skin{--dream-art:none!important}html.codex-dream-skin body{background-image:none!important}#codex-dream-skin-chrome{background-image:none!important}${state.media.tagName==='VIDEO'?'#codex-dream-skin-petals{display:none!important}':''}#sakura-wallpaper-media{position:fixed;${sizing}z-index:0;pointer-events:none}#root.codex-dream-skin-content-layer{position:relative;z-index:2}body::after{content:'';position:fixed;inset:0;background:rgba(8,10,18,${value});pointer-events:none;z-index:1}` : '';
    if(state.media)customStyle.textContent+=`#root main.main-surface,#root main.main-surface .dream-task,#root main.main-surface .thread-scroll-container{background:transparent!important;box-shadow:none!important;backdrop-filter:none!important}#root main.main-surface::before,#root main.main-surface::after,#root main.main-surface .dream-task::before,#codex-dream-skin-chrome{background:transparent!important;background-image:none!important}#root main.main-surface .thread-scroll-container [class*="bg-gradient-to-"]{background-image:none!important}`;
    shadow.querySelector('#dimensions').textContent=width ? `${width} × ${height} · ${width<innerWidth*devicePixelRatio*.6?'原文件分辨率有限，放大后无法增加细节。':mode==='cover'?'按比例铺满整个应用背景，包含左侧栏和底部；边缘可能裁剪。':'保持原图比例，完整显示。'}` : '选择壁纸后显示原始分辨率。';
    shadow.querySelector("#percent").textContent = `${shade.value}%`;
    shadow.querySelector('#pause').hidden=state.media?.tagName!=='VIDEO';
  };
  state.reflow=shadeStyle;
  const apply = async (record, persist = true) => {
    if(persist){state.userInteracted=true;state.pendingRestore=null;}
    const revision = ++state.revision;
    let url, objectUrl = null;
    const item = record.workshopId ? state.library.find(item => item.id === record.workshopId) : null;
    if (record.workshopId && !item) throw new Error("这张壁纸已不在本地库中，请重新选择");
    if(item && item.mode!=='video' && !item.original)throw new Error('此项目尚未取得原始高清素材，已保留当前壁纸，不会使用缩略图替代。');
    const video = record.blob ? record.blob.type.startsWith("video/") : item.mode === "video";
    if (record.blob) url = objectUrl = URL.createObjectURL(record.blob);
    else {
      const kind=video?'media':'original';
      let blob = null;
      if (db) blob = await new Promise(resolve => { const q=db.transaction('preferences').objectStore('preferences').get('cached-media');q.onsuccess=()=>resolve(q.result?.id===item.id&&q.result?.fingerprint===item.fingerprint&&(q.result.kind||'media')===kind?q.result.blob:null);q.onerror=()=>resolve(null); });
      if (!blob) { blob=await readNative(item.id,kind);if(db&&blob.size<64*1024*1024){const t=db.transaction('preferences','readwrite');t.objectStore('preferences').put({id:item.id,kind,fingerprint:item.fingerprint,blob},'cached-media');} }
      url = objectUrl = URL.createObjectURL(blob);
    }
    const candidate = document.createElement(video ? "video" : "img");
    if(!video)candidate.decoding='async';
    if (video) { candidate.muted = true; candidate.loop = true; candidate.playsInline = true; candidate.preload = "auto"; }
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => { candidate.removeAttribute("src"); reject(new Error("加载超时，已保留原壁纸")); }, 15000);
        const complete = result => { clearTimeout(timeout); candidate.onload = candidate.onloadeddata = candidate.onerror = null; result(); };
        candidate.onload = candidate.onloadeddata = () => complete(resolve);
        candidate.onerror = () => complete(() => reject(new Error(video?"视频编码不受当前 Codex 支持，请使用 H.264 MP4 或 WebM；原壁纸保持不变":"图片无法解码，请使用有效的常见图片；原壁纸保持不变")));
        candidate.src = url;
      });
      if (revision !== state.revision || window[key]!==state) { if (objectUrl) URL.revokeObjectURL(objectUrl); return; }
      if (persist) await store(record);
      candidate.id = "sakura-wallpaper-media";
      candidate.setAttribute("aria-hidden", "true");
      const previous = state.media;
      const previousUrl = state.objectUrl;
      document.body.prepend(candidate);
      state.media = candidate; state.objectUrl = objectUrl; active = record;
      state.active = record;
      state.ready=true;state.restorationError=null;
      shade.value = String(record.shade ?? 20);
      fit.value = ['auto','cover','contain','original','fill'].includes(record.fit)?record.fit:'auto';
      position.value = ['center','left','right'].includes(record.position)?record.position:'center';
      shadeStyle();
      if (video) await candidate.play().catch(() => report("壁纸已保存，视频播放受限，可点击恢复动画"));
      previous?.remove(); if (previousUrl) URL.revokeObjectURL(previousUrl);
      report(`${record.name || item?.title || "自定义壁纸"} · ${video ? "动态视频" : item?.original ? "原始高清底图（静态）" : item ? "项目预览图" : "图片"} · 已保存${video && candidate.paused ? "，点击恢复动画开始播放" : ""}`);
    } catch (error) { candidate.pause?.(); candidate.remove(); if (objectUrl) URL.revokeObjectURL(objectUrl); throw error; }
  };
  const renderLibrary = () => {
    const grid = shadow.querySelector(".grid");
    const available=state.library.filter(item=>item.mode==='video'||item.original);
    const signature=available.map(item=>item.id+':'+item.fingerprint+':'+item.title+':'+item.original).join('|');
    if(state.gridSignature===signature&&grid.childElementCount===available.length)return;
    state.gridSignature=signature;grid.replaceChildren();
    if (!available.length) { grid.textContent = "暂无可直接使用的原始壁纸，可以选择本地文件。"; return; }
    for (const item of available) {
      const card = document.createElement("button"); card.className = "card";
      const image = document.createElement("img"); image.loading = grid.childElementCount<6 ? "eager" : "lazy";image.decoding='async';image.alt = "";
      state.thumbnailCache ||= new Map();
      const thumbnailKey=item.id+':'+item.fingerprint;
      if(state.thumbnailCache.has(thumbnailKey))image.src=state.thumbnailCache.get(thumbnailKey);
      else if(item.preview){image.onload=()=>{image.onload=null;try{const canvas=document.createElement('canvas');canvas.width=Math.min(420,image.naturalWidth);canvas.height=Math.max(1,Math.round(canvas.width*image.naturalHeight/image.naturalWidth));const context=canvas.getContext('2d');context.drawImage(image,0,0,canvas.width,canvas.height);const frozen=canvas.toDataURL('image/webp',.82);state.thumbnailCache.set(thumbnailKey,frozen);image.src=frozen;}catch{}};image.src=item.preview;}
      const title = document.createElement("strong"); title.textContent = item.title;
      const caption = document.createElement("small"); caption.textContent = item.mode === "video" ? "视频 · 动态播放" : item.original ? "场景 · 高清原始底图" : "场景 / 网页 · 预览图";
      card.append(image, title, caption);
      if(item.mode!=='video'&&!item.original){card.disabled=true;caption.textContent='未取得原始素材 · 不可应用';}
      card.onclick = async () => {
        if (state.loading) { report("上一张壁纸正在加载，请稍候…"); return; }
        state.loading = true;
        report("正在加载，原壁纸保持显示…");
        try { await apply({ workshopId: item.id, name: item.title, shade: Number(shade.value), fit:fit.value, position:position.value }); }
        catch (error) { report(error.message); }
        finally { state.loading = false; }
      };
      grid.appendChild(card);
    }
  };
  state.refreshLibrary=()=>{if(dialog.open)renderLibrary();state.restoreSaved?.();};
  const entry=shadow.querySelector('.entry'),tooltip=shadow.querySelector('.tooltip');
  let tooltipTimer=0;
  const hideTooltip=()=>{clearTimeout(tooltipTimer);if(tooltip.matches(':popover-open'))tooltip.hidePopover();entry.removeAttribute('aria-describedby');};
  const showTooltip=()=>{if(dialog.open||!host.isConnected)return;const r=entry.getBoundingClientRect();tooltip.style.left=(r.right+10)+'px';tooltip.style.top=(r.y+r.height/2)+'px';tooltip.style.transform='translateY(-50%)';tooltip.showPopover();entry.setAttribute('aria-describedby','wallpaper-tooltip');};
  entry.addEventListener('pointerenter',()=>{clearTimeout(tooltipTimer);tooltipTimer=setTimeout(showTooltip,450)});
  entry.addEventListener('pointerleave',hideTooltip);
  entry.addEventListener('focus',()=>{if(entry.matches(':focus-visible'))showTooltip()});
  entry.addEventListener('blur',hideTooltip);
  state.activeTab='wallpaper';
  const tabScroll={wallpaper:0,animation:0};
  const disposeEditor=()=>{if(window.__SAKURA_STARTUP_EDITOR_HOST__===shadow.querySelector('#animation-host')){window.__aemeathExtension?.dispose();window.__SAKURA_STARTUP_EDITOR_HOST__=null;}shadow.querySelector('#animation-host').replaceChildren();};
  const selectTab=tab=>{
    tabScroll[state.activeTab]=shadow.querySelector('.scroll').scrollTop;state.activeTab=tab;
    shadow.querySelector('#wallpaper-pane').hidden=tab!=='wallpaper';shadow.querySelector('#animation-pane').hidden=tab!=='animation';
    for(const button of shadow.querySelectorAll('.tab')){button.setAttribute('aria-selected',String(button.dataset.tab===tab));button.tabIndex=button.dataset.tab===tab?0:-1;}
    shadow.querySelector('.scroll').scrollTop=tabScroll[tab]||0;
    const restoreScroll=()=>{if(window[key]===state&&state.activeTab===tab)shadow.querySelector('.scroll').scrollTop=tabScroll[tab]||0;};
    requestAnimationFrame(()=>{restoreScroll();requestAnimationFrame(restoreScroll)});
    if(tab==='animation'&&!shadow.querySelector('#animation-host iframe')){
      window.__SAKURA_STARTUP_EDITOR_SAVED__=()=>{if(window[key]!==state)return;dialog.close();window.__SAKURA_STARTUP__?.play(false)};
      window.__SAKURA_STARTUP_EDITOR_CANCELLED__=()=>{if(window[key]===state)dialog.close()};
      window.__SAKURA_STARTUP__?.play(true,shadow.querySelector('#animation-host'));
    }
  };
  for(const tab of shadow.querySelectorAll('.tab'))tab.onclick=()=>selectTab(tab.dataset.tab);
  shadow.querySelector('.tabs').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tab=event.key==='Home'?'wallpaper':event.key==='End'?'animation':state.activeTab==='wallpaper'?'animation':'wallpaper';selectTab(tab);shadow.querySelector('[data-tab='+tab+']').focus();});
  const openAppearance=tab=>{hideTooltip();renderLibrary();window.__sakuraPrepareWallpapers?.('prepare');if(!dialog.open)dialog.showModal();selectTab(tab==='animation'?'animation':'wallpaper');};
  window.__SAKURA_APPEARANCE_SETTINGS__={owner:state,open:openAppearance};
  const appearanceShortcut=event=>{if((event.ctrlKey||event.metaKey)&&event.altKey&&event.code==='KeyB'){event.preventDefault();event.stopImmediatePropagation();openAppearance('animation');return;}if(!dialog.open)return;if(event.key==='Escape'&&!pickerControllers.some(c=>c.menu.matches(':popover-open'))){event.preventDefault();event.stopImmediatePropagation();dialog.close();return;}if(event.key==='Tab'){const items=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),iframe,[tabindex="0"]')].filter(e=>e.getClientRects().length>0),index=items.indexOf(shadow.activeElement);if(items.length&&(index<0||event.shiftKey&&index===0||!event.shiftKey&&index===items.length-1)){event.preventDefault();items[event.shiftKey?items.length-1:0].focus();}}};
  window.addEventListener('keydown',appearanceShortcut,true);
  dialog.addEventListener('close',disposeEditor);
  shadow.querySelector(".entry").onclick = event => { event.preventDefault();event.stopPropagation();openAppearance('wallpaper'); };
  host.addEventListener('pointerdown',event=>event.stopPropagation());
  shadow.querySelector(".close").onclick = () => {dialog.close();disposeEditor();};
  dialog.addEventListener("keydown", event => event.stopPropagation());
  dialog.addEventListener("click", event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
  shadow.querySelector("input[type=file]").onchange = async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const extension=file.name.toLowerCase().split('.').pop();
      const known={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',bmp:'image/bmp',avif:'image/avif',mp4:'video/mp4',webm:'video/webm'};
      if(!known[extension])throw new Error('请选择支持的图片或 MP4/WebM 视频');
      const normalized=file.type===known[extension]?file:new File([file],file.name,{type:known[extension]});
      if (file.size > 128 * 1024 * 1024) throw new Error("文件超过 128 MB，请选择较小文件或使用 Wallpaper Engine 库中的视频");
      report("正在加载，原壁纸保持显示…");
      await apply({ blob: normalized, name: file.name, shade: Number(shade.value), fit:fit.value, position:position.value });
    } catch (error) { report(error.message); }
    event.target.value = "";
  };
  shade.oninput = () => { shadeStyle(); clearTimeout(shadeTimer); shadeTimer = setTimeout(async () => { if (active) { active.shade = Number(shade.value); try { await store(active); } catch (error) { report(error.message); } } }, 300); };
  for(const control of [fit,position]) control.onchange=async()=>{shadeStyle();if(active){active.fit=fit.value;active.position=position.value;try{await store(active);}catch(error){report(error.message)}}};
  window.addEventListener('resize',shadeStyle);
  shadow.querySelector('#boot-preview').onclick=()=>{dialog.close();window.__SAKURA_STARTUP__?.play(false)};
  shadow.querySelector('#boot-settings').onclick=()=>selectTab('animation');
  shadow.querySelector("#pause").onclick = () => { const video = state.media; if (video?.tagName !== "VIDEO") { report("当前壁纸没有视频动画"); return; } if (video.paused) video.play().catch(error => report(error.message)); else video.pause(); shadow.querySelector("#pause").textContent = video.paused ? "恢复动画" : "暂停动画"; };
  const onVisibility=()=>{if(state.media?.tagName!=='VIDEO')return;if(document.hidden){state.resume=!state.media.paused;state.media.pause();}else if(state.resume)state.media.play().catch(()=>{});};
  document.addEventListener('visibilitychange',onVisibility);
  shadow.querySelector("#restore").onclick = async () => {
    state.userInteracted=true;state.pendingRestore=null;state.restorationError=null;state.ready=true;
    try { await store(null, true); ++state.revision; state.media?.pause?.(); state.media?.remove(); state.media = null; if (state.objectUrl) URL.revokeObjectURL(state.objectUrl); state.objectUrl = null; active = null; state.active=null;customStyle.textContent = "";shadow.querySelector('#pause').hidden=true;report("已恢复默认壁纸"); } catch (error) { report(error.message); }
  };
  const previousCleanup = window.__CODEX_DREAM_SKIN_STATE__?.cleanup;
  if (previousCleanup) window.__CODEX_DREAM_SKIN_STATE__.cleanup = () => {
    ++state.revision;state.disposeUI();state.media?.pause?.();state.media?.remove();customStyle.remove();if(state.objectUrl)URL.revokeObjectURL(state.objectUrl);state.cache.clear();state.thumbnailCache.clear();delete window[key];return previousCleanup();
  };
  state.restoreSaved=async()=>{
    if(!state.pendingRestore||state.restoring||state.userInteracted)return;
    if(state.pendingRestore.workshopId&&!state.libraryReady)return;
    state.restoring=true;
    try{await apply(state.pendingRestore,false);state.ready=true;state.restorationError=null;}
    catch(error){state.restorationError=error.message;report(error.message);}
    finally{state.pendingRestore=null;state.restoring=false;}
  };
  const saved = await load();
  if(window[key]!==state)return;
  if(saved&&!state.userInteracted){state.pendingRestore=saved;await state.restoreSaved();}
  else state.ready=true;
})(__DREAM_THEME_JSON__).catch(error => console.warn("壁纸设置加载失败", error.message));
