Returnee Reintegration Loan (RRL)
Empowering returning Overseas Filipino Workers (OFWs) to access local business micro-loans by using their verified overseas Stellar remittance and savings history as credit evidence.

Problem
Returning Overseas Filipino Workers (OFWs) want to start local businesses to establish long-term livelihoods in the Philippines. However, because their financial footprints occurred abroad, they have zero credit history with local Philippine banks. This lack of a local credit score locks them out of traditional business micro-loans, forcing them to remain overseas away from their families, or turn to predatory informal lenders.

How It Works
Wallet Connection: The returning OFW registers on the portal and connects their Stellar public address (or selects a mock simulation profile).
Instant Credit Audit: The platform's scoring engine runs a credit analysis by querying transaction records from the Stellar ledger, instantly calculating a rating from 300 to 1000 and assigning a grade (A, B, or C).
Interactive Analytics: The OFW views their credit breakdown metrics and an interactive Chart.js cashflow graph displaying monthly inflows, outflows, and running balances.
Loan Application: Qualified applicants slide the loan estimator to configure principal amount and terms based on their grade (e.g. Grade A unlocks up to PHP 100,000 at 3% interest p.a.), submitting their business sector details.
Lender Audit \& Settle: A financial representative logs in, inspects the pending applications pipeline, audits the applicant's ledger history charts, and approves the loan to trigger a simulated Stellar disbursement.
Simulated Repayments: The OFW makes installment payments on their dashboard, simulating a smart contract repayment transaction back to the lender pool.
How It Uses Stellar
Ledger Auditability (Horizon API): Directly queries ledger accounts and payment lists on the Stellar network to verify account longevity and analyze transaction consistency.
Cross-Border Financial Identity: Builds a verifiable, decentralized credit profile linked directly to the OFW's public key, proving their overseas cashflow history.
Simulated Payment Flows: Models capital pool disbursement and installment repayment structures using on-chain transaction hashes.
Why Stellar: Stellar's low transaction fees, focus on remittances, and built-in cashflow properties make it the perfect platform for cross-border financial identity and inclusive microfinance.
Track
Track 2 Financial Inclusion \& Everyday Payments (Alternative: Track 5 Social Impact)

Tech Stack
Backend: Node.js, Express.js
Database: Local JSON File Storage
Frontend: HTML5, Vanilla CSS3 (harmonious HSL variables, glassmorphism, responsive grid layouts), ES6 JavaScript, Chart.js (for data visualizations)
Stellar SDK / Horizon Queries: Native Node global fetch API for lightweight ledger queries.
Network: testnet
Key Utilities: Node net module for dynamic port collision-resistance.
Setup \& Run
Follow these instructions to run the project locally:

bash



# Clone the repository

git clone \[your-repo-link]

# Navigate into the project folder

cd returnee-reintegration-loan

# Install required dependencies

npm install

# Start the application server

node server.js
Note: The server includes a built-in port scanner. If port 3000 is occupied, it will automatically search and bind to the next free port (e.g., 3001, 3002) and print the active local URL to the terminal.

Network Details
Network: testnet
Horizon API Endpoint: https://horizon-testnet.stellar.org
Contract IDs: N/A (utilizes Horizon transaction auditing)
Asset issuers: N/A
Team
Ron Michael C. Legaspi — @\[legaspi-ronmichael]

Gabriel Balang - @\[lionyde]

Avril Lavigne Pascua - @\[sunnymingming]
License
MIT

