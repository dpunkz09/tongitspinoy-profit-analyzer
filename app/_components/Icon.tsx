const PATHS = {
  upload: ['M12 16V4m0 0 4 4m-4-4L8 8', 'M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3'],
  download: ['M12 4v12m0 0 4-4m-4 4-4-4', 'M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3'],
  search: ['M4.500 11a6.500 6.500 0 1 0 13 0a6.500 6.500 0 1 0 -13 0', 'm20 20-4-4'],
  overview: ['M3.5 3.5h7v7h-7zM13.5 3.5h7v7h-7zM3.5 13.5h7v7h-7zM13.5 13.5h7v7h-7z'],
  table: ['M3.5 4.5h17v15h-17z', 'M3.5 10h17M9.5 10v9.5'],
  cards: ['M4 4.5h16v6H4zM4 13.5h16v6H4z'],
  columns: ['M4 4.5h16v15H4z', 'M9.5 4.5v15M14.5 4.5v15'],
  alert: ['M12 4 2.5 20h19L12 4Z', 'M12 10v4m0 3h.01'],
  file: ['M6 3h8l4 4v14H6z', 'M14 3v4h4'],
  x: ['m6 6 12 12M18 6 6 18'],
  trash: ['M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13'],
  sort: ['m8 9 4-4 4 4M8 15l4 4 4-4'],
  'sort-asc': ['m7 14 5-5 5 5'],
  'sort-desc': ['m7 10 5 5 5-5'],
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
