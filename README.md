# Auto Loan Calculator + Affordability & Risk Demo

A simple end-to-end demo that:
- Takes borrower and vehicle info  
- Computes affordability metrics  
- Scores risk with a mock ML model  
- Applies hard rules  
- (Optionally) queries lender APIs to return ranked offers  

---

## 🚗 How It Works (Story Level)

### Borrower Inputs
- Vehicle price  
- Down payment  
- Trade-in value (and payoff)  
- Fees & tax rate  
- Term (months)  
- State  
- Monthly income  
- Housing cost  
- Other debt  

### Features Computed
- **LTV (Loan-to-Value):** `financedAmount / vehiclePrice`  
- **DTI (Debt-to-Income):** `(monthlyDebt + housingCost + loanPayment) / monthlyIncome`  
- **Affordability flag** based on thresholds  

### AI Risk Model (Demo)
- Returns **PD (probability of default)** with a confidence score  
- For now: stub/mock function (extendable to real ML service)  

### Rule Engine
- Enforces hard rules:
  - Max LTV  
  - Max DTI  
  - Minimum income  
  - Max probability of default  

### Lender APIs (Optional)
- Partners receive a minimal profile + risk score  
- Return offers with APR and terms  

### Offer Ranking
- Offers are **re-ranked by risk-adjusted APR**:  
  `adjustedAPR = APR × (1 + PD)`  

---

## 🛠️ Tech Stack
- **React + TypeScript + Vite**  
- Pure functions for financial math (`src/lib/`)  
- Hot reload for UI changes  
- Designed for extension with ML + APIs  

---

## 🚀 Next Steps
- Add borrower financial inputs to UI  
- Implement affordability and risk calculations (`affordability.ts`, `risk.ts`, `rules.ts`)  
- Add simulated lender offers + ranking logic  
- Connect to real ML model or APIs later
