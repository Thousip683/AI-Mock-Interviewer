# Coding round setup

Open /coding after signing in. Python and JavaScript submissions implement solve(input), return a JSON value, and must not print debugging output. Samples are visible; additional cases stay on the server. MongoDB stores submitted attempts. Drafts remain in session storage for the current tab. The timer is advisory.

Execution requires a separately deployed, secured Judge0 CE instance with synchronous submissions enabled and language IDs 63 (JavaScript) and 71 (Python). Configure server/.env:

```
JUDGE0_URL=https://your-isolated-runner.example
JUDGE0_TOKEN=your-runner-auth-token
```

Do not deploy the runner on the application host. Restrict its network and filesystem access, keep the sandbox patched, disable execution network access globally, and enforce server-side CPU/memory/output and queue limits. The application requests 2 CPU seconds, 5 wall seconds, 128 MB and no networking. Configure rate limits at your gateway before exposing paid execution publicly. One concurrent request per user is enforced in this app process.

No runner credentials are bundled. Until configured, execution returns an explicit setup error. No code is executed within Express. Gemini coaching is optional and never determines the correctness score. Saved attempts require MongoDB. This initial editor is an accessible plain-text editor with Tab indentation; syntax highlighting and line numbers are not included yet.
