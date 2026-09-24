# Contributing

Open an issue describing the user problem and proposed behavior before a substantial feature. Keep this project focused on transparent preference-model sensitivity. Never submit private, employer, client or identifiable personal data. Use clearly labelled synthetic fixtures.

Use Node.js 24, run `npm ci`, then `npm run dev`. Before a pull request run `npm run check`, install the appropriate Playwright browser, run `npm run test:e2e`, and run `npm audit --audit-level=high`. Unit changes need independently calculated examples; interface changes need keyboard and narrow-screen checks. State which commands you actually ran and disclose failures.

Preserve import limits, HTML escaping, stale-output invalidation and explicit model assumptions. Avoid network services or persistence without a clear proposal. Update the README and method document when behavior changes. Contributions are under MIT and governed by the code of conduct.
