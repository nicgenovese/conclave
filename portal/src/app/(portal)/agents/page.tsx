export default function AgentsPage() {
  const agents = [
    {
      name: "Durin",
      role: "Market Scribe",
      description:
        "Produces the morning brief — headlines, Polymarket predictions, portfolio snapshot, and risk flags. Scans news for positions we hold and macro events that move markets.",
      schedule: "Every 12 hours",
      cost: "~$0.15 / run",
      status: "active",
      capabilities: [
        "Headline curation from 50+ sources",
        "Polymarket intelligence across 6 categories",
        "Portfolio price refresh via CoinGecko + DeFi Llama",
        "Stop-loss proximity alerts",
        "Governance vote scanning",
      ],
      trigger: '"Durin: brief" or /durin',
    },
    {
      name: "Thorin",
      role: "Protocol Watcher",
      description:
        "Monitors Snapshot governance proposals for every protocol in the portfolio. Scores relevance via keyword matching (fee switches, treasury, emissions, security modules) and surfaces high-impact votes before they close.",
      schedule: "Every 6 hours",
      cost: "~$0.03 / run",
      status: "active",
      capabilities: [
        "Snapshot GraphQL polling across 6 DAO spaces",
        "Keyword-based relevance scoring (high/medium/low)",
        "Live vote tallies with quorum tracking",
        "Days-to-close countdown for active proposals",
        "Zero hallucination — all data fetched directly from Snapshot",
      ],
      trigger: "tsx daily-brief/fetch-governance.ts",
    },
    {
      name: "Balin",
      role: "Risk Sentinel",
      description:
        "Watches every perp position against its stop loss using live CoinGecko prices. Flags concentration breaches, stale data, and (with Etherscan API key) unusual wallet flows. Alerts are prioritized critical → warning → info.",
      schedule: "Every 4 hours",
      cost: "~$0.02 / run",
      status: "active",
      capabilities: [
        "Stop-loss distance via live CoinGecko prices",
        "Position concentration monitoring (30% limit)",
        "Wallet flow detection (with ETHERSCAN_API_KEY)",
        "Stale data detection (>24h portfolio refresh)",
        "Severity-sorted alert stream",
      ],
      trigger: "tsx daily-brief/analyze-risk.ts",
    },
    {
      name: "Gandalf",
      role: "Research Analyst",
      description:
        "The full investment committee — a 4-agent adversarial pipeline that produces scored, 15-page research memos. Analyst builds the bull case, Risk Officer stress-tests, Devil's Advocate attacks, Committee Chair decides.",
      schedule: "On demand",
      cost: "~$3–5 / run",
      status: "active",
      capabilities: [
        "Full DCF + P/E analysis vs TradFi peers",
        "5-category risk scoring (100-point scale)",
        "Probability-weighted scenario analysis",
        "Competitive landscape assessment",
        "Position sizing with tranche conditions",
      ],
      trigger: '"Conclave: analyze [TICKER]"',
    },
  ];

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-moria-black">
          Agents
        </h1>
        <p className="text-moria-dim text-sm mt-1">
          Autonomous research infrastructure — named for the builders of Khazad-dum
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {agents.map((agent) => (
          <div key={agent.name} className="card p-6 flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="font-serif text-xl font-bold text-moria-black">
                    {agent.name}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide ${
                      agent.status === "active"
                        ? "text-moria-pos"
                        : "text-moria-light"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        agent.status === "active"
                          ? "bg-moria-pos"
                          : "bg-moria-light"
                      }`}
                    />
                    {agent.status}
                  </span>
                </div>
                <p className="text-copper text-[11px] font-medium uppercase tracking-wide mt-0.5">
                  {agent.role}
                </p>
              </div>
            </div>

            {/* Description */}
            <p className="font-serif text-[14px] text-moria-body leading-relaxed mb-5">
              {agent.description}
            </p>

            {/* Metadata */}
            <div className="flex gap-6 mb-5 pb-5 border-b border-moria-rule/30">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-moria-light mb-1">
                  Schedule
                </p>
                <p className="font-mono text-[13px] text-moria-black">
                  {agent.schedule}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-moria-light mb-1">
                  Cost
                </p>
                <p className="font-mono text-[13px] text-moria-black">
                  {agent.cost}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-moria-light mb-1">
                  Trigger
                </p>
                <p className="font-mono text-[13px] text-moria-black">
                  {agent.trigger}
                </p>
              </div>
            </div>

            {/* Capabilities */}
            <div className="flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-moria-light mb-3">
                Capabilities
              </p>
              <ul className="space-y-2">
                {agent.capabilities.map((cap, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-[13px] text-moria-dim"
                  >
                    <span className="h-1 w-1 rounded-full bg-copper mt-[7px] flex-shrink-0" />
                    {cap}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Architecture diagram */}
      <div className="card p-6 mt-8">
        <h3 className="text-lg font-semibold text-moria-black mb-4">
          How They Work Together
        </h3>
        <div className="font-mono text-[12px] text-moria-dim leading-relaxed whitespace-pre">
{`  Durin (12h)          Thorin (6h)          Balin (4h)
  Market Scribe        Protocol Watcher     Risk Sentinel
       │                     │                    │
       ▼                     ▼                    ▼
  ┌─────────┐          ┌──────────┐         ┌──────────┐
  │Headlines│          │Governance│         │  Wallet  │
  │Polymarkt│          │  Alerts  │         │  Monitor │
  │Portfolio│          │Fee Switch│         │Stop Loss │
  └────┬────┘          └────┬─────┘         └────┬─────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            ▼
                    ┌───────────────┐
                    │   Dashboard   │
                    │  LP Portal    │
                    └───────┬───────┘
                            │
                     On Demand Only
                            │
                            ▼
                    ┌───────────────┐
                    │   Gandalf     │
                    │  4-Agent      │
                    │  Committee    │
                    └───────────────┘`}
        </div>
      </div>
    </div>
  );
}
