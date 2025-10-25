# AfriLend

A micro lending dApp (Hedera-based) for coordinating micro-loans and lender pools.

This repository contains smart contracts, a frontend, and a backend server for AfriLend.

## Deployed contracts (testnet)

Deployed: 2025-10-25T00:45:45.254Z (from `contracts/deployed-contracts.json`)

- Reputation
  - Contract ID: 0.0.7125097
  - Explorer: https://hashscan.io/testnet/contract/0.0.7125097
- LenderPool
  - Contract ID: 0.0.7125100
  - Explorer: https://hashscan.io/testnet/contract/0.0.7125100
- AfriLendLoanManager
  - Contract ID: 0.0.7125104
  - Explorer: https://hashscan.io/testnet/contract/0.0.7125104

You can find the machine-readable deployment record at `contracts/deployed-contracts.json`.

## Repository layout

- `contracts/` — Solidity contracts, build artifacts and deployment scripts
  - `contracts/build/` — compiled ABIs and contract artifacts (JSON)
  - `contracts/deployed-contracts.json` — recorded deployed addresses and metadata
  - `contracts/scripts/` — compile/deploy/verify scripts
  - `contracts/setup-deployment.ps1` — helper for setting deployment environment on Windows
- `frontend/` — web UI (Vite + React + TypeScript)
- `server/` — backend API and services

## Quick start

Prerequisites
- Node.js (16+ recommended)
- npm or yarn (or bun, if you prefer)

From repository root:

1) Contracts (compile / deploy)
- Compile: run the provided compile script in `contracts/scripts`. For example (PowerShell):

  cd contracts; node scripts/compile.js

- Deploy: review `contracts/scripts/deploy.js` and set your operator credentials (the repo includes `setup-deployment.ps1` to help configure environment variables on Windows). Then run the deploy script to record addresses in `contracts/deployed-contracts.json`.

  cd contracts; node scripts/deploy.js

2) Frontend

  cd frontend
  npm install
  npm run dev

Open the URL printed by the Vite dev server (usually http://localhost:5173).

3) Server

  cd server
  npm install
  npm run dev

Check `server/README.md` for server-specific environment variables and configuration.

## Where to find ABIs and artifacts

Compiled contract artifacts and ABIs are in `contracts/build/`. Use these files if you need contract ABIs for the frontend or backend.

## Notes

- The deployed addresses above are for the Hedera testnet and were recorded by the repository's deployment scripts. Verify on HashScan using the explorer links.
- If you need additional help running the project, open an issue or contact the maintainer listed in the project metadata.

---
Generated from `contracts/deployed-contracts.json` on 2025-10-25.
