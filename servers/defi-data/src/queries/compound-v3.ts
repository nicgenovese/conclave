export const COMPOUND_QUERIES = {
  GET_MARKETS: `
    query GetMarkets {
      markets {
        id
        cometProxy
        protocol {
          id
          name
        }
        inputToken {
          id
          symbol
          name
          decimals
          lastPriceUSD
        }
        totalValueLockedUSD
        totalDepositBalanceUSD
        totalBorrowBalanceUSD
        inputTokenBalance
        inputTokenPriceUSD
        rates {
          rate
          side
          type
        }
        rewardTokens {
          token {
            symbol
            decimals
          }
          type
        }
      }
    }
  `,

  GET_MARKET_BY_ID: `
    query GetMarketById($id: String!) {
      market(id: $id) {
        id
        cometProxy
        protocol {
          id
          name
        }
        inputToken {
          id
          symbol
          name
          decimals
          lastPriceUSD
        }
        totalValueLockedUSD
        totalDepositBalanceUSD
        totalBorrowBalanceUSD
        inputTokenBalance
        inputTokenPriceUSD
        rates {
          rate
          side
          type
        }
      }
    }
  `,

  GET_ACCOUNT_POSITIONS: `
    query GetAccountPositions($account: String!) {
      accounts(where: { id_contains: $account }) {
        id
        positionCount
        depositCount
        withdrawCount
        borrowCount
        repayCount
        liquidationCount
        positions {
          id
          hashOpened
          balance
          side
          isCollateral
          asset {
            symbol
            decimals
            lastPriceUSD
          }
          market {
            id
            inputToken {
              symbol
            }
          }
        }
      }
    }
  `,

  GET_MARKET_SNAPSHOTS: `
    query GetMarketSnapshots($market: String!, $first: Int = 100) {
      marketDailySnapshots(
        first: $first
        where: { market: $market }
        orderBy: timestamp
        orderDirection: desc
      ) {
        id
        timestamp
        totalValueLockedUSD
        totalDepositBalanceUSD
        totalBorrowBalanceUSD
        rates {
          rate
          side
          type
        }
        dailySupplySideRevenueUSD
        dailyProtocolSideRevenueUSD
        dailyTotalRevenueUSD
      }
    }
  `,

  GET_PROTOCOL_DATA: `
    query GetProtocolData {
      lendingProtocols {
        id
        name
        totalValueLockedUSD
        totalDepositBalanceUSD
        totalBorrowBalanceUSD
        cumulativeSupplySideRevenueUSD
        cumulativeProtocolSideRevenueUSD
        cumulativeTotalRevenueUSD
      }
    }
  `
};
