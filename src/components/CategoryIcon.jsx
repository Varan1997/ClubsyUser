// Premium line-style icons for each business category.
const ICONS = {
  Gym: (
    // Dumbbell
    <>
      <path d="M4 9v6M7 7.5v9M17 7.5v9M20 9v6M7 12h10" />
    </>
  ),
  Yoga: (
    // Lotus / meditation figure
    <>
      <circle cx="12" cy="5" r="1.8" />
      <path d="M12 7v4" />
      <path d="M12 11c-2.2 0-4 1.3-4 3.2 0 1 .8 1.8 1.8 1.8h4.4c1 0 1.8-.8 1.8-1.8 0-1.9-1.8-3.2-4-3.2z" />
      <path d="M8 16c-2.2.4-4 1.5-4 2.6M16 16c2.2.4 4 1.5 4 2.6" />
    </>
  ),
  Swimming: (
    // Swimmer with water line
    <>
      <circle cx="17" cy="6.5" r="1.6" />
      <path d="M4 11l4.5-2L12 11l3-1.8" />
      <path d="M8.5 9l3.5 2.4" />
      <path d="M3 16.5c1.3 0 1.3 1 2.6 1s1.3-1 2.6-1 1.3 1 2.6 1 1.3-1 2.6-1 1.3 1 2.6 1 1.3-1 2.6-1" />
      <path d="M3 19.5c1.3 0 1.3 1 2.6 1s1.3-1 2.6-1 1.3 1 2.6 1 1.3-1 2.6-1 1.3 1 2.6 1 1.3-1 2.6-1" />
    </>
  ),
  Tuition: (
    // Graduation cap
    <>
      <path d="M12 4L2.5 8 12 12l9.5-4L12 4z" />
      <path d="M6 10.3v3.4c0 1.1 2.7 2.3 6 2.3s6-1.2 6-2.3v-3.4" />
      <path d="M21.5 8.2v4.3" />
    </>
  ),
  Sports: (
    // Trophy
    <>
      <path d="M7.5 4h9v3.5a4.5 4.5 0 0 1-9 0V4z" />
      <path d="M7.5 5.5H5v.8a2.7 2.7 0 0 0 2.7 2.7M16.5 5.5H19v.8a2.7 2.7 0 0 1-2.7 2.7" />
      <path d="M12 12v3M9.5 19.5h5M10.3 19.5c0-1.3.4-2.2 1.7-2.2s1.7.9 1.7 2.2" />
    </>
  ),
  Other: (
    // Grid / apps
    <>
      <rect x="4.5" y="4.5" width="6" height="6" rx="1.4" />
      <rect x="13.5" y="4.5" width="6" height="6" rx="1.4" />
      <rect x="4.5" y="13.5" width="6" height="6" rx="1.4" />
      <rect x="13.5" y="13.5" width="6" height="6" rx="1.4" />
    </>
  ),
};

export default function CategoryIcon({ type, className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[type] || ICONS.Other}
    </svg>
  );
}
