# Security Policy

EHDS Relay is intended for use around sensitive health data catalogues, so we
take security reports seriously and appreciate responsible disclosure.

## Supported versions

EHDS Relay is pre-release. Only the latest code on `main` is supported; we do
not provide fixes for older commits, so please update where possible.

| Version        | Supported          |
| -------------- | ------------------ |
| Latest `main`  | :white_check_mark: |
| Anything older | No                 |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues
or pull requests.**

Instead, report them privately using one of the following methods:

1. **GitHub private vulnerability reporting** (preferred): go to the
   [Security tab](https://github.com/EHDS-Open-Source/ehds-relay/security) of
   this repository and select **"Report a vulnerability"**.
2. **Email**: send details to **opensource@aridhia.com** with a subject line
   starting `[SECURITY]`.

Please include as much of the following as you can:

- A description of the vulnerability and its potential impact
- Steps to reproduce, or a proof of concept
- The commit affected
- Any suggested mitigation, if known

## What to expect

- We will acknowledge receipt of your report within **10 business days**.
- We will investigate and aim to give you an initial assessment (severity and
  next steps) within **20 business days**.
- We will keep you informed of progress until the issue is resolved.
- We will credit reporters who wish to be credited once a fix is released,
  unless you prefer to remain anonymous.

## Disclosure policy

We ask that you give us a reasonable amount of time to investigate and address
a reported issue before any public disclosure, and that you avoid accessing or
modifying data belonging to others while investigating.

## Scope

This policy covers the code in this repository. If you have found an issue in
a third-party dependency (for example Keycloak or PostgreSQL), please also
report it to the relevant upstream project.
