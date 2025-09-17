export function Address({ value }: { value?: string | null }) {
  if (!value) return null;
  const normalized = value.toString();
  return (
    <span className="font-mono text-sm break-all" title={normalized}>
      {normalized.slice(0, 8)}…{normalized.slice(-6)}
    </span>
  );
}
