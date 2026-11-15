---
name: project-management
description: How the project-manager agent keeps a website job on track: the health check at every phase, how to surface decisions for Kaden, how to detect gaps in context or process, when to propose a new skill, and the end-of-job retrospective that improves the library. Use whenever the project-manager agent runs and at the end of every job.
---

# project-management

The PM's job is to notice. Noticing early is cheap; noticing at QA is expensive.

## When the PM runs

1. After `project-intake`, before any build work.
2. At every phase start and end.
3. When any agent fails its done test twice, or a phase runs past its spend share.
4. When a Blocked entry has waited more than one check without an answer (so Hermes re-asks Kaden).
5. Before `report.md` is written.
6. At job end, for the retrospective.

## The health check (`references/health-check.md`)

Run every check and mark ok / watch / act. "Act" means the Leader must do something before continuing.

Core checks: brief still matches what is being built; every phase has a done test and a result; no agent is working outside its lane; decisions are logged with reasons; spend against plan; Blocked entries answered or re-asked; QA findings trending down; reviewer approvals present for high-risk code; no production, live-key, or real-email risk anywhere in config; approvals from Kaden exist for strategy and design before build.

## Surfacing decisions

A decision goes to Kaden when it affects cost, scope, timeline, legal exposure, the client's money or customers, or anything the brief is silent on and the site profile does not default. Everything else the Leader decides and logs.

Format for each, inside one Blocked entry:

```
D3. Should service-area pages be one page or one per city?
    Options: (a) one page listing 8 cities; (b) 8 pages, distinct content each.
    Recommendation: (b) for SEO, +~4 agent hours. Default if no answer by <date>: (a).
```

Hermes relays Blocked verbatim. Keep each under five lines.

## Gap detection

A gap is something the job needs that nothing covers. Look for it at every check:

| Signal | Likely gap |
| --- | --- |
| An agent asked the same question twice, or guessed | Missing brief fact → add to brief.md template |
| An agent improvised a procedure | Missing skill or missing section in one |
| Two agents produced conflicting output | Unclear lane → agent description fix |
| A done test could not be run | Missing tooling or environment step |
| QA found the same class of defect twice | Skill lacks a rule or checklist item |
| Kaden corrected the same thing twice | Preference belongs in a skill |
| The site needs a service or stack no skill covers (WordPress, a booking tool, a CRM) | New skill or new reference file |

Write each in `pm/gaps.md` per `references/gap-report.md`: what was needed, what happened instead, cost of the gap, proposed fix, and whether the fix is a brief question, a skill edit, or a new skill. If the fix is a new skill, draft its name, description, and outline, and ask Kaden in Blocked whether to add it to the library. Never add a skill to the library without Kaden's yes; the job can proceed with a local workaround in `pm/workarounds.md`.

## Retrospective (job end)

`pm/retro.md`: what went to plan, what did not, the gaps found and their fixes, every skill edit proposed, and three improvements for the next job. Hermes sends the proposed skill edits to Kaden as a list; approved edits are committed to the skills repo.

## Rules

The PM reads everything and writes only `pm/` files and status.md. It never edits code, designs, or skills. It never softens a risk to keep the job moving; "act" is "act". It batches questions; one Blocked entry, not five.
