# Conclave On-Chain MCP Server

A Model Context Protocol (MCP) server providing on-chain analytics for the Conclave AI investment committee. This server enables AI agents to query wallet profiles, exchange flows, whale transactions, and TVL history across multiple EVM chains.

## Features

- **4 specialized tools** for on-chain data analysis
- **Multi-chain support**: Ethereum, Arbitrum, Optimism, Polygon, Base, Avalanche, BSC
- **Multiple data sources**: Dune Analytics, DefiLlama, Etherscan
- **Built-in caching** to minimize API calls
- **Rate limiting** with automatic backoff

## Installation

```bash
cd servers/onchain
npm install
npm run build
```

## Configuration

### API Keys

Create a `.env` file or set environment variables:

```bash
# Required for wallet/flow/whale tools
DUNE_API_KEY=your_dune_api_key

# Optional, for supplementary data
ETHERSCAN_API_KEY=your_etherscan_api_key
```

Get your API keys:
- Dune Analytics: https://dune.com/settings/api
- Etherscan: https://etherscan.io/apis

### MCP Integration

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "onchain": {
      "type": "stdio",
      "command": "node",
      "args": ["./servers/onchain/dist/index.js"],
      "env": {
        "DUNE_API_KEY": "your_key",
        "ETHERSCAN_API_KEY": "your_key"
      }
    }
  }
}
```

## Available Tools

### 1. `onchain_get_tvl_history`

Get historical TVL data and chain distribution for a protocol.

**Input:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `protocol` | string | Yes | - | DefiLlama protocol slug (e.g., "aave", "uniswap") |
| `period` | string | No | "30d" | Time period: "7d", "30d", "90d", "1y" |

**Output:**
- Current TVL in USD
- TVL changes (7d, 30d, 90d percentages)
- Chain distribution breakdown
- Historical TVL data points
- Liquidity health rating (Deep/Adequate/Shallow/Critical)

**Data Source:** DefiLlama (free, no API key required)

---

### 2. `onchain_get_wallet_profile`

Get holder analysis and concentration metrics for a token.

**Input:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `tokenAddress` | string | Yes | - | ERC-20 token contract address |
| `chain` | string | No | "ethereum" | Target blockchain |
| `limit` | number | No | 100 | Number of top holders (10-100) |

**Output:**
- Total holder count
- Top holders with labels (Exchange, Fund/VC, Team, etc.)
- Concentration metrics (top 10%, 25%, 50%)
- Holder trend (Accumulating/Stable/Distributing)
- Smart money holdings summary

**Data Source:** Dune Analytics Echo API

---

### 3. `onchain_get_exchange_flows`

Get exchange deposit/withdrawal patterns for a token.

**Input:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `tokenAddress` | string | Yes | - | ERC-20 token contract address |
| `chain` | string | No | "ethereum" | Target blockchain |
| `period` | string | No | "30d" | Time period: "7d" or "30d" |

**Output:**
- Net flow summary (inflow, outflow, netflow in USD)
- Flow signal (Bullish/Neutral/Bearish)
- Daily flow breakdown
- Per-exchange breakdown (Binance, Coinbase, Kraken, etc.)

**Data Source:** Dune Analytics Echo API

---

### 4. `onchain_get_whale_transactions`

Monitor large transactions for a token.

**Input:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `tokenAddress` | string | Yes | - | ERC-20 token contract address |
| `chain` | string | No | "ethereum" | Target blockchain |
| `minValueUsd` | number | No | 100000 | Minimum transaction value in USD |
| `period` | string | No | "7d" | Time period: "24h", "7d", "30d" |
| `limit` | number | No | 100 | Max transactions to return (10-500) |

**Output:**
- List of large transactions with:
  - Transaction hash and timestamp
  - From/to addresses with labels
  - Value in tokens and USD
  - Transaction type (Transfer, ExchangeDeposit, ExchangeWithdrawal)
- Statistics (total volume, average size, largest transaction)

**Data Source:** Dune Analytics Echo API

## Supported Chains

| Chain | Chain ID |
|-------|----------|
| Ethereum | 1 |
| Arbitrum | 42161 |
| Optimism | 10 |
| Polygon | 137 |
| Base | 8453 |
| Avalanche | 43114 |
| BSC | 56 |

## Testing

### List available tools:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  DUNE_API_KEY=your_key node dist/index.js
```

### Test TVL tool (no API key needed):

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"onchain_get_tvl_history","arguments":{"protocol":"aave","period":"30d"}}}' | \
  node dist/index.js
```

### Test with Dune API:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"onchain_get_wallet_profile","arguments":{"tokenAddress":"0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9","chain":"ethereum"}}}' | \
  DUNE_API_KEY=your_key node dist/index.js
```

## Architecture

```
src/
├── index.ts              # Entry point (stdio transport)
├── server.ts             # MCP server and tool registration
├── clients/
│   ├── dune.ts           # Dune Analytics Echo API client
│   ├── etherscan.ts      # Etherscan API client
│   └── defillama.ts      # DefiLlama API client
├── tools/
│   ├── walletProfile.ts  # Holder analysis tool
│   ├── exchangeFlows.ts  # Exchange flow analysis tool
│   ├── whaleTransactions.ts # Large transaction monitoring
│   └── tvlHistory.ts     # TVL history tool
├── utils/
│   ├── rateLimiter.ts    # Rate limiting with backoff
│   └── cache.ts          # In-memory TTL cache
└── types/
    └── index.ts          # TypeScript types and Zod schemas
```

## Rate Limits

| Source | Requests/min | Cache TTL |
|--------|--------------|-----------|
| Dune Analytics | 40 | 2-5 min |
| Etherscan | 5 | 5 min |
| DefiLlama | 60 | 10 min |

## Development

```bash
# Run in development mode (TypeScript directly)
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## License

Part of the Conclave project. See root LICENSE file.
