# Snapshot Scraper

## Requirements

- Node v14+

## Installation

### Define Web3 Provider

Set the environment variable `WEB3_PROVIDER_URL` to the HTTP URL of the Web3 provider you're going to use (e.g. Infura).

For example

```
WEB3_PROVIDER_URL=
```

To insta

### Install Dependencies

Run:

```
npm install
```

## Get snapshots

The parameters for the scraper are located at `./src/parameters.ts`;

To get the snapshots (only stakers for now), run:

```
npm start
```

The results will be stored in `./cache/**/(block number or staking period).csv`.
