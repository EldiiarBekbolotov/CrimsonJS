# CrimsonJS

[![](https://data.jsdelivr.com/v1/package/gh/eldiiarbekbolotov/crimsonjs/badge)](https://www.jsdelivr.com/package/gh/eldiiarbekbolotov/crimsonjs)

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
