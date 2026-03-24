# Historical Red Flags Catalog

## Smart Contract Risk

### Unaudited Code with Significant TVL
- **Severity**: Critical
- **Description**: Protocol holding >$10M TVL without professional security audit
- **Historical Instances**:
  - Multiple DeFi exploits in 2021-2023
- **Detection Methods**: Check audit reports on protocol website, verify auditor reputation
- **Mitigation**: Require minimum 2 independent audits for significant positions
- **Tags**: [smart-contract, security, audit]

### Recent Major Code Changes
- **Severity**: High
- **Description**: Significant smart contract upgrades within last 30 days
- **Historical Instances**: Post-upgrade exploits across various protocols
- **Detection Methods**: Monitor governance proposals, GitHub commits
- **Mitigation**: Wait 30-60 days post-upgrade before increasing exposure
- **Tags**: [smart-contract, upgrades]

## Economic Risk

### Unsustainable Yield Claims (APY > 100%)
- **Severity**: High
- **Description**: Yields that cannot be sustained by underlying economic activity
- **Historical Instances**:
  - Anchor Protocol (Terra/Luna collapse)
  - Various yield farms 2020-2022
- **Detection Methods**: Calculate real yield (fees - token dilution)
- **Mitigation**: Compare APY to protocol revenue, assess token inflation
- **Tags**: [economic, yield, sustainability]

### Circular Token Economics
- **Severity**: Critical
- **Description**: Token value dependent on continuous new capital inflow
- **Historical Instances**: Various Ponzi-like DeFi schemes
- **Detection Methods**: Trace value flows, identify external revenue sources
- **Mitigation**: Require clear external value capture mechanism
- **Tags**: [economic, ponzi, tokenomics]

## Governance Risk

### Voter Concentration > 60%
- **Severity**: Medium
- **Description**: Single entity or coordinated group controlling majority of votes
- **Historical Instances**: Various governance attacks
- **Detection Methods**: Analyze voting power distribution via Snapshot/Tally
- **Mitigation**: Monitor delegate distribution, set concentration thresholds
- **Tags**: [governance, concentration, voting]

### Anonymous or Unaccountable Team
- **Severity**: Medium
- **Description**: Core team fully anonymous with no public accountability
- **Historical Instances**: Various rug pulls
- **Detection Methods**: Research team backgrounds, verify identities
- **Mitigation**: Prefer protocols with doxxed, accountable teams
- **Tags**: [governance, team, accountability]

## Operational Risk

### Single Point of Failure
- **Severity**: High
- **Description**: Critical operations dependent on single admin key or individual
- **Historical Instances**: Various protocol compromises
- **Detection Methods**: Review admin key setup, multisig requirements
- **Mitigation**: Require minimum 3-of-5 multisig for critical operations
- **Tags**: [operational, admin, multisig]

### Oracle Manipulation Vulnerability
- **Severity**: High
- **Description**: Price feeds susceptible to flash loan attacks or low liquidity manipulation
- **Historical Instances**: Multiple oracle-based exploits
- **Detection Methods**: Review oracle implementation, check liquidity depth
- **Mitigation**: Require Chainlink or equivalent decentralized oracles
- **Tags**: [operational, oracle, manipulation]

## Market Risk

### Extreme Correlation to Single Asset
- **Severity**: Medium
- **Description**: Token price >90% correlated to BTC/ETH with no independent value driver
- **Detection Methods**: Calculate correlation coefficients over 90-day period
- **Mitigation**: Assess independent value proposition, diversify exposure
- **Tags**: [market, correlation, diversification]

---

*Last Updated: Initial seed data*
