/* CrimsonJS Auth Gate */
(function () {
  "use strict";

  var VERSION = "0.1.0";
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

  if (safeGet(storageKey)) {
    return;
  }

  lockPage();

  ready(function () {
    if (document.getElementById(ROOT_ID)) {
      return;
    }

    injectStyles();

    var gate = renderGate();
    document.body.appendChild(gate);
    document.body.classList.add("crimson-auth-locked");
    bindGate(gate);
    updateCount(gate);

    var firstInput = gate.querySelector("input[name='login-email']");
    if (firstInput) {
      firstInput.focus({ preventScroll: true });
    }
  });

  function ready(callback) {
    if (document.body) {
      callback();
      return;
    }

    document.addEventListener("DOMContentLoaded", callback, { once: true });
  }

  function lockPage() {
    document.documentElement.classList.add("crimson-auth-locked");
    if (document.body) {
      document.body.classList.add("crimson-auth-locked");
    }
  }

  function unlockPage(userId) {
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
    if (gate && gate._crimsonCleanup) {
      gate._crimsonCleanup();
    }

    if (gate) {
      gate.remove();
    }

    document.documentElement.classList.remove("crimson-auth-locked");
    if (document.body) {
      document.body.classList.remove("crimson-auth-locked");
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

  function renderGate() {
    var gate = document.createElement("div");
    gate.id = ROOT_ID;
    gate.className = "crimson-auth-gate";
    gate.setAttribute("data-crimson-mode", "login");
    gate.innerHTML =
      '<div class="crimson-backdrop" aria-hidden="true"></div>' +
      '<section class="crimson-shell" role="dialog" aria-modal="true" aria-labelledby="crimson-title">' +
      '  <div class="crimson-intro">' +
      '    <div class="crimson-mark" aria-hidden="true">' +
      escapeHtml(siteName.charAt(0) || "C") +
      "</div>" +
      '    <p class="crimson-kicker">Members access</p>' +
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
      '      <button class="crimson-tab is-active" type="button" role="tab" aria-selected="true" aria-controls="crimson-login-form" data-crimson-tab="login">Login</button>' +
      '      <button class="crimson-tab" type="button" role="tab" aria-selected="false" aria-controls="crimson-signup-form" data-crimson-tab="signup">Signup</button>' +
      "    </div>" +
      '    <form class="crimson-form is-active" id="crimson-login-form" data-crimson-form="login" novalidate>' +
      '      <label class="crimson-field">Email<input name="login-email" type="email" autocomplete="email" required></label>' +
      '      <label class="crimson-field">Password<input name="login-password" type="password" autocomplete="current-password" required></label>' +
      '      <button class="crimson-submit" type="submit">Log in</button>' +
      '      <p class="crimson-message" role="status" aria-live="polite"></p>' +
      "    </form>" +
      '    <form class="crimson-form" id="crimson-signup-form" data-crimson-form="signup" novalidate>' +
      '      <label class="crimson-field">Username<input name="signup-username" type="text" autocomplete="username" minlength="4" required></label>' +
      '      <label class="crimson-field">Email<input name="signup-email" type="email" autocomplete="email" required></label>' +
      '      <label class="crimson-field">Password<input name="signup-password" type="password" autocomplete="new-password" aria-describedby="crimson-password-help" required></label>' +
      '      <p class="crimson-help" id="crimson-password-help">Use 8+ characters with upper, lower, number, and symbol.</p>' +
      '      <button class="crimson-submit" type="submit">Create account</button>' +
      '      <p class="crimson-message" role="status" aria-live="polite"></p>' +
      "    </form>" +
      "  </div>" +
      "</section>";

    return gate;
  }

  function bindGate(gate) {
    var tabs = Array.prototype.slice.call(
      gate.querySelectorAll("[data-crimson-tab]"),
    );
    var loginForm = gate.querySelector("[data-crimson-form='login']");
    var signupForm = gate.querySelector("[data-crimson-form='signup']");

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

    function onKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      trapFocus(gate, event);
    }

    document.addEventListener("keydown", onKeydown, true);
    gate._crimsonCleanup = function () {
      document.removeEventListener("keydown", onKeydown, true);
    };
  }

  function setMode(gate, mode) {
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
        form.classList.toggle(
          "is-active",
          form.getAttribute("data-crimson-form") === mode,
        );
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
        email: email,
        password: password,
      });

      if (result.error || !result.data || !result.data.user) {
        throw new Error("login_failed");
      }

      syncSiteProfileFromLogin(client, result.data.user, email);
      unlockPage(result.data.user.id);
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
        email: email,
        password: password,
        options: {
          data: {
            username: username,
            site: siteName,
          },
        },
      });

      if (signup.error) {
        var signupErrorMessage = getSignupErrorMessage(signup.error);
        var existingJoinedIdFromError = await tryJoinExistingAccount(
          email,
          password,
          username,
        );
        if (existingJoinedIdFromError) {
          unlockPage(existingJoinedIdFromError);
          return;
        }

        setMessage(form, signupErrorMessage, "error");
        return;
      }

      if (signup.data && signup.data.session && signup.data.user) {
        await applySession(client, signup.data.session);
        ensureSiteProfile(
          client,
          signup.data.user,
          username,
          email,
        );
        unlockPage(signup.data.user.id);
        return;
      }

      if (signup.data && signup.data.user) {
        var existingJoinedId = await tryJoinExistingAccount(
          email,
          password,
          username,
        );
        if (existingJoinedId) {
          unlockPage(existingJoinedId);
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
        unlockPage(joinedUserId);
        return;
      }

      setMessage(
        form,
        getSignupErrorMessage(error),
        "error",
      );
    } finally {
      setBusy(form, false);
    }
  }

  async function tryJoinExistingAccount(email, password, username) {
    try {
      var client = await getSupabaseClient();
      var login = await client.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (login.error || !login.data || !login.data.user) {
        return null;
      }

      ensureSiteProfile(
        client,
        login.data.user,
        username,
        email,
      );
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
  }

  function setMessage(form, message, type) {
    var node = form.querySelector(".crimson-message");
    if (!node) {
      return;
    }

    node.textContent = message || "";
    node.setAttribute("data-crimson-message", type || "");
  }

  function trapFocus(gate, event) {
    var focusable = Array.prototype.slice
      .call(
        gate.querySelectorAll(
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

    if (!isStrongPassword(password)) {
      return "Password must be 8+ characters with upper, lower, number, and symbol.";
    }

    return "";
  }

  function getSignupErrorMessage(error) {
    var message = String((error && error.message) || "").toLowerCase();
    var code = String((error && (error.code || error.status)) || "").toLowerCase();

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
      (message.indexOf("duplicate") !== -1 && message.indexOf("username") !== -1)
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

  function isStrongPassword(value) {
    return (
      value.length >= 8 &&
      /[a-z]/.test(value) &&
      /[A-Z]/.test(value) &&
      /[0-9]/.test(value) &&
      /[^A-Za-z0-9]/.test(value)
    );
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
