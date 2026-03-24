export const AAVE_QUERIES = {
  GET_RESERVES: `
    query GetReserves($first: Int = 50) {
      reserves(first: $first, where: { isActive: true }) {
        id
        symbol
        name
        decimals
        underlyingAsset
        totalLiquidity
        availableLiquidity
        totalScaledVariableDebt
        totalPrincipalStableDebt
        liquidityRate
        variableBorrowRate
        stableBorrowRate
        utilizationRate
        baseLTVasCollateral
        reserveLiquidationThreshold
        reserveLiquidationBonus
        price {
          priceInEth
          oracle {
            usdPriceEth
          }
        }
        aToken {
          id
        }
      }
    }
  `,

  GET_RESERVE_BY_SYMBOL: `
    query GetReserveBySymbol($symbol: String!) {
      reserves(where: { symbol: $symbol, isActive: true }) {
        id
        symbol
        name
        decimals
        underlyingAsset
        totalLiquidity
        availableLiquidity
        totalScaledVariableDebt
        totalPrincipalStableDebt
        liquidityRate
        variableBorrowRate
        stableBorrowRate
        utilizationRate
        baseLTVasCollateral
        reserveLiquidationThreshold
        reserveLiquidationBonus
        price {
          priceInEth
          oracle {
            usdPriceEth
          }
        }
      }
    }
  `,

  GET_USER_POSITIONS: `
    query GetUserPositions($user: String!) {
      userReserves(where: { user: $user }) {
        id
        reserve {
          symbol
          name
          decimals
          price {
            priceInEth
            oracle {
              usdPriceEth
            }
          }
        }
        currentATokenBalance
        scaledATokenBalance
        currentVariableDebt
        scaledVariableDebt
        currentStableDebt
        principalStableDebt
        usageAsCollateralEnabledOnUser
        liquidityRate
        variableBorrowRate
        stableBorrowRate
      }
      user(id: $user) {
        id
        borrowedReservesCount
        lifetimeRewards
      }
    }
  `,

  GET_RATE_HISTORY: `
    query GetRateHistory($reserve: String!, $first: Int = 100) {
      reserveParamsHistoryItems(
        first: $first
        where: { reserve: $reserve }
        orderBy: timestamp
        orderDirection: desc
      ) {
        id
        timestamp
        liquidityRate
        variableBorrowRate
        stableBorrowRate
        utilizationRate
        totalLiquidity
        availableLiquidity
      }
    }
  `,

  GET_PROTOCOL_DATA: `
    query GetProtocolData {
      protocol(id: "1") {
        id
        totalValueLockedUSD
        totalDepositBalanceUSD
        totalBorrowBalanceUSD
      }
    }
  `
};
