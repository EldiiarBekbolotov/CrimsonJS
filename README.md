# CrimsonJS

[![](https://data.jsdelivr.com/v1/package/gh/eldiiarbekbolotov/crimsonjs/badge)](https://www.jsdelivr.com/package/gh/eldiiarbekbolotov/crimsonjs)

CrimsonJS is an embeddable auth-gatekeeping widget for client websites.

## Setup

```html
<script>
  window.CrimsonConfig = {
    siteName: "Univa Dev",
    description: "Custom description",
    pfpURL: "https://univadev.com/univadev.svg",
    font: "Inter, sans-serif",
    colors: {
      introBg: "#1a1a2e",
      introText: "#e0e0ff",
      markBg: "#c2c2c2",
      kicker: "#b0abab",
      panelBg: "#fafafa",
      tabsBg: "#e5d3ee",
      accent: "#7c3aed",
      accentHover: "#6d28d9",
      accentText: "#ffffff",
      backdrop: "rgba(0,0,0,0.1)",
      focus: "#7c3aed",
      focusRing: "rgba(124,58,237,0.15)",
      statBg: "rgba(0,0,0,0.5)",
    },
    customHTML: "<h3>Hello world!</h3>",
  };
</script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="https://cdn.jsdelivr.net/gh/eldiiarbekbolotov/crimsonjs@latest/js/crimson.min.js"></script>
```

## How it works

CrimsonJS no longer blocks the page. Visitors browse freely; a small circular button in the bottom-right corner opens the signup/login popup (signup is the default tab). The popup closes with the × button, the backdrop, or Escape. Once someone signs up or logs in, the button disappears for good on that browser.

- Fields validate live: username, email, and password each show a green check when they meet the requirements, and Create account stays disabled until all three pass.
- Passwords only need to be at least 8 characters.
- `Crimson.open()` / `Crimson.close()` open and close the popup programmatically (e.g. from your own "Sign up" link). `Crimson.isGuest()` reports whether the visitor has an account. `Crimson.resetAuth()` clears the stored auth state.

## Security setup (required)

The Supabase anon key in this widget is public — anyone can read it in DevTools and query the database with it directly. Client-side code cannot prevent that; Row Level Security in the database is what does. Run [supabase-setup.sql](supabase-setup.sql) in your Supabase SQL editor. It makes every profile row invisible to everyone except its owner, exposes the member counter as a count-only function, and drops the global username uniqueness constraint.

Also set the password policy in Supabase (Auth > Providers > Email) to minimum length 8 with no character requirements, so the server matches the widget.

Invisible setup

```html
<script>
  (function () {
    const t = Date.now();
    const urls = [
      "https://cdn.jsdelivr.net/gh/EldiiarBekbolotov/CrimsonJS@latest/css/crimson.min.css",
      "https://cdn.jsdelivr.net/gh/EldiiarBekbolotov/CrimsonJS@latest/js/crimson.min.js",
    ];

    urls.forEach((url) => {
      const img = new Image();
      img.src = `${url}?t=${t}`;
    });
  })();
</script>
```
