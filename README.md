# EcoQala

EcoQala is a digital ecosystem that incentivizes urban citizens to take verifiable ecological actions and earn tokens and eco-rewards.

---

## Problem
Urban environmental challenges—such as illegal waste dumping, low recycling participation, and lack of urban greenery—persist because citizens lack tangible, immediate incentives, and city authorities lack transparent, tamper-proof mechanisms to verify and reward civic eco-initiatives.

---

## Solution
EcoQala bridges citizens, local businesses, and municipal organizations into a single motivational network:
- **AI-Powered Eco Verification:** Citizens take before-and-after photos of eco-actions (e.g., trash cleanup, sorting recyclables, tree planting), verified by Gemini Vision AI.
- **Token Rewards:** Users earn ECO tokens and civic points for every verified action.
- **Urban Impact & Quests:** City-wide quests, leaderboard competitions between districts and cities, and marketplace discounts sponsored by local eco-conscious businesses.

**Target Audience:** Urban citizens, environmentally active youth, sustainable local businesses, and municipal eco-departments.

---

## How it uses Solana
EcoQala leverages **Solana Devnet** for transparent, immutable auditability:
- **Immutable Action Logging:** Every verified ecological contribution is recorded on-chain via the official Solana Memo Program (`MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`).
- **Fair Reward Accounting:** Records store the verified action metadata, timestamp, and issued ECO token rewards, ensuring complete transparency and preventing double-claiming.
- **Low-Cost Civic Web3:** Uses the user's connected Phantom wallet to sign lightweight, instant memo transactions, providing verifiable public proof on [Solana Explorer](https://explorer.solana.com/?cluster=devnet).

---

## How to run

### Prerequisites
- Node.js (v18+)
- npm
- Phantom Wallet browser extension configured for Solana Devnet

### Installation & Launch
```bash
# Clone repository
git clone https://github.com/arailymaisabek-sketch/EcoQala.git
cd EcoQala

# Install dependencies
npm install

# Start local development server
npm run dev
```

Open your browser at `http://localhost:3000`.

---

## Team
- **EcoQala Core Team:** Environmental product engineers, smart contract developers, and civic tech advocates dedicated to making green habits rewarding and verifiable.
