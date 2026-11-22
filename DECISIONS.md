# Implementation decisions
- Use Node 24 with built-in SQLite and browser modules. A single-process college lab can install and test the entire app offline without a package registry or database service.
- Use SQLite WAL and atomic learner-state transactions for durable progress on one host. Language codes partition the question bank and enrolments.
- Provision accounts from the host. Teachers share the MVP administrative role. The authentication adapter owns password verification and opaque sessions so SSO can replace it.
- Each grammar point starts with three worked examples and twelve exercises across four skills. A2 and B1 receive the same pilot coverage so placement and upgrades can run immediately after development approval.
- The sequence starts with decoding and then uses sentence-level vocabulary in context. CEFR mappings are local teaching estimates pending faculty validation.
- Placement interleaves four skills, tests nearest available bands without repeating an item, checks stability at 20 and 24, and stops at 28. Each estimate is capped by the highest correct response in that skill.
- Each skill has its own ordered units. Practice unlocks the checkpoint. A failed checkpoint requires correct review responses on the missed points. B1 completion records B2 as the next study band.
