# Video Script — Community Guardian Demo (~6 minutes)

> Have slides open in presentation mode. Read naturally, not robotically.

---

## SLIDE 1: Community Guardian (~10 seconds)

Hey, I'm Mazin. I built Community Guardian for the Community Safety and Digital Wellness scenario.

**[Next slide]**

---

## SLIDE 2: The Problem (~30 seconds)

The problem — apps like Citizen and Nextdoor are supposed to keep you informed about local safety, but they actually make things worse. Every minor complaint gets the same weight as a real threat. People end up more anxious, not more safe. There's no noise filtering, and no actionable next step when something real does happen.

**[Next slide]**

---

## SLIDE 3: My Solution (~30 seconds)

Community Guardian flips that. The AI pipeline's main job is filtering noise out so only actionable incidents reach the user. And it uses a three-tier fallback — if the primary LLM is down, it tries a secondary model, and if both are down, a regex engine handles it. The app never breaks, even offline.

**[Next slide]**

---

## SLIDE 4: How It Works (~30 seconds)

The backend is Python with FastAPI, frontend is React with Tailwind. All validation goes through Pydantic models. The data store is in-memory so reviewers can clone and run instantly — no database setup.

Every incident stores which tier handled it in an analysis_method field, so there's full transparency. And the UI follows calm technology principles — warm tones, no red alerts unless something is genuinely critical.

**[Next slide]**

---

## SLIDE 5: Let's See It Live (~5 seconds)

Let me show you how it all works.

**[Switch to browser — have the app already open on the Dashboard]**

---

## LIVE DEMO (~2.5 minutes)

### Dashboard

This is the main dashboard. Notice the warm ivory and sage palette — intentionally not the typical red-and-black security look. The safety digest up top answers "Am I safe?" in plain language.

Noise-category incidents are hidden by default — that's the core noise-to-signal filtering.

### Creating an Incident

**[Navigate to Report page]**

Let me submit a new incident — "There's a suspicious person trying car door handles on NW 5th Avenue near the park."

**[Fill form, pick a zone, submit]**

This goes through the AI pipeline in real time. The LLM categorizes it, assigns severity, and generates an actionable checklist.

**[Show the result — point out analysis_method]**

You can see it was processed by llama-3.1-8b-instruct — the primary LLM. The checklist gives concrete steps, not vague advice.

### Search & Filter

**[Go to Incidents page, use filters]**

I can search by text, filter by category, severity, zone, or verification status.

### Offline Mode & Regex Fallback

**[Navigate to Dev Tools]**

Dev Tools shows AI pipeline health — how many incidents were AI versus regex.

**[Toggle offline mode ON]**

I'll flip offline mode on — the LLM is now unreachable.

**[Go to Report, submit: "Flooding reported on University Avenue near the campus."]**

Same form, same flow. But now...

**[Show result — analysis_method says regex-fallback]**

It still classified it, still generated a checklist, but the analysis method says regex-fallback. The app didn't break — it degraded gracefully.

**[Go back to Dev Tools, toggle offline OFF, click Upgrade button]**

Back online, I can hit Upgrade to manually re-process regex incidents through the LLM. Explicit, not automatic — that was a deliberate design choice.

### Safe Circles

**[Navigate to Safe Circles]**

Safe Circles lets users create encrypted groups for emergencies. Messages are encrypted before storage — the server only sees ciphertext.

**[Create or open a circle, send a message]**

### Fake News Detection

**[Show an incident with fake news indicators]**

The platform also overlays fake news detection. Sensational language or unverified claims get flagged with specific indicators.

---

## TESTS (~30 seconds)

**[Switch to terminal — scroll up to the test results already run]**

79 tests across 12 test files — AI pipeline, regex fallback, fake news detection, encryption, rate limiting, input validation, and edge cases.

All green. The key thing is I'm testing fallback behavior explicitly — there are tests that mock the LLM being down and verify the regex engine kicks in correctly.

---

## WRAP-UP (~30 seconds)

**[Can show slides or just speak over the dashboard]**

Three quick takeaways.

First — fallback design matters more than AI sophistication. A safety app that breaks when the API is down is worse than no app at all.

Second — transparency builds trust. Every incident shows which tier analyzed it. Users should never have to guess.

Third — calm technology is underrated. The biggest win wasn't a feature — it was hiding noise by default.

That's Community Guardian. Thanks for watching.

---

## TIMING GUIDE

| Section | Target | Running Total |
|---------|--------|---------------|
| Slides 1-5 | 1:45 | 1:45 |
| Live Demo | 2:30 | 4:15 |
| Tests | 0:30 | 4:45 |
| Wrap-up | 0:30 | 5:15 |

**Total: ~5:15** — plenty of buffer under 7 minutes.
