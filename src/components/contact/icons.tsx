import type { JSX } from "react";

export type IconName =
  | "phone"
  | "mail"
  | "map-pin"
  | "calendar-clock"
  | "shield-check"
  | "message-circle";

export function ContactIcon({ name }: { name: IconName }): JSX.Element {
  switch (name) {
    case "phone":
      return (
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          height="24"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          viewBox="0 0 24 24"
          width="24"
        >
          <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />
        </svg>
      );
    case "mail":
      return (
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          height="24"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          viewBox="0 0 24 24"
          width="24"
        >
          <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
          <rect height="16" rx={2} width="20" x={2} y={4} />
        </svg>
      );
    case "map-pin":
      return (
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          height="24"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          viewBox="0 0 24 24"
          width="24"
        >
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
          <circle cx={12} cy={10} r={3} />
        </svg>
      );
    case "calendar-clock":
      return (
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          height="24"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          viewBox="0 0 24 24"
          width="24"
        >
          <path d="M16 14v2.2l1.6 1" />
          <path d="M16 2v4" />
          <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" />
          <path d="M3 10h5" />
          <path d="M8 2v4" />
          <circle cx={16} cy={16} r={6} />
        </svg>
      );
    case "shield-check":
      return (
        <svg
          aria-hidden="true"
          className="h-5 w-5"
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
    case "message-circle":
      return (
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          height="24"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          viewBox="0 0 24 24"
          width="24"
        >
          <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
        </svg>
      );
    default:
      return <span className="sr-only">icon</span>;
  }
}
