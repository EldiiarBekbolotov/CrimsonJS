/* CrimsonJS Auth Gate */
(function () {
  "use strict";

  var VERSION = "0.2.0";
  var SUPABASE_URL = "https://vrlmjdmkwyywzxkyhzld.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_vjG8bFzlqbuKZjjf_bGdTw_jUfLv7I9";
  var SUPABASE_CDN_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  var ROOT_ID = "crimson-auth-gate";
  var CSS_ID = "crimson-auth-css";

  var rawConfig = window.CrimsonConfig || {};
  var siteName =
    cleanText(rawConfig.siteName) ||
    cleanText(document.title) ||
    window.location.hostname;
  var description =
    cleanText(rawConfig.description) ||
    "Create an account or log in to continue.";
  var supabaseUrl = rawConfig.supabaseUrl || SUPABASE_URL;
  var supabaseAnonKey = rawConfig.supabaseAnonKey || SUPABASE_ANON_KEY;
  var storageKey = "crimson_auth_" + slugify(siteName);
  var supabaseClient = null;

  window.Crimson = window.Crimson || {};
  window.Crimson.version = VERSION;
  window.Crimson.resetAuth = function () {
    safeRemove(storageKey);
  };
  window.Crimson.isGuest = function () {
    return !isAuthenticated();
  };
  window.Crimson.open = function () {};
  window.Crimson.close = function () {};

  if (isAuthenticated()) {
    return;
  }

  ready(function () {
    if (document.getElementById(ROOT_ID)) {
      return;
    }

    injectStyles();

    var gate = renderGate();
    applyTheme(gate);
    document.body.appendChild(gate);
    bindGate(gate);
    updateCount(gate);

    window.Crimson.open = function () {
      openGate(gate);
    };
    window.Crimson.close = function () {
      closeGate(gate);
    };
  });

  function isAuthenticated() {
    try {
      var stored = JSON.parse(safeGet(storageKey) || "null");
      return Boolean(stored && stored.authenticated);
    } catch (error) {
      return false;
    }
  }

  function ready(callback) {
    if (document.body) {
      callback();
      return;
    }

    document.addEventListener("DOMContentLoaded", callback, { once: true });
  }

  function completeAuth(userId) {
    safeSet(
      storageKey,
      JSON.stringify({
        authenticated: true,
        site: siteName,
        userId: userId || null,
        at: new Date().toISOString(),
      }),
    );

    var gate = document.getElementById(ROOT_ID);
    if (gate) {
      closeGate(gate);

      if (gate._crimsonCleanup) {
        gate._crimsonCleanup();
      }

      gate.remove();
    }
  }

  function injectStyles() {
    if (document.getElementById(CSS_ID)) {
      return;
    }

    var link = document.createElement("link");
    link.id = CSS_ID;
    link.rel = "stylesheet";
    link.href = rawConfig.cssUrl || resolveCssUrl();
    link.setAttribute("data-crimson", "css");
    (document.head || document.documentElement).appendChild(link);
  }

  function resolveCssUrl() {
    var script =
      document.currentScript ||
      document.querySelector("script[src*='crimson']");
    if (!script || !script.src) {
      return "css/crimson.min.css";
    }

    try {
      return new URL("../css/crimson.min.css", script.src).href;
    } catch (error) {
      return "css/crimson.min.css";
    }
  }

  function markContent() {
    if (rawConfig.pfpURL) {
      return (
        '<img src="' +
        escapeHtml(rawConfig.pfpURL) +
        '" alt="' +
        escapeHtml(siteName) +
        '">'
      );
    }

    return escapeHtml(siteName.charAt(0) || "C");
  }

  function renderGate() {
    var gate = document.createElement("div");
    gate.id = ROOT_ID;
    gate.className = "crimson-auth-gate";
    gate.setAttribute("data-crimson-mode", "signup");
    gate.innerHTML =
      '<button class="crimson-launcher" type="button" data-crimson-launcher aria-haspopup="dialog" aria-expanded="false" aria-label="Sign up or log in to ' +
      escapeHtml(siteName) +
      '">' +
      markContent() +
      "</button>" +
      '<div class="crimson-modal" data-crimson-modal>' +
      '<div class="crimson-backdrop" data-crimson-backdrop></div>' +
      '<section class="crimson-shell" role="dialog" aria-modal="true" aria-labelledby="crimson-title">' +
      '  <button class="crimson-close" type="button" data-crimson-close aria-label="Close">&times;</button>' +
      '  <div class="crimson-intro">' +
      '    <div class="crimson-mark" aria-hidden="true">' +
      markContent() +
      "</div>" +
      '    <p class="crimson-kicker"></p>' +
      '    <h1 id="crimson-title">' +
      escapeHtml(siteName) +
      "</h1>" +
      '    <p class="crimson-description">' +
      escapeHtml(description) +
      "</p>" +
      '    <div class="crimson-stat" aria-live="polite">' +
      '      <span class="crimson-stat-number" data-crimson-count>...</span>' +
      '      <span class="crimson-stat-copy" data-crimson-counter-text>Join users already on ' +
      escapeHtml(siteName) +
      "</span>" +
      "    </div>" +
      "  </div>" +
      '  <div class="crimson-panel">' +
      '    <div class="crimson-tabs" role="tablist" aria-label="Authentication options">' +
      '      <div class="crimson-tab-indicator" aria-hidden="true"></div>' +
      '      <button class="crimson-tab is-active" type="button" role="tab" aria-selected="true" aria-controls="crimson-signup-form" data-crimson-tab="signup">Signup</button>' +
      '      <button class="crimson-tab" type="button" role="tab" aria-selected="false" aria-controls="crimson-login-form" data-crimson-tab="login">Login</button>' +
      "    </div>" +
      '    <div class="crimson-forms">' +
      '    <form class="crimson-form is-active" id="crimson-signup-form" data-crimson-form="signup" novalidate>' +
      '      <label class="crimson-field">Username<input name="signup-username" type="text" autocomplete="username" minlength="4" aria-describedby="crimson-username-hint" required></label>' +
      '      <p class="crimson-hint" id="crimson-username-hint" data-crimson-hint="username"></p>' +
      '      <label class="crimson-field">Email<input name="signup-email" type="email" autocomplete="email" aria-describedby="crimson-email-hint" required></label>' +
      '      <p class="crimson-hint" id="crimson-email-hint" data-crimson-hint="email"></p>' +
      '      <label class="crimson-field">Password<input name="signup-password" type="password" autocomplete="new-password" minlength="8" aria-describedby="crimson-password-hint" required></label>' +
      '      <p class="crimson-hint" id="crimson-password-hint" data-crimson-hint="password"></p>' +
      '      <button class="crimson-submit" type="submit" disabled>Create account</button>' +
      '      <p class="crimson-message" role="status" aria-live="polite"></p>' +
      "    </form>" +
      '    <form class="crimson-form" id="crimson-login-form" data-crimson-form="login" novalidate>' +
      '      <label class="crimson-field">Email<input name="login-email" type="email" autocomplete="email" required></label>' +
      '      <label class="crimson-field">Password<input name="login-password" type="password" autocomplete="current-password" required></label>' +
      '      <button class="crimson-submit" type="submit">Log in</button>' +
      '      <p class="crimson-message" role="status" aria-live="polite"></p>' +
      "    </form>" +
      "    </div>" +
      "  </div>" +
      (rawConfig.customHTML
        ? '<div class="crimson-extra">' + rawConfig.customHTML + "</div>"
        : "") +
      "</section>" +
      "</div>";

    return gate;
  }

  function applyTheme(gate) {
    var colors =
      rawConfig.colors && typeof rawConfig.colors === "object"
        ? rawConfig.colors
        : {};
    var font = rawConfig.font;

    var colorMap = {
      introBg: "--crimson-intro-bg",
      introText: "--crimson-intro-text",
      introTextMuted: "--crimson-intro-text-muted",
      markBg: "--crimson-mark-bg",
      kicker: "--crimson-kicker",
      panelBg: "--crimson-panel-bg",
      tabsBg: "--crimson-tabs-bg",
      accent: "--crimson-accent",
      accentText: "--crimson-accent-text",
      accentHover: "--crimson-accent-hover",
      focus: "--crimson-focus",
      focusRing: "--crimson-focus-ring",
      backdrop: "--crimson-backdrop",
      statBg: "--crimson-stat-bg",
    };

    Object.keys(colorMap).forEach(function (key) {
      if (colors[key]) {
        gate.style.setProperty(colorMap[key], colors[key]);
      }
    });

    if (font) {
      gate.style.setProperty("--crimson-font", font);
    }
  }

  function openGate(gate) {
    if (gate.classList.contains("is-open")) {
      return;
    }

    gate.classList.add("is-open");

    var launcher = gate.querySelector("[data-crimson-launcher]");
    if (launcher) {
      launcher.setAttribute("aria-expanded", "true");
    }

    document.documentElement.classList.add("crimson-auth-locked");
    document.body.classList.add("crimson-auth-locked");

    var focusTarget = gate.querySelector("[data-crimson-form].is-active input");
    if (focusTarget) {
      focusTarget.focus({ preventScroll: true });
    }
  }

  function closeGate(gate) {
    if (!gate.classList.contains("is-open")) {
      return;
    }

    gate.classList.remove("is-open");

    document.documentElement.classList.remove("crimson-auth-locked");
    document.body.classList.remove("crimson-auth-locked");

    var launcher = gate.querySelector("[data-crimson-launcher]");
    if (launcher) {
      launcher.setAttribute("aria-expanded", "false");
      launcher.focus({ preventScroll: true });
    }
  }

  function bindGate(gate) {
    var launcher = gate.querySelector("[data-crimson-launcher]");
    var backdrop = gate.querySelector("[data-crimson-backdrop]");
    var closeButton = gate.querySelector("[data-crimson-close]");
    var tabs = Array.prototype.slice.call(
      gate.querySelectorAll("[data-crimson-tab]"),
    );
    var loginForm = gate.querySelector("[data-crimson-form='login']");
    var signupForm = gate.querySelector("[data-crimson-form='signup']");

    launcher.addEventListener("click", function () {
      openGate(gate);
    });

    backdrop.addEventListener("click", function () {
      closeGate(gate);
    });

    closeButton.addEventListener("click", function () {
      closeGate(gate);
    });

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        setMode(gate, tab.getAttribute("data-crimson-tab"));
      });
    });

    loginForm.addEventListener("submit", function (event) {
      event.preventDefault();
      handleLogin(loginForm);
    });

    signupForm.addEventListener("submit", function (event) {
      event.preventDefault();
      handleSignup(signupForm);
    });

    bindSignupValidation(signupForm);

    function onKeydown(event) {
      if (!gate.classList.contains("is-open")) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeGate(gate);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      trapFocus(gate.querySelector(".crimson-shell"), event);
    }

    document.addEventListener("keydown", onKeydown, true);
    gate._crimsonCleanup = function () {
      document.removeEventListener("keydown", onKeydown, true);
    };
  }

  function bindSignupValidation(form) {
    var submit = form.querySelector(".crimson-submit");
    var fields = {
      username: {
        input: form.elements["signup-username"],
        validate: function (value) {
          return isValidUsername(cleanUsername(value));
        },
        requirement: "At least 4 letters. Letters, numbers, _ . - only.",
        valid: "✓ Username looks good.",
      },
      email: {
        input: form.elements["signup-email"],
        validate: function (value) {
          return isValidEmail(normalizeEmail(value));
        },
        requirement: "Enter a valid email address.",
        valid: "✓ Email looks good.",
      },
      password: {
        input: form.elements["signup-password"],
        validate: function (value) {
          return isValidPassword(value);
        },
        requirement: "At least 8 characters.",
        valid: "✓ Password meets requirements.",
      },
    };

    function refresh() {
      var allValid = true;

      Object.keys(fields).forEach(function (key) {
        var field = fields[key];
        var value = field.input.value;
        var state = !value
          ? "empty"
          : field.validate(value)
            ? "valid"
            : "invalid";

        if (state !== "valid") {
          allValid = false;
        }

        field.input.setAttribute("data-crimson-valid", state);

        var hint = form.querySelector("[data-crimson-hint='" + key + "']");
        if (hint) {
          hint.setAttribute("data-crimson-state", state);
          hint.textContent =
            state === "valid" ? field.valid : field.requirement;
        }
      });

      submit.disabled = !allValid;
      return allValid;
    }

    Object.keys(fields).forEach(function (key) {
      fields[key].input.addEventListener("input", refresh);
    });

    refresh();
    form._crimsonRefresh = refresh;
  }

  function setMode(gate, mode) {
    if (gate.getAttribute("data-crimson-mode") === mode) {
      return;
    }

    gate.setAttribute("data-crimson-mode", mode);

    Array.prototype.forEach.call(
      gate.querySelectorAll("[data-crimson-tab]"),
      function (tab) {
        var isActive = tab.getAttribute("data-crimson-tab") === mode;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", String(isActive));
      },
    );

    Array.prototype.forEach.call(
      gate.querySelectorAll("[data-crimson-form]"),
      function (form) {
        var isActive = form.getAttribute("data-crimson-form") === mode;
        form.classList.toggle("is-active", isActive);
        setMessage(form, "");
      },
    );

    var focusTarget = gate.querySelector(
      "[data-crimson-form='" + mode + "'] input",
    );
    if (focusTarget) {
      focusTarget.focus({ preventScroll: true });
    }
  }

  async function handleLogin(form) {
    var email = normalizeEmail(form.elements["login-email"].value);
    var password = form.elements["login-password"].value;

    if (!isValidEmail(email) || !password) {
      setMessage(form, "Enter a valid email and password.", "error");
      return;
    }

    setBusy(form, true);
    setMessage(form, "");

    try {
      var client = await getSupabaseClient();
      var result = await client.auth.signInWithPassword({
        email: siteEmail(email),
        password: password,
      });

      if (result.error || !result.data || !result.data.user) {
        throw new Error("login_failed");
      }

      syncSiteProfileFromLogin(client, result.data.user, email);
      completeAuth(result.data.user.id);
    } catch (error) {
      setMessage(form, "Login failed. Check your email and password.", "error");
    } finally {
      setBusy(form, false);
    }
  }

  async function handleSignup(form) {
    var username = cleanUsername(form.elements["signup-username"].value);
    var email = normalizeEmail(form.elements["signup-email"].value);
    var password = form.elements["signup-password"].value;
    var validationMessage = validateSignup(username, email, password);

    if (validationMessage) {
      setMessage(form, validationMessage, "error");
      return;
    }

    setBusy(form, true);
    setMessage(form, "");

    try {
      var client = await getSupabaseClient();
      var signup = await client.auth.signUp({
        email: siteEmail(email),
        password: password,
        options: {
          data: {
            username: username,
            site: siteName,
          },
        },
      });

      if (signup.error) {
        var existingJoinedIdFromError = await tryJoinExistingAccount(
          email,
          password,
          username,
        );
        if (existingJoinedIdFromError) {
          completeAuth(existingJoinedIdFromError);
          return;
        }

        setMessage(form, getSignupErrorMessage(signup.error), "error");
        return;
      }

      if (signup.data && signup.data.session && signup.data.user) {
        await applySession(client, signup.data.session);
        ensureSiteProfile(client, signup.data.user, username, email);
        completeAuth(signup.data.user.id);
        return;
      }

      if (signup.data && signup.data.user) {
        var existingJoinedId = await tryJoinExistingAccount(
          email,
          password,
          username,
        );
        if (existingJoinedId) {
          completeAuth(existingJoinedId);
          return;
        }

        setMessage(
          form,
          "Check your email to finish signup, then return and log in.",
          "success",
        );
        return;
      }

      throw new Error("signup_failed");
    } catch (error) {
      var joinedUserId = await tryJoinExistingAccount(
        email,
        password,
        username,
      );
      if (joinedUserId) {
        completeAuth(joinedUserId);
        return;
      }

      setMessage(form, getSignupErrorMessage(error), "error");
    } finally {
      setBusy(form, false);
    }
  }

  async function tryJoinExistingAccount(email, password, username) {
    try {
      var client = await getSupabaseClient();
      var login = await client.auth.signInWithPassword({
        email: siteEmail(email),
        password: password,
      });

      if (login.error || !login.data || !login.data.user) {
        return null;
      }

      ensureSiteProfile(client, login.data.user, username, email);
      return login.data.user.id;
    } catch (error) {
      return null;
    }
  }

  async function applySession(client, session) {
    if (!session || !session.access_token || !session.refresh_token) {
      return;
    }

    try {
      await client.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
    } catch (error) {
      return;
    }
  }

  async function syncSiteProfileFromLogin(client, user, email) {
    try {
      var metadata = user.user_metadata || {};
      var username = cleanUsername(metadata.username || metadata.name || "");

      if (!isValidUsername(username)) {
        return false;
      }

      return ensureSiteProfile(client, user, username, email);
    } catch (error) {
      return false;
    }
  }

  async function ensureSiteProfile(client, user, username, email) {
    var alreadyJoined = await userHasSiteProfile(client, user.id);
    if (alreadyJoined) {
      return true;
    }

    try {
      var insert = await client.from("profiles").insert({
        id: user.id,
        username: username,
        email: email,
        site: siteName,
      });

      if (insert.error) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async function userHasSiteProfile(client, userId) {
    try {
      var result = await client
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .eq("site", siteName)
        .maybeSingle();

      return Boolean(!result.error && result.data);
    } catch (error) {
      return false;
    }
  }

  async function updateCount(gate) {
    var countNode = gate.querySelector("[data-crimson-count]");
    var copyNode = gate.querySelector("[data-crimson-counter-text]");

    try {
      var client = await getSupabaseClient();
      var result = await client.rpc("get_site_user_count", {
        site_name: siteName,
      });

      if (result.error) {
        throw new Error("count_failed");
      }

      var count = Number(result.data || 0);
      countNode.textContent = count.toLocaleString();
      copyNode.textContent =
        "Join " + count.toLocaleString() + " users already on " + siteName;
    } catch (error) {
      countNode.textContent = "Private";
      copyNode.textContent = "Join members already on " + siteName;
    }
  }

  async function getSupabaseClient() {
    if (supabaseClient) {
      return supabaseClient;
    }

    if (!isConfigured()) {
      throw new Error("missing_supabase_config");
    }

    await ensureSupabaseCdn();

    if (!window.supabase || !window.supabase.createClient) {
      throw new Error("missing_supabase_client");
    }

    supabaseClient = window.supabase.createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      },
    );

    return supabaseClient;
  }

  function ensureSupabaseCdn() {
    if (window.supabase && window.supabase.createClient) {
      return Promise.resolve();
    }

    return new Promise(function (resolve, reject) {
      var existing = document.querySelector(
        "script[src*='@supabase/supabase-js']",
      );

      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      var script = document.createElement("script");
      script.src = SUPABASE_CDN_URL;
      script.async = true;
      script.setAttribute("data-crimson", "supabase");
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", reject, { once: true });
      (document.head || document.documentElement).appendChild(script);
    });
  }

  function setBusy(form, isBusy) {
    Array.prototype.forEach.call(form.elements, function (element) {
      element.disabled = isBusy;
    });

    form.classList.toggle("is-loading", isBusy);

    if (!isBusy && form._crimsonRefresh) {
      form._crimsonRefresh();
    }
  }

  function setMessage(form, message, type) {
    var node = form.querySelector(".crimson-message");
    if (!node) {
      return;
    }

    node.textContent = message || "";
    node.setAttribute("data-crimson-message", type || "");
  }

  function trapFocus(shell, event) {
    var focusable = Array.prototype.slice
      .call(
        shell.querySelectorAll(
          "button, input, select, textarea, a[href], [tabindex]:not([tabindex='-1'])",
        ),
      )
      .filter(function (element) {
        return !element.disabled && element.offsetParent !== null;
      });

    if (!focusable.length) {
      return;
    }

    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function validateSignup(username, email, password) {
    if (!isValidUsername(username)) {
      return "Username needs at least 4 letters.";
    }

    if (!isValidEmail(email)) {
      return "Enter a valid email address.";
    }

    if (!isValidPassword(password)) {
      return "Password must be at least 8 characters.";
    }

    return "";
  }

  function getSignupErrorMessage(error) {
    var message = String((error && error.message) || "").toLowerCase();
    var code = String(
      (error && (error.code || error.status)) || "",
    ).toLowerCase();

    if (message.indexOf("missing_supabase_config") !== -1) {
      return "CrimsonJS is missing its Supabase configuration.";
    }

    if (message.indexOf("missing_supabase_client") !== -1) {
      return "Supabase did not load. Refresh and try again.";
    }

    if (
      message.indexOf("failed to fetch") !== -1 ||
      message.indexOf("network") !== -1 ||
      message.indexOf("load failed") !== -1
    ) {
      return "Could not reach Supabase Auth. Check your connection and try again.";
    }

    if (
      code === "23505" ||
      message.indexOf("profiles_username_global_unique") !== -1 ||
      message.indexOf("database error saving new user") !== -1 ||
      (message.indexOf("duplicate") !== -1 &&
        message.indexOf("username") !== -1)
    ) {
      return "That username is already taken.";
    }

    if (
      message.indexOf("already registered") !== -1 ||
      message.indexOf("already exists") !== -1
    ) {
      return "That email already has an account. Try logging in.";
    }

    if (message.indexOf("password") !== -1) {
      return "Use a stronger password.";
    }

    return "Signup failed. Try a different username or log in if you already have an account.";
  }

  function isValidUsername(value) {
    var letters = (value.match(/[A-Za-z]/g) || []).length;
    return (
      value.length >= 4 && letters >= 4 && /^[A-Za-z0-9_.-]{4,32}$/.test(value)
    );
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function isValidPassword(value) {
    return value.length >= 8;
  }

  function isConfigured() {
    return (
      /^https:\/\/.+\.supabase\.co\/?$/.test(supabaseUrl) &&
      supabaseUrl.indexOf("YOUR_PROJECT_REF") === -1 &&
      supabaseAnonKey &&
      supabaseAnonKey.length > 20 &&
      supabaseAnonKey.indexOf("YOUR_SUPABASE") === -1
    );
  }

  function cleanText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanUsername(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  function normalizeEmail(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  function slugify(value) {
    return (
      cleanText(value)
        .replace(/[^A-Za-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "site"
    );
  }

  function siteEmail(email) {
    var at = email.lastIndexOf("@");
    if (at === -1) return email;
    return email.slice(0, at) + "+" + slugify(siteName) + email.slice(at);
  }

  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      return false;
    }

    return true;
  }

  function safeRemove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      return false;
    }

    return true;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[character];
    });
  }
})();
