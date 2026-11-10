
(() => {
    "use strict";

    // Avoid duplicate initialization.
    if (window.__emeraldSpotlightInitialized) return;
    window.__emeraldSpotlightInitialized = true;

    // Spotlight is intended for mouse / trackpad devices.
    if (
        !window.matchMedia("(hover: hover) and (pointer: fine)").matches ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
        return;
    }

    const RADIUS = 95;
    let layer;
    let ring;
    let content;
    let frame = 0;
    let pointerX = -500;
    let pointerY = -500;

    function createSpotlight() {
        if (layer) return;

        layer = document.createElement("div");
        layer.id = "emerald-spotlight-layer";
        layer.setAttribute("aria-hidden", "true");

        content = document.createElement("div");
        content.className = "emerald-spotlight-content";

        // Clone the page content for the visual-only alternate theme.
        const clone = document.body.cloneNode(true);

        clone.querySelectorAll(
            "#emerald-spotlight-layer, #emerald-spotlight-ring"
        ).forEach((node) => node.remove());

        // Never execute copied scripts or duplicate embedded documents.
        clone.querySelectorAll(
            "script, iframe, object, embed"
        ).forEach((node) => node.remove());

        // Prevent duplicate IDs from affecting original page interactions.
        clone.querySelectorAll("[id]").forEach((node) => {
            node.removeAttribute("id");
        });

        clone.removeAttribute("id");
        clone.querySelectorAll("[autofocus]").forEach((node) => {
            node.removeAttribute("autofocus");
        });

        // Forms and controls in the duplicate are visual only.
        clone.querySelectorAll(
            "input, textarea, select, button, a"
        ).forEach((node) => {
            node.setAttribute("tabindex", "-1");
            node.setAttribute("aria-hidden", "true");
        });

        // Use the clone's children so the original body's own styling
        // does not become a second body element inside the overlay.
        while (clone.firstChild) {
            content.appendChild(clone.firstChild);
        }

        layer.appendChild(content);

        ring = document.createElement("div");
        ring.id = "emerald-spotlight-ring";
        ring.setAttribute("aria-hidden", "true");

        document.body.append(layer, ring);

        syncScroll();
        syncSize();

        document.body.classList.add("spotlight-ready");
    }

    function syncScroll() {
        if (!content) return;

        content.style.transform =
            `translate3d(0, ${-window.scrollY}px, 0)`;
    }

    function syncSize() {
        if (!content) return;

        content.style.width = `${document.documentElement.clientWidth}px`;
        content.style.minHeight =
            `${Math.max(document.documentElement.scrollHeight, window.innerHeight)}px`;
    }

    function render() {
        frame = 0;
        if (!layer || !ring) return;

        layer.style.setProperty("--spotlight-x", `${pointerX}px`);
        layer.style.setProperty("--spotlight-y", `${pointerY}px`);
        layer.style.setProperty("--spotlight-radius", `${RADIUS}px`);

        ring.style.left = `${pointerX}px`;
        ring.style.top = `${pointerY}px`;
    }

    function onPointerMove(event) {
        pointerX = event.clientX;
        pointerY = event.clientY;

        if (!frame) {
            frame = window.requestAnimationFrame(render);
        }
    }

    function onScroll() {
        syncScroll();
        syncSize();
    }

    function init() {
        createSpotlight();

        window.addEventListener("pointermove", onPointerMove, {
            passive: true
        });
        window.addEventListener("scroll", onScroll, {
            passive: true
        });
        window.addEventListener("resize", syncSize, {
            passive: true
        });

        // Keep the visual clone reasonably current if page content changes.
        const observer = new MutationObserver(() => {
            if (layer && layer.isConnected) {
                syncSize();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
