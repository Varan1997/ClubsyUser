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
 *  manifest injection too) so the status bar + bottom nav bar both match. */
function applyThemeColor(theme) {
  const color = THEME_COLORS[theme] ?? THEME_COLORS.dark;
  // Update existing tags or create one if missing
  let tags = document.querySelectorAll('meta[name="theme-color"]');
  if (tags.length === 0) {
    const tag = document.createElement("meta");
    tag.name = "theme-color";
    document.head.appendChild(tag);
    tags = [tag];
  }
  tags.forEach((tag) => tag.setAttribute("content", color));
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
