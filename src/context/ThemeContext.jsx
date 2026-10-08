import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

// The colour shown in the OS status bar and bottom nav strip.
// Must match the CSS --bg token for each theme so the system UI blends in.
const THEME_COLORS = {
  dark:  "#0a0e1a",
  light: "#faf8f3",
};

function getInitialTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  // Respect the OS preference on first visit.
  if (window.matchMedia?.("(prefers-color-scheme: light)").matches) return "light";
  return "dark";
}

/** Update every <meta name="theme-color"> tag (there may be one from the PWA
 *  manifest injection too) so the status bar + bottom nav bar both match.
 *  Also updates <meta name="color-scheme"> and the html element's
 *  color-scheme style — this is what fixes the Android bottom nav bar. */
function applyThemeColor(theme) {
  const bgColor = THEME_COLORS[theme] ?? THEME_COLORS.dark;
  const colorScheme = theme === "light" ? "light" : "dark";

  // 1. theme-color meta — controls status bar tint on Chrome/Samsung
  let tags = document.querySelectorAll('meta[name="theme-color"]');
  if (tags.length === 0) {
    const tag = document.createElement("meta");
    tag.name = "theme-color";
    document.head.appendChild(tag);
    tags = [tag];
  }
  tags.forEach((tag) => {
    tag.removeAttribute("media"); // collapse any media-query variants
    tag.setAttribute("content", bgColor);
  });

  // 2. color-scheme meta — tells Android system UI (bottom nav bar, scrollbars)
  //    which mode is active; without this the bottom bar stays gray/white
  let cs = document.querySelector('meta[name="color-scheme"]');
  if (!cs) {
    cs = document.createElement("meta");
    cs.name = "color-scheme";
    document.head.appendChild(cs);
  }
  cs.setAttribute("content", colorScheme);

  // 3. html element color-scheme property — reinforces at the CSS layer
  document.documentElement.style.colorScheme = colorScheme;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    applyThemeColor(theme);
  }, [theme]);

  // Apply immediately on first paint (before React hydration) too
  useEffect(() => { applyThemeColor(theme); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
