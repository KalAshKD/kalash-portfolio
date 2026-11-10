
(() => {
    const main = document.querySelector("main");
    if (!main || document.documentElement.dataset.stackReady === "true") return;

    document.documentElement.dataset.stackReady = "true";

    const sections = [...main.querySelectorAll(":scope > section")];
    if (sections.length < 2) return;

    let current = 0;
    let locked = false;
    let wheelSum = 0;
    let wheelReset;

    sections.forEach((section, index) => {
        section.classList.add("stack-slide");
        section.classList.remove(
            "stack-current",
            "stack-above",
            "stack-below"
        );

        section.style.zIndex = String(index + 1);
    });

    function updatePositions() {
        sections.forEach((section, index) => {
            section.classList.toggle("stack-current", index === current);
            section.classList.toggle("stack-above", index < current);
            section.classList.toggle("stack-below", index > current);
            section.setAttribute(
                "aria-hidden",
                String(index !== current)
            );
        });
    }

    function goTo(index) {
        if (locked || index < 0 || index >= sections.length || index === current) {
            return;
        }

        locked = true;
        current = index;
        updatePositions();

        window.setTimeout(() => {
            locked = false;
        }, 780);
    }

    function move(direction) {
        const section = sections[current];

        /* Let tall sections scroll internally before changing slides */
        const canScrollDown =
            section.scrollTop + section.clientHeight < section.scrollHeight - 3;

        const canScrollUp = section.scrollTop > 3;

        if (direction > 0 && canScrollDown) {
            section.scrollBy({ top: Math.min(240, section.clientHeight * 0.35), behavior: "smooth" });
            return;
        }

        if (direction < 0 && canScrollUp) {
            section.scrollBy({ top: -Math.min(240, section.clientHeight * 0.35), behavior: "smooth" });
            return;
        }

        goTo(current + direction);
    }

    function activate() {
        if (window.innerWidth < 768) return;
        document.body.classList.add("section-stack-active");
        updatePositions();
    }

    function deactivate() {
        document.body.classList.remove("section-stack-active");
        sections.forEach(section => {
            section.classList.remove(
                "stack-slide",
                "stack-current",
                "stack-above",
                "stack-below"
            );
            section.removeAttribute("aria-hidden");
            section.style.removeProperty("z-index");
            section.style.removeProperty("transform");
        });
    }

    activate();

    window.addEventListener("resize", () => {
        if (window.innerWidth < 768) {
            deactivate();
        } else {
            sections.forEach(section => section.classList.add("stack-slide"));
            document.body.classList.add("section-stack-active");
            updatePositions();
        }
    });

    window.addEventListener("wheel", event => {
        if (!document.body.classList.contains("section-stack-active")) return;

        event.preventDefault();
        if (locked || Math.abs(event.deltaY) < 2) return;

        wheelSum += event.deltaY;
        window.clearTimeout(wheelReset);

        wheelReset = window.setTimeout(() => {
            wheelSum = 0;
        }, 120);

        if (Math.abs(wheelSum) >= 45) {
            const direction = wheelSum > 0 ? 1 : -1;
            wheelSum = 0;
            move(direction);
        }
    }, { passive: false });

    window.addEventListener("keydown", event => {
        if (!document.body.classList.contains("section-stack-active")) return;

        const target = event.target;
        const typing = target.matches(
            "input, textarea, select, button, [contenteditable='true']"
        );

        if (typing) return;

        if (["ArrowDown", "PageDown"].includes(event.key)) {
            event.preventDefault();
            move(1);
        } else if (["ArrowUp", "PageUp"].includes(event.key)) {
            event.preventDefault();
            move(-1);
        } else if (event.key === "Home") {
            event.preventDefault();
            goTo(0);
        } else if (event.key === "End") {
            event.preventDefault();
            goTo(sections.length - 1);
        }
    });

    /* Make navigation links use the same transitions */
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener("click", event => {
            if (!document.body.classList.contains("section-stack-active")) return;

            const targetId = link.getAttribute("href").slice(1);
            const target = document.getElementById(targetId);
            const index = sections.indexOf(target);

            if (index === -1) return;

            event.preventDefault();
            goTo(index);
            history.replaceState(null, "", `#${targetId}`);
        });
    });

    /* Start at the section specified in the URL, if present */
    const initialTarget = sections.findIndex(
        section => `#${section.id}` === window.location.hash
    );

    if (initialTarget >= 0) {
        current = initialTarget;
        updatePositions();
    }
})();


