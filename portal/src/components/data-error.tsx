interface DataErrorProps {
  title: string;
  message?: string;
}

export function DataError({ title, message }: DataErrorProps) {
  return (
    <div className="flex items-start gap-3 py-6">
      <span
        className="inline-block h-1.5 w-1.5 rounded-full mt-2 flex-shrink-0"
        style={{ background: "var(--copper)" }}
      />
      <div>
        <p className="font-serif text-[14px] font-semibold" style={{ color: "var(--black)" }}>
          {title}
        </p>
        {message && (
          <p className="font-serif text-[13px] mt-0.5" style={{ color: "var(--dim)" }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
