interface DataErrorProps {
  title: string;
  message?: string;
}

export function DataError({ title, message }: DataErrorProps) {
  return (
    <div className="card border-l-4 border-copper flex items-start gap-3 p-4">
      <span className="inline-block h-2.5 w-2.5 rounded-full mt-1 flex-shrink-0 bg-copper" />
      <div>
        <p className="text-[14px] font-semibold text-moria-black">
          {title}
        </p>
        {message && (
          <p className="text-[13px] mt-0.5 text-moria-dim">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
