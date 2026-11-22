# Implementation decisions
- Use Node 24 with built-in SQLite and browser modules. A single-process college lab can install and test the entire app offline without a package registry or database service.
- Use SQLite WAL and atomic learner-state transactions for durable progress on one host. Language codes partition the question bank and enrolments.
- Provision accounts from the host. Teachers share the MVP administrative role. The authentication adapter owns password verification and opaque sessions so SSO can replace it.
- Each grammar point starts with three worked examples and twelve exercises across four skills. A2 and B1 receive the same pilot coverage so placement and upgrades can run immediately after development approval.
- The sequence starts with decoding and then uses sentence-level vocabulary in context. CEFR mappings are local teaching estimates pending faculty validation.
