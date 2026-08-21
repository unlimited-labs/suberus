# Security Policy

Suberus handles unpublished research, peer-review identities, and participant personal data. We take vulnerability reports seriously and we would rather hear about a problem from you than from an incident.

## Reporting a vulnerability

**Do not open a public issue, pull request, or discussion for a security problem.**

Use either channel:

1. **GitHub private vulnerability reporting** (preferred) — [open a private report](https://github.com/unlimited-labs/suberus/security/advisories/new). The thread is visible only to you and the maintainers.
2. **Email** — <security@suberus.app>. Mention "security" in the subject.

### What to include

- Affected commit or Docker image tag, or the URL of the instance where you observed it.
- The account role you were acting as: author, reviewer, editor, organizer, exhibitor, or anonymous visitor. Most of the interesting risk in this project lives in the permission and blinding model, so this matters.
- Steps to reproduce, expected vs. actual behaviour, and the impact you believe it has.
- Proof of concept, log excerpts, or screenshots where they help.

## What happens next

| Stage                                  | Target                                                 |
| -------------------------------------- | ------------------------------------------------------ |
| Acknowledgement of your report         | 3 working days                                         |
| Initial assessment and severity rating | 10 working days                                        |
| Fix for critical / high severity       | 14 days from assessment                                |
| Fix for medium / low severity          | Next regular release cycle                             |
| Public disclosure                      | Coordinated with you, at most 90 days after the report |

We publish a GitHub Security Advisory when a fix ships and credit you by name or handle unless you ask to stay anonymous. If we conclude a report is not a vulnerability, we say so and explain why.

## Supported versions

Suberus is developed continuously and deployed from `master`; there are no tagged releases or maintenance branches. Only the current `master` and the latest published Docker image receive security fixes — **there are no backports**. If you self-host, applying a security fix means redeploying the latest image.

## Scope

**In scope** — everything in this repository: the application (`src/`), the Python sidecars (`services/`), the database schema and migrations (`prisma/`), the build and release workflows (`.github/workflows/`), and the Docker images published from them.

**Out of scope:**

- Third-party Suberus deployments you do not own or have written permission to test.
- Dependency CVEs with no demonstrated exploit path in Suberus — those are handled by Dependabot.
- Self-hosting misconfiguration: leaked `.env` files, default or weak `AUTH_SECRET`, missing TLS, an exposed database.
- Missing rate limits or spam on public forms, absent a concrete abuse impact.
- Automated scanner output with no proof of concept, and best-practice reports (missing headers, cookie flags) with no exploitable consequence.

## Safe harbour

We will not pursue legal action against research conducted in good faith under this policy: test only against instances you own or are authorised to test, stop as soon as you can demonstrate the issue, never access, modify, or exfiltrate data belonging to other people, do not degrade service availability, and give us a reasonable window to fix the issue before going public.

There is **no bug bounty programme** — this is an open-source project with no security budget. We offer credit in the advisory and a quick, honest response.

## Hardening for self-hosters

Keep secrets in `.env` and never commit them, set a strong unique `AUTH_SECRET`, terminate TLS in front of the application, restrict the database to the application network, and redeploy the latest image regularly. Deployment and configuration guidance lives in the [documentation](https://docs.suberus.app).
