README.txt

BloomBoard

Project Overview
BloomBoard is a web-based portfolio planning application for the self-directed investor. It is designed as a tool where users can model, compare, and simulate investment strategies across multiple accounts in one place. BloomBoard does not connect to brokerages or execute trades. Instead, it focuses on planning, tracking, and portfolio analysis.

Purpose
Many active investors use spreadsheets alongside their brokerage accounts to track portfolio strategy, compare actual allocations to ideal targets, and model future growth. BloomBoard provides a central place to manage, compare, and evaluate investment ideas.

Target Audience
BloomBoard is intended for self-directed, research-oriented investors who actively think about portfolio strategy and allocation.

Core Features
- User registration and login
- Portfolio management
- Holdings management
- Watchlist tracking
- Simulations
- Settings and password update
- Role-based access for users and admins

Technical Stack
Frontend:
React, Vite, Tailwind CSS, shadcn/ui, Recharts

Backend:
Node.js, Express.js

Database:
MongoDB

Price Data:
Finnhub API

Deployment:
Render

Data Model
Users
- username
- userPassword
- userRole

Relationships
- User → Portfolios: one-to-many
- Users ↔ Portfolios: many-to-many through UserPortfolio
- Portfolio → Holdings: one-to-many
- Portfolio → Simulations: one-to-many
- User → Watchlist: one-to-many

Portfolios
- portfolioName
- portfolioType
- userId

UserPortfolio
- userId
- portfolioId
- role

Holdings
- portfolioId
- ticker
- name
- assetClass
- sector
- quantity
- purchasePrice
- purchaseDate
- currentPrice
- priceLastUpdated
- notes

Simulations
- portfolioId
- growthRate
- timeHorizon
- projectedValue
- createdAt

Watchlist
- userId
- ticker
- name
- assetClass
- notes
- addedAt

How to Start the Web Server
The project is deployed online. No local setup is required for grading.

Open the application here:
https://cis4004-project.onrender.com/

Is a Second Server Needed for the React Application?
No.
A second server is not needed because the deployed application is already hosted and accessible through the Render link.

How to Navigate to the Application
Open the deployed application in a browser at:
https://cis4004-project.onrender.com/

What Collections Are Needed in MongoDB?
- users
- portfolios
- userportfolios
- holdings
- simulations
- watchlists


