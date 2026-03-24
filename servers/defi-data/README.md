# Conclave DeFi Data MCP Server

MCP server providing DeFi analytics tools for the Conclave investment committee.

## Tools

| Tool | Description | Data Source |
|------|-------------|-------------|
| `defi_get_token_metrics` | Token supply, market cap, FDV, price, ATH metrics | CoinGecko |
| `defi_get_protocol_metrics` | TVL history, chain distribution, liquidity health | DefiLlama |
| `defi_get_protocol_revenue` | Fee revenue, value capture rating, trends | DefiLlama |
| `defi_get_volatility` | Price volatility, max drawdown, risk rating | CoinGecko |

## Setup

```bash
cd servers/defi-data
npm install
npm run build
```

## Usage

### As MCP Server (stdio)

```bash
node dist/index.js
```

### Development

```bash
npm run dev     # Run with tsx
npm test        # Run tests
npm run build   # Compile TypeScript
```

## Environment Variables

All optional - the server works with free API tiers by default:

```bash
COINGECKO_API_KEY=        # Increases rate limit from 30 to 500 req/min
DEFILLAMA_PRO_API_KEY=    # Enables yields/staking data
TOKENOMIST_API_KEY=       # Enables emissions/unlock data
TOKENTERMINAL_API_KEY=    # Enhanced revenue data
```

## Example Tool Calls

### Get Token Metrics
```json
{
  "method": "tools/call",
  "params": {
    "name": "defi_get_token_metrics",
    "arguments": { "tokenId": "aave" }
  }
}
```

### Get Protocol Metrics
```json
{
  "method": "tools/call",
  "params": {
    "name": "defi_get_protocol_metrics",
    "arguments": { "protocol": "aave" }
  }
}
```

### Get Protocol Revenue
```json
{
  "method": "tools/call",
  "params": {
    "name": "defi_get_protocol_revenue",
    "arguments": { "protocol": "uniswap", "period": "30d" }
  }
}
```

### Get Volatility
```json
{
  "method": "tools/call",
  "params": {
    "name": "defi_get_volatility",
    "arguments": { "tokenId": "ethereum", "period": "30d" }
  }
}
```

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

## Architecture

```
src/
├── index.ts          # Entry point (stdio transport)
├── server.ts         # MCP server + tool registration
├── types/            # Zod schemas + TypeScript types
├── utils/            # Rate limiter, cache
├── clients/          # API clients (CoinGecko, DefiLlama)
└── tools/            # Tool handlers
```
