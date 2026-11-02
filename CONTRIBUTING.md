# Contributing

This is an early alpha. The owner approved the initial source contents and Apache-2.0 license on 2 November 2026. Use the repository issues and pull requests for public collaboration. No contribution history is implied by these instructions.

## Start with a useful report

For a bug, describe the expected result, actual result, steps to reproduce, version or commit, and browser/runtime. Use synthetic tickets and redact personal data. Never include access keys, session cookies, tracking capabilities, `.dev.vars`, database exports, or provider credentials. Security reports go privately through [SECURITY.md](SECURITY.md).

For a feature, explain the operator or customer problem and the smallest useful change. Discuss substantial schema, authentication, retention, integration, or scope changes before implementing them. The MVP is one business and one owner; assignment labels must not be presented as staff permissions.

## Make a change

1. Follow [installation](docs/installation.md) and use a local database with synthetic data.
2. Create a focused branch and keep unrelated changes separate.
3. Preserve the security boundaries in the [API contract](docs/api-contract.md). Update NL and EN copy together when changing user-facing text.
4. Add meaningful regression coverage for behavior changes, especially authorization, customer/internal-message separation, retention, and input validation. Documentation-only changes need link and accuracy checks rather than artificial code tests.
5. Run `npm run check`, `npm test`, and `npm run build`. Exercise changed user flows locally; include actual commands and results in your pull request.
6. Explain the problem, resulting behavior, migrations, and any operational impact. Do not claim a check passed unless you ran it.

Do not deploy, create provider resources, enable outbound email, publish packages, or alter live KlikGefixt systems as part of a contribution. The CI workflow validates a checkout with read-only repository permissions; it does not deploy.

## Rights and review

Submit only work you have the right to contribute. Do not copy private business code, client records, paid assets, or third-party material without compatible permission and attribution. Keep dependency changes focused and review their licenses. No contributor license agreement is configured. Intentionally submitted contributions are expected under Apache-2.0 unless explicitly identified otherwise before submission.

The owner decides what is merged and released. A contribution does not create a support commitment, employment relationship, or permission to use project branding. Participate under the [code of conduct](CODE_OF_CONDUCT.md).
