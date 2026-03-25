interface DataErrorProps {
  title: string;
  message?: string;
}

export function DataError({ title, message }: DataErrorProps) {
  return (
    <div className="flex items-start gap-3 py-6">
      <svg
        className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        />
      </svg>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {message && (
          <p className="text-sm text-muted-foreground mt-0.5">{message}</p>
        )}
      </div>
    </div>
  );
}
