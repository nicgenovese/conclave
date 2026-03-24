import { getMacroData } from "@/lib/data";
import { formatNumber } from "@/lib/utils";

const categoryColor: Record<string, string> = {
  protocol: "bg-blue-500/20 text-blue-400",
  analyst: "bg-purple-500/20 text-purple-400",
  macro: "bg-amber-500/20 text-amber-400",
  "on-chain": "bg-emerald-500/20 text-emerald-400",
};

export default function MacroPage() {
  const data = getMacroData();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Macro Intelligence</h1>
      <p className="text-sm text-[hsl(215,20%,55%)] mb-8">
        Updated {data.updated_at}
      </p>

      {/* Polymarket Section */}
      <h2 className="text-lg font-semibold mt-8 mb-4">Prediction Markets</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.polymarket.map((event) => (
          <div
            key={event.id}
            className="bg-[hsl(222,47%,9%)] border border-[hsl(215,20%,18%)] rounded-lg p-5"
          >
            <span className="text-xs px-2 py-0.5 rounded bg-[hsl(215,20%,16%)] text-[hsl(215,20%,55%)]">
              {event.category}
            </span>
            <p className="font-medium mt-2">{event.question}</p>

            <div className="mt-3 space-y-2">
              {event.outcomes.map((outcome) => (
                <div key={outcome.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{outcome.name}</span>
                    <span className="font-mono">
                      {(outcome.probability * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[hsl(215,20%,16%)] w-full">
                    <div
                      className={`h-2 rounded-full ${
                        outcome.probability > 0.5
                          ? "bg-emerald-500"
                          : "bg-red-400"
                      }`}
                      style={{ width: `${outcome.probability * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-[hsl(215,20%,55%)] mt-3">
              <span>Volume: {formatNumber(event.volume_usd)}</span>
              <span>Ends: {event.end_date}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Signals Section */}
      <h2 className="text-lg font-semibold mt-8 mb-4">Signal Feed</h2>
      <div>
        {data.signals.map((signal, i) => (
          <div
            key={i}
            className="bg-[hsl(222,47%,9%)] border border-[hsl(215,20%,18%)] rounded-lg p-4 mb-3"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{signal.account}</span>
              <span className="text-[hsl(215,20%,55%)]">@{signal.handle}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  categoryColor[signal.category] ?? "bg-gray-500/20 text-gray-400"
                }`}
              >
                {signal.category}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed">{signal.text}</p>
            <p className="text-xs text-[hsl(215,20%,55%)] mt-2">
              {signal.timestamp}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
