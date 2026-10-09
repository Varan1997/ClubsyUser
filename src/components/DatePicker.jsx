import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { toInputDate, formatDate } from "../utils/format.js";

// Themed date picker. `value` and `onChange` use yyyy-mm-dd strings
// so it drops in for a native <input type="date">.
// Pass inline={true} to render the calendar inline (no popover) — useful
// inside modals where an absolute popover would get clipped.
export default function DatePicker({ value, onChange, placeholder = "Select date", inline = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selected = value ? new Date(value + "T00:00:00") : undefined;

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open && !inline) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, inline]);

  function handleSelect(date) {
    if (date) {
      onChange(toInputDate(date));
      if (!inline) setOpen(false);
    }
  }

  if (inline) {
    // Inline mode: always show the calendar below the trigger, no popover clipping
    return (
      <div className="datepicker datepicker-inline" ref={ref}>
        <button
          type="button"
          className="dp-trigger open"
          onClick={() => {}}
          style={{ cursor: "default" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4.5" width="18" height="16" rx="2" />
            <path d="M3 9h18M8 2.5v4M16 2.5v4" />
          </svg>
          <span className={value ? "dp-value" : "dp-placeholder"}>
            {value ? formatDate(value) : placeholder}
          </span>
        </button>
        <div className="dp-inline-calendar">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected}
            showOutsideDays
          />
        </div>
      </div>
    );
  }

  return (
    <div className="datepicker" ref={ref}>
      <button
        type="button"
        className={`dp-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4.5" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 2.5v4M16 2.5v4" />
        </svg>
        <span className={value ? "dp-value" : "dp-placeholder"}>
          {value ? formatDate(value) : placeholder}
        </span>
      </button>

      {open && (
        <div className="dp-popover">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected}
            showOutsideDays
          />
        </div>
      )}
    </div>
  );
}
