README

BloomBoard — Project Overview

Purpose
BloomBoard is a web-based portfolio planning application designed for the self-directed investor. It serves as a purpose-built replacement for the investment spreadsheet — more powerful than Excel, more flexible than a brokerage's built-in tracker, and focused entirely on planning and strategy rather than execution.
BloomBoard does not connect to brokerages or execute trades. It is a thinking tool — a place to model, compare, and simulate investment strategies across all of a user's accounts in one place.

The Problem It Solves
Most active investors maintain some form of spreadsheet alongside their brokerage accounts. Their brokerage tells them what they own, but not how it compares to their ideal strategy, how it might perform over time, or how it stacks up against a theoretical alternative. BloomBoard fills that gap.

Target Audience
The self-directed, research-oriented investor who actively thinks about portfolio strategy and allocation. Someone who already keeps — or wishes they kept — an investment spreadsheet.

Core Features
Portfolio Sheets
Users can create multiple named portfolio sheets, each accessible via its own tab. A sheet might represent a real brokerage account (e.g. "Fidelity"), a retirement account (e.g. "Roth IRA"), or a theoretical strategy (e.g. "Dream Portfolio"). Each sheet is tagged as either actual or theoretical.

Holdings Management
Each sheet contains a table of holdings with full CRUD functionality. Each holding tracks: ticker symbol, asset name, asset class, sector/basket, quantity, purchase price, current price, price last updated, and optional notes. Current value and percentage of portfolio are calculated automatically.

Live Price Lookup
Users can optionally pull current stock prices via API, or enter prices manually. A visible timestamp shows when prices were last refreshed.

Sheet Comparison
Users can compare any two portfolio sheets side by side — for example, their actual Fidelity holdings versus their theoretical target portfolio. 

Scenario Simulation
Users can run simple simulations against any sheet — for example, applying an 8% annual growth rate over 10 years — to project future portfolio value. 

Technical Stack
BloomBoard is built on the MERN stack — MongoDB, Express, React, and Node.js. Stock price data is sourced from API. Authentication is handled via a simple email and password login.


Data Model
Three core collections in MongoDB: Users, Portfolios, and Holdings. Each user owns multiple portfolios. Each portfolio contains multiple holdings. Calculated fields such as current value and percentage of portfolio are derived on the frontend rather than stored.

Users>
	-username
	-userPassword
	-userRole (user or admin)
		
		Portfolios>
			-portfolioName
			-portfolioType (investment, theoretical, retirement)
			-userid

			Holdings>
				-portfolioId
				-ticker
				-name
				-assetClass
				-sector/basket (optional)
				-quantity
				-purchasePrice (manually entered or entered with current price at time of entry)
				-currentPrice
				-priceLastUpdated
				-notes (optional)


How To Start The Application

1. Go to this link! https://cis4004-project.onrender.com/


