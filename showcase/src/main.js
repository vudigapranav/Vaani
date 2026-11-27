import "./styles.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { voiceDemoUrl } from "./voice-demo.js";

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const isReduced = reducedMotion.matches;

document.documentElement.classList.add("js");

const voiceUrl = voiceDemoUrl(import.meta.env.VITE_VAANI_VOICE_URL, window.location.hostname);
document.querySelectorAll("[data-voice-link]").forEach((link) => {
  link.setAttribute("href", voiceUrl);
});

/* Header and mobile navigation */
const header = document.querySelector("[data-header]");
const menuButton = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector("[data-mobile-nav]");

const updateHeader = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 32);
};

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const closeMenu = () => {
  if (!menuButton || !mobileNav) return;
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open navigation");
  mobileNav.hidden = true;
  header?.classList.remove("menu-is-open");
  document.body.classList.remove("menu-open");
};

menuButton?.addEventListener("click", () => {
  const shouldOpen = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(shouldOpen));
  menuButton.setAttribute("aria-label", shouldOpen ? "Close navigation" : "Open navigation");
  mobileNav.hidden = !shouldOpen;
  header?.classList.toggle("menu-is-open", shouldOpen);
  document.body.classList.toggle("menu-open", shouldOpen);
});

mobileNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

/* Hero entrance and pointer response */
const revealTargets = [];
let heroTimeline = null;

if (!isReduced) {
  heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });
  heroTimeline
    .from(".hero-eyebrow", { y: 18, duration: 0.65 })
    .from(
      ".hero-line > span",
      { yPercent: 8, duration: 1.05, stagger: 0.1 },
      "-=0.35",
    )
    .from(".hero-intro", { y: 22, duration: 0.75 }, "-=0.65")
    .from(".hero-actions", { y: 18, duration: 0.65 }, "-=0.5")
    .from(".hero-languages", { y: 12, duration: 0.65 }, "-=0.35")
    .from(
      ".hero-orbit",
      { scale: 0.9, rotate: -4, duration: 1.25 },
      "-=1.1",
    )
    .from(
      ".orbit-chip",
      { scale: 0.94, duration: 0.65, stagger: 0.09 },
      "-=0.8",
    );

  const orbit = document.querySelector("[data-orbit]");
  const visual = document.querySelector(".hero-visual");

  if (orbit && visual && window.matchMedia("(pointer: fine)").matches) {
    const moveX = gsap.quickTo(orbit, "x", { duration: 0.8, ease: "power3.out" });
    const moveY = gsap.quickTo(orbit, "y", { duration: 0.8, ease: "power3.out" });

    visual.addEventListener("pointermove", (event) => {
      const bounds = visual.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      moveX(x * 16);
      moveY(y * 16);
    });

    visual.addEventListener("pointerleave", () => {
      moveX(0);
      moveY(0);
    });
  }
}

/* Editorial reveals */
if (!isReduced) {
  const revealGroups = [
    [".manifesto-grid", ".manifesto-grid > *"],
    [".principle-row", ".principle-row article"],
    [".services-heading", ".services-heading > *"],
    [".service-grid", ".service-card"],
    [".example-heading", ".example-heading > *"],
    [".demo-shell", ".demo-shell"],
    [".languages-heading", ".languages-heading > *"],
    [".language-examples", ".language-card"],
    [".closing h2", ".closing h2"],
    [".closing-bottom", ".closing-bottom > *"],
  ];

  revealGroups.forEach(([trigger, target]) => {
    const triggerElement = document.querySelector(trigger);
    const targetElements = document.querySelectorAll(target);
    if (!triggerElement || !targetElements.length) return;

    revealTargets.push(...targetElements);

    gsap.from(targetElements, {
      y: 42,
      duration: 0.9,
      stagger: 0.1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: triggerElement,
        start: "top 84%",
        once: true,
      },
    });
  });
}

/* Never leave essential copy hidden if an embedded/background browser pauses rAF. */
if (!isReduced && heroTimeline) {
  let tickerAdvanced = false;
  heroTimeline.eventCallback("onUpdate", () => {
    tickerAdvanced = true;
  });

  window.setTimeout(() => {
    if (tickerAdvanced) return;
    heroTimeline.progress(1);
    gsap.set(revealTargets, { clearProps: "opacity,transform" });
  }, 1600);
}

/* Scroll-driven journey */
const journeySteps = [...document.querySelectorAll("[data-journey-step]")];
const journeyLabel = document.querySelector("[data-journey-label]");
const journeyTranscript = document.querySelector("[data-journey-transcript]");
const journeyOptions = document.querySelector("[data-journey-options]");
const journeyConfirm = document.querySelector("[data-journey-confirm]");
const journeyProgress = document.querySelector("[data-journey-progress]");

const journeyStages = [
  {
    label: "STEP 01 · YOUR REQUEST",
    transcript: "“Hi, I’d like a table for two tonight.”",
    options: ["Saturday", "2 people", "7:30 PM"],
    selection: "Your request",
    action: "UNDERSTOOD",
  },
  {
    label: "STEP 02 · THE CONTEXT",
    transcript: "“A table for two, Saturday, around 7:30.”",
    options: ["Restaurant", "Saturday", "2 people"],
    selection: "Context captured",
    action: "READY",
  },
  {
    label: "STEP 03 · THE OPTIONS",
    transcript: "“I have 6:30, 7:30, or 8:00 PM. Which works for you?”",
    options: ["6:30 PM", "7:30 PM", "8:00 PM"],
    selection: "Choose a time",
    action: "SELECT",
  },
  {
    label: "STEP 04 · CONFIRMED",
    transcript: "“Your table for two is confirmed for 7:30 PM.”",
    options: ["Saturday", "2 people", "7:30 PM"],
    selection: "7:30 PM confirmed",
    action: "EXAMPLE ONLY",
  },
];

let activeJourneyStage = 0;

const paintJourneyStage = (index) => {
  if (index === activeJourneyStage && journeyTranscript?.textContent) return;
  activeJourneyStage = index;
  const stage = journeyStages[index];

  journeySteps.forEach((step, stepIndex) => {
    step.classList.toggle("is-active", stepIndex === index);
  });

  if (journeyLabel) journeyLabel.textContent = stage.label;
  if (journeyTranscript) journeyTranscript.textContent = stage.transcript;
  if (journeyOptions) {
    journeyOptions.replaceChildren(
      ...stage.options.map((option) => {
        const item = document.createElement("span");
        item.textContent = option;
        return item;
      }),
    );
  }
  if (journeyConfirm) {
    const label = journeyConfirm.querySelector("span");
    const action = journeyConfirm.querySelector("strong");
    if (label) label.textContent = stage.selection;
    if (action) action.textContent = stage.action;
  }
  if (journeyProgress) journeyProgress.style.height = `${(index + 1) * 25}%`;

  if (!isReduced) {
    gsap.fromTo(
      [journeyTranscript, journeyOptions, journeyConfirm],
      { y: 12 },
      { y: 0, duration: 0.45, stagger: 0.06, ease: "power2.out" },
    );
  }
};

journeySteps.forEach((step, index) => {
  ScrollTrigger.create({
    trigger: step,
    start: "top 62%",
    end: "bottom 38%",
    onEnter: () => paintJourneyStage(index),
    onEnterBack: () => paintJourneyStage(index),
  });
});

paintJourneyStage(0);

/* Scroll-driven horizontal reasons */
const phoneFirst = document.querySelector(".phone-first");
const phoneRail = document.querySelector("[data-phone-rail]");
const railProgress = document.querySelector("[data-rail-progress]");

const motionMedia = gsap.matchMedia();
motionMedia.add("(min-width: 801px) and (prefers-reduced-motion: no-preference)", () => {
  if (!phoneFirst || !phoneRail) return;

  const getDistance = () => {
    const railWidth = phoneRail.scrollWidth;
    const viewportWidth = window.innerWidth;
    return Math.max(0, railWidth - viewportWidth);
  };

  const distance = getDistance();

  if (distance < 1) return;

  gsap.to(phoneRail, {
    x: () => -getDistance(),
    ease: "none",
    scrollTrigger: {
      trigger: phoneFirst,
      start: "top top",
      end: () => `+=${getDistance()}`,
      scrub: 0.8,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        if (railProgress) railProgress.style.transform = `scaleX(${self.progress})`;
      },
    },
  });
});

/* Interactive example */
const demo = document.querySelector("[data-demo]");
const serviceButtons = [...document.querySelectorAll("[data-service]")];
const languageButtons = [...document.querySelectorAll("[data-language]")];
const demoBusiness = document.querySelector("[data-demo-business]");
const demoNumber = document.querySelector("[data-demo-number]");
const demoSpeaker = document.querySelector("[data-demo-speaker]");
const demoText = document.querySelector("[data-demo-text]");
const demoSlots = document.querySelector("[data-demo-slots]");
const demoSelection = document.querySelector("[data-demo-selection]");
const demoConfirm = document.querySelector("[data-demo-confirm]");
const demoExplanation = document.querySelector("[data-demo-explanation]");
const playButton = document.querySelector("[data-demo-play]");
const playLabel = document.querySelector("[data-play-label]");
const nextButton = document.querySelector("[data-demo-next]");
const languageCards = [...document.querySelectorAll("[data-language-card]")];

const demoData = {
  restaurant: {
    en: {
      business: "THE INDIAN TABLE",
      number: "+91 98765 43210",
      intent: "“Table for two, this evening.”",
      detail: "Intent, party size, and timing",
      selectTime: "Select a time",
      confirm: (time) => `Confirm ${time}`,
      confirmed: "Example confirmed — no real booking",
      steps: [
        {
          speaker: "CALLER",
          text: "Hi, I’d like a table for two tonight.",
        },
        {
          speaker: "VAANI",
          text: "For two tonight, I have 6:30 PM, 7:30 PM, or 8:00 PM. Which time would you prefer?",
        },
        {
          speaker: "VAANI",
          text: "7:30 PM is selected. Shall I confirm a table for two?",
        },
        {
          speaker: "VAANI",
          text: "Your table for two is confirmed for 7:30 PM today. This is an example confirmation.",
        },
      ],
      slots: ["6:30 PM", "7:30 PM", "8:00 PM"],
    },
    hi: {
      business: "देसी रेस्टोरेंट",
      number: "+91 98765 43210",
      intent: "“आज रात दो लोगों के लिए टेबल।”",
      detail: "मंज़बूरी, पार्टी साइज़ और समय",
      selectTime: "समय चुनें",
      confirm: (time) => `${time} की पुष्टि करें`,
      confirmed: "उदाहरण की पुष्टि — असली बुकिंग नहीं",
      steps: [
        {
          speaker: "कॉलर",
          text: "नमस्ते, आज रात को दो लोगों के लिए टेबल चाहिए।",
        },
        {
          speaker: "वाणी",
          text: "आज रात दो लोगों के लिए 6:30, 7:30 या 8:00 बजे टेबल उपलब्ध हैं। आपको कौन-सा समय सही लगता है?",
        },
        {
          speaker: "वाणी",
          text: "7:30 बजे चुना गया है। क्या मैं दो लोगों की टेबल की पुष्टि कर दूँ?",
        },
        {
          speaker: "वाणी",
          text: "आज 7:30 बजे दो लोगों की टेबल की पुष्टि हो गई है। यह एक उदाहरण है।",
        },
      ],
      slots: ["शाम 6:30", "शाम 7:30", "रात 8:00"],
    },
    te: {
      business: "ఇండియన్ టేబుల్",
      number: "+91 98765 43210",
      intent: "“ఈరావు ఇద్దరికి టేబుల్ కావాలి.”",
      detail: "అవసరం, వ్యక్తుల సంఖ్య, సమయం",
      selectTime: "సమయం ఎంచుకోండి",
      confirm: (time) => `${time} నిధి చేయండి`,
      confirmed: "ఉదాహరణ నిధీకరణ — నిజమైన బుకింగ్ కాదు",
      steps: [
        {
          speaker: "కాలర్",
          text: "ఈరావు ఇద్దరికి టేబుల్ కావాలి.",
        },
        {
          speaker: "వాణీ",
          text: "ఈరావు ఇద్దరికి 6:30, 7:30 లేదా 8:00 సమయాల్లో టేబుల్లు ఉన్నాయి. ఏ సమయం మీకు సరిపోతుంది?",
        },
        {
          speaker: "వాణీ",
          text: "7:30 సమయం ఎంచుకోబడింది. ఇద్దరికి టేబుల్ నిధి చేయాలా?",
        },
        {
          speaker: "వాణీ",
          text: "ఈరావు 7:30 సమయానికి ఇద్దరికి టేబుల్ నిధి అయింది. ఇది ఒక ఉదాహరణ.",
        },
      ],
      slots: ["సామ్యం 6:30", "సామ్యం 7:30", "రాత్రి 8:00"],
    },
  },
  care: {
    en: {
      business: "SUNRISE HEALTH CLINIC",
      number: "+91 98765 24311",
      intent: "“An appointment with Dr. Shah, please.”",
      detail: "Doctor request and preferred time",
      selectTime: "Select a slot",
      confirm: (time) => `Confirm ${time}`,
      confirmed: "Example confirmed — no real appointment",
      steps: [
        {
          speaker: "CALLER",
          text: "Hi, I’d like an appointment with Dr. Shah.",
        },
        {
          speaker: "VAANI",
          text: "Dr. Shah has 9:30 AM, 11:00 AM, or 3:30 PM available. Which slot would you prefer?",
        },
        {
          speaker: "VAANI",
          text: "11:00 AM is selected. Shall I confirm that appointment time?",
        },
        {
          speaker: "VAANI",
          text: "Your appointment with Dr. Shah is confirmed for 11:00 AM today. This is an example confirmation.",
        },
      ],
      slots: ["9:30 AM", "11:00 AM", "3:30 PM", "4:15 PM"],
    },
    hi: {
      business: "सनराइज़ हेल्थ क्लिनिक",
      number: "+91 98765 24311",
      intent: "“डॉ. शाह के साथ अपॉइंटमेंट चाहिए।”",
      detail: "डॉक्टर और पसंदीदा समय",
      selectTime: "समय चुनें",
      confirm: (time) => `${time} की पुष्टि करें`,
      confirmed: "उदाहरण की पुष्टि — असली अपॉइंटमेंट नहीं",
      steps: [
        {
          speaker: "कॉलर",
          text: "नमस्ते, डॉ. शाह के साथ अपॉइंटमेंट चाहिए।",
        },
        {
          speaker: "वाणी",
          text: "डॉ. शाह के लिए 9:30, 11:00 या 3:30 बजे उपलब्ध हैं। आपको कौन-सा समय सही लगता है?",
        },
        {
          speaker: "वाणी",
          text: "11:00 बजे चुना गया है। क्या मैं यह अपॉइंटमेंट समय पुष्टि कर दूँ?",
        },
        {
          speaker: "वाणी",
          text: "आज 11:00 बजे डॉ. शाह के साथ आपका अपॉइंटमेंट पुष्ट है। यह एक उदाहरण है।",
        },
      ],
      slots: ["सुबह 9:30", "सुबह 11:00", "दोपहर 3:30", "शाम 4:15"],
    },
    te: {
      business: "సన్‌రైజ్ హెల్త్ క్లినిక్",
      number: "+91 98765 24311",
      intent: "“డాక్టర్ షాహ్‌తో ఆపాయింట్మెంట్ కావాలి.”",
      detail: "డాక్టర్ అభ్యర్థన, ఎంపిక సమయం",
      selectTime: "సమయం ఎంచుకోండి",
      confirm: (time) => `${time} నిధి చేయండి`,
      confirmed: "ఉదాహరణ నిధీకరణ — నిజమైన ఆపాయింట్మెంట్ కాదు",
      steps: [
        {
          speaker: "కాలర్",
          text: "డాక్టర్ షాహ్‌తో ఆపాయింట్మెంట్ కావాలి.",
        },
        {
          speaker: "వాణీ",
          text: "డాక్టర్ షాహ్‌కు 9:30, 11:00 లేదా 3:30 సమయాలు ఉన్నాయి. ఏ సమయం మీకు సరిపోతుంది?",
        },
        {
          speaker: "వాణీ",
          text: "11:00 సమయం ఎంచుకోబడింది. ఆపాయింట్మెంట్ సమయాన్ని నిధి చేయాలా?",
        },
        {
          speaker: "వాణీ",
          text: "ఈరావు 11:00 సమయానికి డాక్టర్ షాహ్‌ ఆపాయింట్మెంట్ నిధి అయింది. ఇది ఒక ఉదాహరణ.",
        },
      ],
      slots: ["ఉదయం 9:30", "ఉదయం 11:00", "మధ్యాహ్నం 3:30", "సామ్యం 4:15"],
    },
  },
};

let activeService = "restaurant";
let activeLanguage = "en";
let demoStep = 0;
let selectedSlot = null;
let demoTimer = null;

const stopDemo = () => {
  if (demoTimer) {
    window.clearInterval(demoTimer);
    demoTimer = null;
  }
  playButton?.classList.remove("is-playing");
  if (playLabel) playLabel.textContent = "Play demo flow";
};

const updateLanguageCards = () => {
  languageCards.forEach((card) => {
    card.classList.toggle("is-active", card.dataset.languageCard === activeLanguage);
  });
};

const animateDemoText = () => {
  if (isReduced || !demoText) return;
  gsap.fromTo(
    [demoText, demoSpeaker],
    { y: 10 },
    { y: 0, duration: 0.42, stagger: 0.04, ease: "power2.out" },
  );
};

const renderDemo = ({ animate = true } = {}) => {
  if (!demo) return;
  const content = demoData[activeService][activeLanguage];
  const step = content.steps[demoStep];

  if (demoBusiness) demoBusiness.textContent = content.business;
  if (demoNumber) demoNumber.textContent = content.number;
  if (demoSpeaker) demoSpeaker.textContent = step.speaker;
  if (demoText) {
    demoText.textContent = step.text;
    demoText.setAttribute("lang", activeLanguage);
  }

  if (demoExplanation) {
    const intent = demoExplanation.querySelector("p");
    const detail = demoExplanation.querySelector("small");
    if (intent) {
      intent.textContent = content.intent;
      intent.setAttribute("lang", activeLanguage);
    }
    if (detail) detail.textContent = content.detail;
  }

  if (demoSlots) {
    demoSlots.replaceChildren(
      ...content.slots.map((slot, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = slot;
        button.dataset.slot = slot;
        button.dataset.slotIndex = String(index);
        button.classList.toggle("is-selected", selectedSlot === slot);
        return button;
      }),
    );
  }

  if (demoConfirm) {
    if (demoStep === 3) {
      demoConfirm.textContent = "Confirmed — example only";
      demoConfirm.disabled = true;
    } else {
      demoConfirm.textContent = selectedSlot
        ? content.confirm(selectedSlot)
        : content.confirm(content.slots[1]);
      demoConfirm.disabled = !selectedSlot;
    }
  }

  if (demoSelection) {
    demoSelection.textContent = demoStep === 3
      ? content.confirmed
      : selectedSlot
        ? `${selectedSlot} selected`
        : content.selectTime;
  }

  updateLanguageCards();
  if (animate) animateDemoText();
};

demoSlots?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-slot]");
  if (!button) return;
  selectedSlot = button.dataset.slot;
  renderDemo();
});

demoConfirm?.addEventListener("click", () => {
  if (!selectedSlot) return;
  stopDemo();
  demoStep = 3;
  renderDemo();
});

nextButton?.addEventListener("click", () => {
  stopDemo();
  if (demoStep >= 3) {
    demoStep = 0;
    selectedSlot = null;
  } else {
    demoStep += 1;
    if (demoStep >= 2 && !selectedSlot) {
      const content = demoData[activeService][activeLanguage];
      selectedSlot = content.slots[1];
    }
  }
  renderDemo();
});

playButton?.addEventListener("click", () => {
  if (demoTimer) {
    stopDemo();
    return;
  }

  if (demoStep >= 3) {
    demoStep = 0;
    selectedSlot = null;
    renderDemo();
  }

  playButton.classList.add("is-playing");
  if (playLabel) playLabel.textContent = "Pause demo";
  renderDemo();

  demoTimer = window.setInterval(() => {
    if (demoStep >= 3) {
      stopDemo();
      return;
    }
    demoStep += 1;
    if (demoStep >= 2 && !selectedSlot) {
      const content = demoData[activeService][activeLanguage];
      selectedSlot = content.slots[1];
    }
    renderDemo();
  }, 2200);
});

serviceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    stopDemo();
    activeService = button.dataset.service;
    demoStep = 0;
    selectedSlot = null;
    serviceButtons.forEach((item) => {
      const isActive = item === button;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-selected", String(isActive));
    });
    renderDemo();
  });
});

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    stopDemo();
    activeLanguage = button.dataset.language;
    demoStep = 0;
    selectedSlot = null;
    languageButtons.forEach((item) => {
      const isActive = item === button;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-selected", String(isActive));
    });
    renderDemo();
  });
});

renderDemo({ animate: false });

/* Current year */
document.querySelectorAll("[data-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});

/* Refresh scroll calculations after webfonts settle */
if (document.fonts?.ready) {
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}

window.addEventListener("visibilitychange", () => {
  if (document.hidden) stopDemo();
});
