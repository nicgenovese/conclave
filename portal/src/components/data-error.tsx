interface DataErrorProps {
  title: string;
  message?: string;
}

export function DataError({ title, message }: DataErrorProps) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-6 my-4">
      <div className="flex items-start gap-3">
        <svg
          className="h-6 w-6 text-amber-400 flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <div>
          <h3 className="text-base font-semibold text-amber-400">{title}</h3>
          {message && (
            <p className="text-sm text-amber-300/70 mt-1">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
