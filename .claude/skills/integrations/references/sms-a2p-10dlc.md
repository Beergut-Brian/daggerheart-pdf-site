# SMS (A2P 10DLC): get the campaign approved the first time

Kaden's checklist from his own site's campaign (rejected twice with error 30896, then approved, Oct 2026). Use it before a FIRST 10DLC brand/campaign submission for any site. Kaden submits in the Twilio console himself; the site must already pass every line below. The numbers in brackets are Twilio's rejection codes.

## 1. Business profile (Trust Hub), before the brand
- Legal name and EIN exactly as on the IRS letter (18602). A DBA goes in as the brand/display name, not the legal name.
- A physical operating address that public records can find. No PMB or virtual office. Keep an invoice or utility bill that shows it, ready for support (18603).
- Contact email on the website's domain, never gmail (18606).
- Note which Account SID (parent or subaccount) the profile, brand and campaign sit on. They must line up.

## 2. Website, live BEFORE submitting
- The opt-in form has a phone field (`type="tel"`).
- A separate SMS consent checkbox: optional, unticked, not required to submit the form.
- Checkbox text: brand name, what the messages are about, "Msg frequency varies", "Msg & data rates may apply", "Reply STOP to opt out, HELP for help", "Consent is not a condition of purchase", plus links to BOTH the SMS Terms and the Privacy Policy right in the text.
- The Privacy Policy has an SMS section saying mobile numbers and SMS opt-in data are not sold or shared with third parties or affiliates for marketing. Remove or carve out any generic "we share with partners" text.
- An SMS Terms page: program description, frequency, rates, STOP/HELP, support contact, privacy link, carrier disclaimer.
- Footer links to Privacy and SMS Terms on every page.
- The pages are public: no login, no "coming soon", no staging password, no "draft" or "test" banner on the declared pages. Reviewers must reach the real URL.

## 3. Console fields
- Every URL pasted (opt-in page, Terms, Privacy, screenshot) returns 200. Check each with curl right before submitting; a wrong slug (404) fails silently.
- Screenshot of the CURRENT form: phone field visible, checkbox unticked, links visible. Upload it under a new file name so no old version is cached.
- The message-flow description matches the page word for word: the fields, the checkbox and the links. No typos.
- Opt-in confirmation: "<Brand>: You're opted in to <purpose> texts. Msg frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to opt out."
- Opt-out confirmation starts with the brand: "<Brand>: You've been unsubscribed and won't receive more messages. Reply START to resubscribe."
- Keywords: opt-in START; opt-out STOP, STOPALL, CANCEL, END, QUIT, UNSUBSCRIBE; HELP.
- Message samples (2+): start with the brand, match the stated use case, end with the STOP line. No invented reply keywords, no links you didn't declare, no marketing if the use case isn't marketing.
- The use case matches reality (e.g. LOW_VOLUME mixed, or customer care / account notifications). Don't tick "embedded links" or "embedded phone" unless the samples have them, and include them in the samples if ticked.

## 4. Process
- Someone other than the builder audits the live page and every URL before submit.
- Save each rejection email; the console history is the only other record.
- Resubmission review: 1-3 business days.

## For the build (Leader)
- Ship a `docs/sms-10dlc-submission.md` with every console field filled in (brand, use case, description, message flow text copied from the live page, opt-in/opt-out/help replies, samples, URLs), plus a curl check of each URL and the screenshot path, so the submitter pastes rather than writes.
- Store each consent with timestamp, source (which form), the exact checkbox text version, and the phone (E.164). STOP from Twilio's inbound webhook (or Advanced Opt-Out) marks the number opted out in our database too; never text an opted-out number.
