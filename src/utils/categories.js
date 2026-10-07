// Business categories shown on the landing page and used across the app.
export const CATEGORIES = [
  { type: "Gym", emoji: "🏋️", tagline: "Fitness & strength memberships" },
  { type: "Yoga", emoji: "🧘", tagline: "Classes, batches & passes" },
  { type: "Swimming", emoji: "🏊", tagline: "Pool & coaching memberships" },
  { type: "Tuition", emoji: "📚", tagline: "Education & coaching centres" },
  { type: "Sports", emoji: "🏸", tagline: "Academies & training" },
];

// All selectable types for the create/edit form (includes a catch-all).
export const CENTER_TYPES = [...CATEGORIES.map((c) => c.type), "Other"];

export const CATEGORY_EMOJI = CATEGORIES.reduce((acc, c) => {
  acc[c.type] = c.emoji;
  return acc;
}, {});
