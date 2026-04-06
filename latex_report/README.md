# D-CARPOOL BTP LaTeX Report

## Project Title
**Decentralized Cab-Sharing System Using Blockchain Technology with Advanced Cryptographic Security**

## Team Members
- G. Sai Vivek Reddy (2022BCY0028)
- Sarthak Gupta (2022BCY0054)
- Hisham Abdul Asis KV (2022BCY0001)

## Supervisor
Dr. Sreelakshmy I J

## Files Structure

```
latex_report/
├── main.tex           # Main document (compile this)
├── chapter1.tex       # Introduction
├── chapter2.tex       # Literature Review
├── chapter3.tex       # System Architecture
├── chapter4.tex       # Implementation Details
├── chapter5.tex       # Blockchain Security Implementation
├── chapter6.tex       # Smart Contract Deployment
├── conclusion.tex     # Conclusion and Future Work
├── references.bib     # Bibliography
├── logo2.jpg          # IIIT Kottayam logo (add this)
└── README.md          # This file
```

## How to Compile

### Using pdfLaTeX (Recommended)

```bash
# Navigate to latex_report folder
cd latex_report

# Compile (run multiple times for references)
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
```

### Using Overleaf

1. Create new project on Overleaf
2. Upload all .tex files
3. Upload references.bib
4. Add IIIT Kottayam logo as `logo2.jpg`
5. Set `main.tex` as main document
6. Compile

### Using TeXstudio/TeXmaker

1. Open `main.tex`
2. Build & View (F5 or equivalent)
3. Run BibTeX for references
4. Build again

## Required Packages

The document uses these LaTeX packages:
- `amsthm`, `amssymb` - Mathematical typesetting
- `graphicx` - Image handling
- `listings` - Code listings
- `hyperref` - Hyperlinks
- `float` - Figure positioning
- `booktabs`, `longtable` - Tables
- `xcolor` - Colored text/code

## Adding the Logo

Download the IIIT Kottayam logo and save it as `logo2.jpg` in the same folder.

## Report Contents

### Chapter 1: Introduction
- Motivation
- Problem Statement
- Objectives
- Scope

### Chapter 2: Literature Review
- Blockchain fundamentals
- Cryptographic protocols (SBT, ZKP, Merkle, CP-ABE, Shamir)
- Related work comparison
- Research gaps

### Chapter 3: System Architecture
- Three-tier architecture
- Technology stack
- Database schema
- Smart contract overview
- Security architecture

### Chapter 4: Implementation Details
- User management
- Ride management with CP-ABE
- Rating and reputation
- SOS with Shamir's Secret Sharing
- Admin features with Merkle anchoring

### Chapter 5: Blockchain Security Implementation
- Soulbound Tokens
- Zero-Knowledge Proofs
- On-chain hash integrity
- DPoS Governance
- Merkle Tree audit
- CP-ABE encryption
- Shamir's Secret Sharing

### Chapter 6: Smart Contract Deployment
- Development environment
- Deployment scripts
- Contract addresses
- Gas optimization
- Frontend integration
- Testing

### Conclusion
- Summary of achievements
- 7 blockchain security mechanisms
- Limitations
- Future directions

## Security Features Covered

| Feature | Purpose |
|---------|---------|
| Soulbound Tokens | Non-transferable academic identity |
| Zero-Knowledge Proofs | Privacy-preserving driver verification |
| Hash Integrity | Tamper-proof ride agreements |
| DPoS Governance | Decentralized dispute resolution |
| Merkle Trees | Efficient ride history audit |
| CP-ABE | Attribute-based encryption |
| Shamir SSS | Emergency data protection |

## Contact

Department of CSE-Cyber Security
Indian Institute of Information Technology Kottayam
Kerala - 686635, India
