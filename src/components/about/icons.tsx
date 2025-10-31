import type { JSX } from "react";

export type AboutIconName = "sparkles" | "shield-check" | "clock-3" | "globe-2";

export function AboutIcon({ name }: { name: AboutIconName }): JSX.Element {
  switch (name) {
    case "sparkles":
      return (
        <svg
          aria-hidden="true"
          className="h-7 w-7"
          fill="none"
          height="24"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          viewBox="0 0 24 24"
          width="24"
        >
          <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051A2 2 0 0 0 10 8.372z" />
          <path d="M20 2v4" />
          <path d="M22 4h-4" />
          <circle cx={4} cy={20} r={2} />
        </svg>
      );
    case "shield-check":
      return (
        <svg
          aria-hidden="true"
          className="h-7 w-7"
          fill="none"
          height="24"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          viewBox="0 0 24 24"
          width="24"
        >
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "clock-3":
      return (
        <svg
          aria-hidden="true"
          className="h-7 w-7"
          fill="none"
          height="24"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          viewBox="0 0 24 24"
          width="24"
        >
          <circle cx={12} cy={12} r={10} />
          <path d="M12 6v6l3 3" />
        </svg>
      );
    case "globe-2":
      return (
        <svg
          aria-hidden="true"
          className="h-7 w-7"
          fill="none"
          height="24"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          viewBox="0 0 24 24"
          width="24"
        >
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
          <path d="M12 2a15.3 15.3 0 0 0-4 10 15.3 15.3 0 0 0 4 10 15.3 15.3 0 0 0 4-10 15.3 15.3 0 0 0-4-10Z" />
        </svg>
      );
    default:
      return <span className="sr-only">icon</span>;
  }
}
