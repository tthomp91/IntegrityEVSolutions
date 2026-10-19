/*
 * Integrity EV Solutions - site behavior.
 * Plain JavaScript, no libraries. Every page loads this one file.
 *
 * What it does:
 *   1. Call tracking: swaps the phone number based on ?src= in the link
 *   2. Menus: desktop Services dropdown and the mobile menu
 *   3. FAQ list on the service pages
 *   4. Smooth scrolling to sections, and the call / email / popup buttons
 *   5. Contact form: validation, UTM capture, reply-to
 *
 * Note: the CSS classes toggled below ("hidden", "block", "rotate-180", "visible",
 * "invisible", "grid-rows-[1fr]", "grid-rows-[0fr]") already exist in styles.css.
 * A class that is not in styles.css will have no effect.
 */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* 1. CALL TRACKING                                                    */
  /* Edit the numbers here. Digits only, no dashes.                      */
  /* The HTML always contains the default number (so Google and AI tools */
  /* see it). This swaps in a tracking number when the link has ?src=.   */
  /* ------------------------------------------------------------------ */
  var PHONE_MAP = {
    fbj: "4706883436",
    igj: "4706341457",
    printj: "4702566974",
    radioj: "4706139714",
    jordan: "4705176159"
  };
  var DEFAULT_PHONE = "4702622660"; // must match the number written in the HTML pages
  var STORAGE_KEY = "tracking_src";

  function formatPhone(raw) {
    return raw.slice(0, 3) + "-" + raw.slice(3, 6) + "-" + raw.slice(6);
  }
  function readStored() {
    try { return sessionStorage.getItem(STORAGE_KEY) || ""; } catch (e) { return ""; }
  }
  function storeSrc(value) {
    try { sessionStorage.setItem(STORAGE_KEY, value); } catch (e) { /* ignore */ }
  }

  var params = new URLSearchParams(window.location.search);
  var urlSrc = (params.get("src") || "").trim().toLowerCase();
  if (urlSrc) storeSrc(urlSrc);                    // remember it for the rest of the visit
  var src = urlSrc || readStored();
  var mapped = src ? PHONE_MAP[src] : "";
  var phone = mapped || DEFAULT_PHONE;

  if (params.get("debug_phone") === "1") {
    console.log("[PhoneTracking]", {
      src: src || null,
      reason: src ? (mapped ? "mapped_src" : "unknown_src") : "no_src",
      raw: phone,
      href: "tel:" + phone
    });
  }

  if (phone !== DEFAULT_PHONE) {
    var oldText = formatPhone(DEFAULT_PHONE);
    var newText = formatPhone(phone);
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var tag = node.parentNode && node.parentNode.nodeName;
        return tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT"
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT;
      }
    });
    var textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(function (node) {
      if (node.nodeValue.indexOf(oldText) !== -1) {
        node.nodeValue = node.nodeValue.split(oldText).join(newText);
      }
    });
    document.querySelectorAll('a[href^="tel:"]').forEach(function (link) {
      link.setAttribute("href", "tel:" + phone);
    });
  }

  /* ------------------------------------------------------------------ */
  /* 2. MENUS                                                            */
  /* ------------------------------------------------------------------ */
  var dropdown = document.querySelector("[data-dropdown]");
  if (dropdown) {
    var dropdownPanel = dropdown.querySelector("[data-dropdown-panel]");
    var dropdownChevron = dropdown.querySelector("[data-dropdown-chevron]");
    var setDropdown = function (open) {
      dropdownPanel.classList.toggle("hidden", !open);
      dropdownPanel.classList.toggle("block", open);
      dropdownChevron.classList.toggle("rotate-180", open);
    };
    dropdown.addEventListener("mouseenter", function () { setDropdown(true); });
    dropdown.addEventListener("mouseleave", function () { setDropdown(false); });
  }

  var menuPanel = document.querySelector("[data-menu-panel]");
  function setMenu(open) {
    if (!menuPanel) return;
    menuPanel.classList.toggle("hidden", !open);
    var openIcon = document.querySelector('[data-menu-icon="open"]');
    var closeIcon = document.querySelector('[data-menu-icon="close"]');
    if (openIcon) openIcon.classList.toggle("hidden", open);
    if (closeIcon) closeIcon.classList.toggle("hidden", !open);
  }

  /* ------------------------------------------------------------------ */
  /* 3. FAQ LIST (one answer open at a time; click again to close)        */
  /* ------------------------------------------------------------------ */
  var faqTriggers = Array.prototype.slice.call(document.querySelectorAll("[data-faq-trigger]"));
  var openFaq = -1;
  function renderFaq() {
    faqTriggers.forEach(function (trigger, index) {
      var open = index === openFaq;
      var item = trigger.closest("[data-state]");
      var panel = document.getElementById(trigger.getAttribute("aria-controls"));
      var chevron = trigger.querySelector("[data-faq-chevron]");
      if (item) item.setAttribute("data-state", open ? "open" : "closed");
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      if (chevron) chevron.classList.toggle("rotate-180", open);
      if (panel) {
        panel.setAttribute("aria-hidden", open ? "false" : "true");
        panel.classList.toggle("visible", open);
        panel.classList.toggle("grid-rows-[1fr]", open);
        panel.classList.toggle("invisible", !open);
        panel.classList.toggle("grid-rows-[0fr]", !open);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* 4. SCROLLING AND BUTTONS                                            */
  /* ------------------------------------------------------------------ */
  function scrollToId(id) {
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }
  function normalizePath(path) {
    return path.length > 1 ? path.replace(/\/+$/, "") : path;
  }

  document.addEventListener("click", function (e) {
    var target = e.target;
    if (!target || !target.closest) return;
    var el;

    if ((el = target.closest("[data-menu-toggle]"))) {
      setMenu(menuPanel ? menuPanel.classList.contains("hidden") : false);
      return;
    }

    if ((el = target.closest("[data-faq-trigger]"))) {
      var index = faqTriggers.indexOf(el);
      openFaq = openFaq === index ? -1 : index;
      renderFaq();
      return;
    }

    if ((el = target.closest("[data-scroll]"))) {
      scrollToId(el.getAttribute("data-scroll"));
      return;
    }

    if ((el = target.closest("[data-goto-contact]"))) {
      if (el.closest("[data-menu-panel]")) setMenu(false);
      if (window.location.pathname !== "/") {
        window.location.href = "/#contact";
      } else {
        scrollToId("contact");
      }
      return;
    }

    if ((el = target.closest("[data-call]"))) {
      window.location.href = "tel:" + phone;
      return;
    }

    if ((el = target.closest("[data-mailto]"))) {
      window.location.href = "mailto:" + el.getAttribute("data-mailto");
      return;
    }

    if ((el = target.closest("[data-alert]"))) {
      window.alert(el.getAttribute("data-alert"));
      return;
    }

    // Links inside the mobile menu close it
    if ((el = target.closest("a")) && el.closest("[data-menu-panel]")) setMenu(false);

    // Links to a section of the page you are already on scroll smoothly
    if ((el = target.closest("a[href]")) && el.hash && el.origin === window.location.origin &&
        normalizePath(el.pathname) === normalizePath(window.location.pathname) &&
        !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
      e.preventDefault();
      window.history.pushState(null, "", el.pathname + el.search + el.hash);
      scrollToId(el.hash.slice(1));
    }
  });

  // Arriving on a page with #section in the address: scroll to it smoothly
  if (window.location.hash) {
    setTimeout(function () { scrollToId(window.location.hash.slice(1)); }, 100);
  }

  /* ------------------------------------------------------------------ */
  /* 5. CONTACT FORM                                                     */
  /* The form posts to FormSubmit (see the form's action in index.html). */
  /* ------------------------------------------------------------------ */
  var form = document.querySelector("[data-contact-form]");
  if (form) {
    // Remember ad campaign values (utm_*) and send them with the form
    ["utm_source", "utm_medium", "utm_campaign"].forEach(function (key) {
      var stored = "";
      try { stored = localStorage.getItem(key) || ""; } catch (e) { /* ignore */ }
      if (form.elements[key]) form.elements[key].value = params.get(key) || stored || "";
    });
    if (params.get("utm_source")) {
      ["utm_source", "utm_medium", "utm_campaign"].forEach(function (key) {
        try { localStorage.setItem(key, params.get(key) || ""); } catch (e) { /* ignore */ }
      });
    }

    var EMAIL_PATTERN = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
    var PHONE_PATTERN = /^[\d\s\-()+.]+$/;

    // Same rules and wording as before. If a field breaks several rules, the last message is shown.
    var validate = function (values) {
      var errors = {};
      var first = values.firstName.trim();
      if (first.length < 1) errors.firstName = "First name is required";
      if (first.length > 50) errors.firstName = "First name must be less than 50 characters";

      var last = values.lastName.trim();
      if (last.length < 1) errors.lastName = "Last name is required";
      if (last.length > 50) errors.lastName = "Last name must be less than 50 characters";

      var email = values.email.trim();
      if (!EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address";
      if (email.length > 255) errors.email = "Email must be less than 255 characters";

      var tel = values.phone.trim();
      if (tel.length < 10) errors.phone = "Phone number must be at least 10 digits";
      if (tel.length > 20) errors.phone = "Phone number too long";
      if (!PHONE_PATTERN.test(tel)) errors.phone = "Enter a valid phone number";

      if (values.service.length < 1) errors.service = "Please select a service";

      var city = values.city.trim();
      if (city.length < 1) errors.city = "City is required";
      if (city.length > 100) errors.city = "City name too long";

      if (values.details.length > 2000) errors.details = "Details must be less than 2000 characters";
      return errors;
    };

    var clearErrors = function (onlyField) {
      form.querySelectorAll("[data-error]").forEach(function (node) {
        if (!onlyField || node.getAttribute("data-error") === onlyField) node.remove();
      });
    };

    form.addEventListener("input", function (e) {
      if (e.target.name === "email") form.elements._replyto.value = e.target.value;
      if (e.target.name) clearErrors(e.target.name);
    });
    form.addEventListener("change", function (e) {
      if (e.target.name) clearErrors(e.target.name);
    });

    form.addEventListener("submit", function (e) {
      var values = {};
      ["firstName", "lastName", "email", "phone", "service", "city", "timeline", "details"].forEach(function (name) {
        values[name] = form.elements[name].value;
      });
      form.elements._replyto.value = values.email;

      var errors = validate(values);
      clearErrors();
      var names = Object.keys(errors);
      if (names.length === 0) return; // valid: let the browser send the form to FormSubmit

      e.preventDefault();
      names.forEach(function (name) {
        var message = document.createElement("p");
        message.className = "text-sm text-destructive mt-1";
        message.setAttribute("data-error", name);
        message.textContent = errors[name];
        form.elements[name].parentElement.appendChild(message);
      });
    });
  }
})();
