# AI Content QA: Procedural Rules

Every rule is a trigger–action pair. No rule requires judgment; each has a mechanical test. If a test fails, apply the fix, then re-run the test before continuing.

---

## 1. Instruction Compliance

**Rule 1.1 - Requirement extraction**
When you receive a prompt, list every explicit requirement (format, length, count, tone, exclusions) as a numbered checklist *before* drafting. After drafting, mark each item ✔ or ✘. Any ✘ 🠖 edit the draft, re-mark.

**Rule 1.2 - Count enforcement**
When the prompt specifies a number ("5 examples", "under 200 words", "3 sections"), count the actual output. If actual ≠ specified, add or remove items until equal.

**Worked example:**
Prompt asks for "exactly 5 bullet points." Draft contains 6. Rule 1.2 count: 6 ≠ 5 🠖 delete the weakest bullet 🠖 recount: 5 = 5 🠖 pass.

**Failure prevented:** *Silent requirement drop* - output that reads well but ignores a stated constraint.

---

## 2. Factual Claims & Numbers

**Rule 2.1 - Claim tagging**
When a sentence contains a proper noun + verifiable fact (date, statistic, quote, attribution), tag it `[SOURCE-KNOWN]` or `[UNVERIFIED]`. Every `[UNVERIFIED]` tag 🠖 either delete the claim, hedge it explicitly ("reportedly", "as of [date]"), or verify via lookup. Zero untagged verifiable claims may remain.

**Rule 2.2 - Arithmetic recompute**
When output contains a derived number (sum, percentage, difference), recompute it from the stated inputs digit by digit. If recomputed value ≠ written value, replace the written value.

**Worked example:**
Draft: "Revenue grew from $40M to $52M, a 25% increase." Recompute: (52−40)/40 = 0.30 🠖 30% ≠ 25% 🠖 replace with "30%".

**Failure prevented:** *Confident confabulation* and *arithmetic drift* - plausible-sounding wrong facts and mismatched math.

---

## 3. Internal Consistency

**Rule 3.1 - Entity table**
When output exceeds 300 words, build a table of every named entity, number, and date at first mention. On each later mention, compare against the table. Any mismatch 🠖 change the later mention to match the first (or correct both if the first was wrong per Rule 2).

**Rule 3.2 - Claim reversal scan**
When you make a directional claim ("X increases Y"), search the rest of the output for the opposite claim ("X decreases Y"). If found, delete one and state which is correct.

**Worked example:**
Paragraph 1 names the client "Acme Corp"; paragraph 4 says "Acme Inc." Table check flags mismatch 🠖 both changed to "Acme Corp."

**Failure prevented:** *Entity drift* and *self-contradiction* across long outputs.

---

## 4. Formatting & Markdown

**Rule 4.1 - Delimiter pairing**
When output contains ``` , ** , _ , or [ , count opening and closing instances. Odd count 🠖 locate the unpaired delimiter and close or delete it.

**Rule 4.2 - Structure match**
When the prompt names a format ("table", "JSON", "numbered list"), check the output's first structural element. If it is not that format, rebuild the content in the required format; do not append the format as an afterthought.

**Rule 4.3 - Code block language tag**
When you open a code fence, write a language identifier immediately after the backticks. Missing identifier 🠖 add it.

**Worked example:**
Prompt: "Return the config as JSON." Draft returns a bulleted list with JSON at the end. Rule 4.2: first element = list ≠ JSON 🠖 discard list, output JSON object only.

**Failure prevented:** *Broken rendering* and *format substitution* - output in a format the user didn't ask for.

---

## 5. Code & Executable Content

**Rule 5.1 - Reference resolution**
When code references a variable, function, or import, confirm it is defined or imported within the shown code (or explicitly noted as external). Undefined reference 🠖 add the definition/import or a comment naming the dependency.

**Rule 5.2 - Placeholder flagging**
When code contains a placeholder (`YOUR_API_KEY`, `example.com`, `TODO`), wrap it in a visible marker and list all placeholders in one line after the code block. Unlisted placeholder 🠖 add it to the list.

**Worked example:**
Snippet calls `parse_date()` but never imports or defines it. Rule 5.1 🠖 add `from utils import parse_date` or define the function inline.

**Failure prevented:** *Non-runnable snippet* - code that fails on first execution for a mechanical reason.

---

## 6. Links & References

**Rule 6.1 - URL provenance**
When output contains a URL, confirm it was either supplied in the conversation or returned by a live lookup this session. Neither 🠖 delete the URL and describe the resource by name instead.

**Rule 6.2 - Citation-claim binding**
When a citation is attached to a claim, confirm the cited material states that specific claim, not merely the same topic. Mismatch 🠖 move the citation to the correct claim or remove it.

**Worked example:**
Draft includes `https://example.org/report-2024.pdf` recalled from memory, not from this session. Rule 6.1 🠖 delete link, write "the organization's 2024 annual report."

**Failure prevented:** *Fabricated link* and *citation laundering*.

---

## 7. Advisory-to-Action Rewriting

**Rule 7.1 - Vague verb replacement**
When your own draft contains "be careful", "ensure", "consider", "try to", or "make sure", replace the phrase with the concrete step that satisfies it. If no concrete step exists, delete the sentence.

**Worked example:**
Draft instruction: "Be careful with user input." Rule 7.1 🠖 "Escape all user input with `html.escape()` before rendering."

**Failure prevented:** *Non-executable advice* - guidance the reader cannot act on.

---

## 8. Scope & Length

**Rule 8.1 - Section budget stop**
When a length or space limit is set, allocate a word budget per section before writing. When a section hits its budget mid-thought, finish the current sentence and end the section. Do not compress remaining sections into fragments; cut whole sections from the end instead.

**Worked example:**
Budget allows 4 of 6 planned sections. Draft attempts all 6 at half depth. Rule 8.1 🠖 restore full depth for sections 1–4, delete 5–6, note the omission in one line.

**Failure prevented:** *Uniform shallowness* - everything covered, nothing usable.

---

## Final Validation Gate

Run after the last edit. Any ✘ 🠖 apply the named rule's fix 🠖 re-run the **entire** gate from item 1. Output may not be sent with any ✘ standing. No exceptions.

| # | Check | Test | Fix rule |
|---|-------|------|----------|
| 1 | All prompt requirements marked ✔ | Rule 1.1 checklist complete | 1.1 |
| 2 | All specified counts match | Recount | 1.2 |
| 3 | Zero `[UNVERIFIED]` tags remain | Text search | 2.1 |
| 4 | All derived numbers recomputed | Rule 2.2 log | 2.2 |
| 5 | Entity table has zero mismatches | Rule 3.1 table | 3.1 |
| 6 | All delimiters paired; format matches request | Rules 4.1–4.2 | 4.x |
| 7 | Code references resolve; placeholders listed | Rules 5.1–5.2 | 5.x |
| 8 | Every URL has session provenance | Rule 6.1 | 6.1 |
| 9 | Zero vague verbs ("ensure", "be careful") | Text search | 7.1 |
| 10 | No section ends in a fragment | Read final sentence of each section | 8.1 |
