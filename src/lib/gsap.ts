import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register eagerly at module level — this file is only imported by components
// that use GSAP (all behind dynamic imports or "use client"), so it stays off
// the critical rendering path naturally.
gsap.registerPlugin(ScrollTrigger);

gsap.defaults({
  ease: "power4.out",
  duration: 1,
});

export { gsap, ScrollTrigger };
