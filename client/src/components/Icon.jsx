const shapes = {
   menu: <path d="M4 6h16M4 12h16M4 18h16" />,
   grid: (
      <>
         <rect x="3.5" y="3.5" width="7" height="7" rx="1.4" />
         <rect x="13.5" y="3.5" width="7" height="7" rx="1.4" />
         <rect x="3.5" y="13.5" width="7" height="7" rx="1.4" />
         <rect x="13.5" y="13.5" width="7" height="7" rx="1.4" />
      </>
   ),
   calendar: (
      <>
         <rect x="3.5" y="5" width="17" height="16" rx="2" />
         <path d="M8 3v4M16 3v4M4 10h16" />
      </>
   ),
   clock: (
      <>
         <circle cx="12" cy="12" r="9" />
         <path d="M12 7v5l3 2" />
      </>
   ),
   folder: (
      <>
         <path d="M3.5 6.5h6l2 2h9v10a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-12Z" />
         <path d="M3.5 9V5a2 2 0 0 1 2-2h4l2 2" />
      </>
   ),
   upload: (
      <>
         <path d="M12 15V4m0 0L8 8m4-4 4 4M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
      </>
   ),
   download: (
      <>
         <path d="M12 4v11m0 0 4-4m-4 4-4-4M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      </>
   ),
   bell: (
      <>
         <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </>
   ),
   pin: (
      <>
         <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
         <circle cx="12" cy="10" r="2" />
      </>
   ),
   plus: (
      <>
         <path d="M12 5v14M5 12h14" />
      </>
   ),
   info: (
      <>
         <circle cx="12" cy="12" r="9" />
         <path d="M12 11v5M12 8h.01" />
      </>
   ),
   'circle-help': (
      <>
         <circle cx="12" cy="12" r="9" />
         <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
         <path d="M12 17h.01" />
      </>
   ),
   alert: (
      <>
         <path d="m12 3 9 17H3l9-17Z" />
         <path d="M12 9v4m0 3h.01" />
      </>
   ),
   'file-check': (
      <>
         <path d="M6 3h8l5 5v13H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
         <path d="M14 3v5h5m-10 6 2.2 2.2L16 12" />
      </>
   ),
   scale: (
      <>
         <path d="M12 3v18M5 6h14M7 6 3.5 12h7L7 6Zm10 0-3.5 6h7L17 6ZM8 21h8" />
      </>
   ),
   search: (
      <>
         <circle cx="10.8" cy="10.8" r="6.8" />
         <path d="m16 16 4 4" />
      </>
   ),
   user: (
      <>
         <circle cx="12" cy="8" r="3.5" />
         <path d="M5 20a7 7 0 0 1 14 0" />
      </>
   ),
   receipt: (
      <>
         <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
         <path d="M9 8h6M9 12h6" />
      </>
   ),
   timer: (
      <>
         <circle cx="12" cy="13" r="8" />
         <path d="M12 9v4l2.5 1.5M9 2h6M12 2v3" />
      </>
   ),
   sun: (
      <>
         <circle cx="12" cy="12" r="4" />
         <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
      </>
   ),
   moon: <path d="M20.5 15.5A9 9 0 0 1 8.5 3.5 9 9 0 1 0 20.5 15.5Z" />,
   check: <path d="m5 12 4 4L19 6" />,
   close: <path d="m6 6 12 12M18 6 6 18" />,
   lock: (
      <>
         <rect x="5" y="10" width="14" height="11" rx="2" />
         <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" />
      </>
   ),
   settings: (
      <>
         <circle cx="12" cy="12" r="3" />
         <path d="M10 2h4l.6 3.1a7 7 0 0 1 1.8 1l2.9-1.2 2 3.5-2.3 2a7 7 0 0 1 0 2l2.3 2-2 3.5-2.9-1.2a7 7 0 0 1-1.8 1L14 22h-4l-.6-3.1a7 7 0 0 1-1.8-1l-2.9 1.2-2-3.5 2.3-2a7 7 0 0 1 0-2l-2.3-2 2-3.5 2.9 1.2a7 7 0 0 1 1.8-1L10 2Z" />
      </>
   ),
   'chevron-left': <path d="m15 5-7 7 7 7" />,
   'chevron-right': <path d="m9 5 7 7-7 7" />,
   'chevron-down': <path d="m7 10 5 5 5-5" />,
   signout: (
      <>
         <path d="M10 17l5-5-5-5M15 12H3" />
         <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
      </>
   ),
};

function Icon({ name, className }) {
   return (
      <svg
         className={className}
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         strokeWidth="1.8"
         strokeLinecap="round"
         strokeLinejoin="round"
         aria-hidden="true">
         {shapes[name]}
      </svg>
   );
}

export default Icon;
