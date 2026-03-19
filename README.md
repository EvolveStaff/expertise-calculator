# SWG:Evolve Expertise Calculator

A web-based expertise tree planner and heroic jewelry reference tool for the [Star Wars Galaxies: Evolve](https://swgevolve.com) private server.

![SWG Evolve Logo](public/evolve-logo.png)

---

## Features

- **Expertise Tree Planner** — Browse and allocate points across all expertise trees for your profession
- **Normal & Force Sensitive characters** — Switch between character types to see the relevant trees
- **Point budget enforcement** — Tracks your 135-point cap and tier unlock requirements in real time
- **Build sharing** — Save and share builds via URL-encoded state
- **Heroic Jewelry Browser** — Full reference for all heroic jewelry sets, including per-piece stat bonuses and set bonuses at 3, 4, and 5 pieces

---

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) (dev server + build)
- No external UI libraries — pure CSS modules

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm (included with Node.js)

### Install & Run

```bash
# Clone the repository
git clone https://github.com/EvolveStaff/expertise-calculator.git
cd expertise-calculator

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

Output goes to `dist/`. Serve with any static file host (GitHub Pages, Netlify, etc.).

---

## Data

Expertise tree data lives in `public/data/` and is loaded at runtime:

| File | Contents |
|---|---|
| `expertise.json` | All expertise trees and nodes, generated from game `.tab` files |
| `string_tables.json` | Human-readable names for skill mods and stats |
| `heroic_jewelry.json` | Heroic jewelry sets, item stats, and set bonuses by profession |

---

## Expertise Rules

- **135 total points** cap across all trees
- **Tier unlock** (cumulative): each tier requires a minimum total points spent in that tree
  - Tier 2: 4 pts · Tier 3: 8 pts · Tier 4: 12 pts · Tier 5: 16 pts · Tier 6: 20 pts
- You may skip a tier by spending enough points in earlier tiers to meet the next tier's threshold

---

## Contributing

Pull requests are welcome. If you spot incorrect expertise data or missing jewelry stats, please open an issue.

---

## Disclaimer

This project is a fan-made tool for a private server community. Star Wars Galaxies is a trademark of Sony Online Entertainment / Daybreak Game Company. This project is not affiliated with or endorsed by Lucasfilm, Disney, or Daybreak.
