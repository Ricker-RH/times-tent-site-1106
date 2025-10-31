import type { ReactNode } from "react";

interface PlaceholderPageProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function PlaceholderPage({ title, description, children }: PlaceholderPageProps) {
  return (
    <div className="bg-white pb-20 pt-10">
      <div className="mx-auto w-full max-w-[1200px] px-4 text-center sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-[var(--color-brand-secondary)]">{title}</h1>
        {description ? (
          <p className="mt-4 text-sm text-[var(--color-text-secondary)]">{description}</p>
        ) : null}
        {children ? <div className="mt-6 text-left text-sm text-[var(--color-text-secondary)]">{children}</div> : null}
      </div>
    </div>
  );
}
