import type { ReactNode } from "react";

export function Section({
  title,
  children,
  right,
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className="rounded-2xl shadow p-4 bg-white border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}
