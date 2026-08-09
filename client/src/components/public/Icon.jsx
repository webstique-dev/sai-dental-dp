// Lightweight inline SVG icon set for the public website.
// No icon library dependency — small, server-friendly and themeable.

const paths = {
  stethoscope: (
    <>
      <path d="M4 5v6a7 7 0 0 0 14 0V5" />
      <path d="M4 5h2M18 5h2M5 3h.01M11 3h.01M17 3h.01" />
      <path d="M11 5a3 3 0 0 1 6 0v1" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v6c0 4.5-3 8.5-7 9-4-.5-7-4.5-7-9V6l7-3z" />
      <path d="M9.5 12l2 2 3-3.5" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
    </>
  ),
  rootCanal: (
    <>
      <circle cx="12" cy="9" r="7" />
      <path d="M12 9a3 3 0 0 1 3-3" />
      <path d="M9.5 14.5L8 20h8l-1.5-5.5" />
      <path d="M9.5 14.5l1 5M14.5 14.5l-1 5" />
    </>
  ),
  implant: (
    <>
      <path d="M12 4v10" />
      <path d="M10.5 15.5h3l1.5 2.5a2 2 0 0 0-3 2l1.5 2H10.5" />
      <circle cx="12" cy="4" r="2" />
      <path d="M9 8a3.2 3.2 0 0 0 6 0" />
    </>
  ),
  crown: (
    <>
      <path d="M4 5l2.5 3.5L12 4.5l5.5 4L20 5l-1 12H5L4 5z" />
      <path d="M7 21h10M7 17h10" />
    </>
  ),
  whitening: (
    <>
      <path d="M12 4a4 4 0 0 0-4 4c0 2.5 1 3.5 1 5v5h6v-5c0-1.5 1-2.5 1-5a4 4 0 0 0-4-4z" />
      <path d="M9 22h6M10 12h4M10 14.5h4" />
    </>
  ),
  braces: (
    <>
      <path d="M5 6v10" />
      <path d="M19 6v10" />
      <path d="M5 7a7 7 0 0 0 7-3 7 7 0 0 0 7 3" />
      <path d="M7 7a9 9 0 0 0 2 3M17 7a9 9 0 0 1-2 3" />
    </>
  ),
  child: (
    <>
      <circle cx="12" cy="13" r="6.5" />
      <path d="M12 16.5l3.5-6.5H8.5L12 16.5z" />
      <circle cx="10" cy="12.2" r="0.4" />
      <circle cx="14" cy="12.2" r="0.4" />
    </>
  ),
  surgery: (
    <>
      <path d="M7 7l9 9-4.5 4.5L2.5 11.5 7 7z" />
      <path d="M7 7l2-2M14 14l5.5 5.5M11.5 11.5l3-3" />
    </>
  ),
  denture: (
    <>
      <path d="M3 12c0-3 2-5.5 4.5-5.5.8 0 1.5.3 2 .8.5-.5 1.2-.8 2-.8 1 0 1.9.5 2.5 1.3.6-.8 1.5-1.3 2.5-1.3 2.5 0 4.5 2.5 4.5 5.5 0 4-3.5 7-8 7s-8-3-8-7z" />
      <path d="M3 9.5a8 8 0 0 0 8 2.5 8 8 0 0 0 8-2.5" />
    </>
  ),
  gum: (
    <>
      <path d="M4 9c0-3 1.8-5 4-5 1.3 0 2.2.6 3 1.5.5-.5 1.2-.8 2-.8 3.4 0 3.5 3.4 3.5 4.6 0 4.5-2.8 9.7-4.5 10.7-1.7-1-4.5-6.2-4.5-10.7 0-.5 0-1 .5-1.3" />
      <path d="M4 9c0 4.5 3 9.5 4 10.5" />
    </>
  ),
  trust: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21c0-3.5 3-6 7-6s7 2.5 7 6" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="14" rx="2.5" />
      <path d="M3 10h18" />
      <circle cx="17" cy="15.5" r="1" />
    </>
  ),
  xray: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 4v16M4 12h16" />
    </>
  ),
  sterile: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" />
    </>
  ),
  chair: (
    <>
      <path d="M5 21v-6a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v6" />
      <path d="M5 18h14" />
      <path d="M5 13h14M8 6h8" />
    </>
  ),
  parking: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="3" />
      <path d="M9 17V7h3.5a2.5 2.5 0 0 1 0 5H9" />
    </>
  ),
  phone: (
    <path d="M5 4h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3 7.5l9 6 9-6" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  check: <path d="M4.5 12.5l5 5 10-11" />,
  star: (
    <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.8L12 3.5z" />
  ),
  whatsapp: (
    <>
      <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3z" />
      <path d="M8.7 8.5c.3 2.3 1.8 4 4 4.6l1.4-1.4 2.1.7c-.4 1.4-1.7 2.6-3.2 2.5-2.8-.2-4.9-2.3-5.2-5.2L9 7.3l2 .8-2.3 1.4v-1z" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  chevron: <path d="M6 9l6 6 6-6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  quote: <path d="M9 7c-2.5 0-4.5 2-4.5 4.5S6.5 16 9 16c.5 0 1 0 1.5-.2C9.8 13.5 9 12 8.5 11M15 7c-2.5 0-4.5 2-4.5 4.5S12.5 16 15 16c.5 0 1 0 1.5-.2-1.2-2.3-2-3.8-2.5-4.8" />,
  tooth: (
    <>
      <path d="M12 4c-3 0-5-2.5-5 0 0 2-1 3.5-1 6 0 4 1 8.5 3 8.5 1 0 1-2 3-2s2 2 3 2c2 0 3-4.5 3-8.5 0-2.5-1-4-1-6 0-2.5-2 0-5 0z" />
      <path d="M9.5 5.5c1 0 2 3 2.5 5" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3l1.8 4.7L18 9.5l-4.2 1.8L12 16l-1.8-4.7L6 9.5l4.2-1.8L12 3z" />
      <path d="M18.5 14l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3z" />
    </>
  ),
}

export default function Icon({ name, size = 24, strokeWidth = 1.7, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name] || null}
    </svg>
  )
}