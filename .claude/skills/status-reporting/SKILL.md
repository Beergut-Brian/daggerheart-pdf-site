---
name: status-reporting
description: How the Leader writes status.md and report.md so Hermes and Kaden can follow a job from Telegram. Use at every phase change and at job end.
---

# status-reporting

Hermes relays the "Now" and "Blocked" lines. Keep them short.

## status.md (keep the template's headings)

- **Now:** one line, present tense, what is happening and which agent.
- **Blocked:** questions for Kaden, numbered, with the default you will take if unanswered and when.
- **Phases:** table with status (planned, running, done), done test, result.
- **Decisions:** anything the brief did not cover, with the reason. Append; never delete.
- **Spend:** estimate so far against the cap.

Update after every phase change and whenever Blocked changes.

## report.md

1. What was built, in five lines or fewer.
2. Preview URL and how to log in to any admin (test credentials location, not the values).
3. Needs Kaden's review: list, with links to `review/*.md` and `qa/findings.md`.
4. Open questions and `[CONFIRM]` items.
5. What was not done and why.
6. Suggested next steps.
7. Spend.

Under 40 lines. Links instead of detail.
