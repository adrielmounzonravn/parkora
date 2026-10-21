# Parkora street interviews: drivers on the MVP blocks

**Dates:** 2026-10-20 and 2026-10-21 · Appendix to [evidence.md](evidence.md) and [plan.md](plan.md).
**Follows:** the [field observation of 2026-10-19](field_observations.md), on the same blocks.

The interviews were in Spanish. Answers and suggestions below are translated and summarized.

## Why these interviews

The online survey ([evidence.md, section B](evidence.md#b-survey-results)) had two weaknesses:

- **Who answered:** 7 responses in ~30 minutes, probably from my close circle. They may or may not be drivers who actually suffer the problem.
- **How they answered:** closed options chosen in a form, with no chance to ask why or to hear ideas.

These interviews fix both. Instead of waiting for whoever fills in a form, I went to the street and chose the people **by what they did**, not by who they are.

## Method

- **Place:** the MVP pilot blocks in Centro Cochabamba: Calle 25 de Mayo, Calle Bolívar, and Calle Sucre (same as the field observation and the prototype).
- **Who:** drivers **completely unknown to me**, whom I saw parking in the area or **circling the block before finding a spot**. In other words, people I watched lose time looking for parking, the exact customer Parkora is for.
- **Format:** short in-person conversation:
  1. Is it usually hard for you to find parking in this area?
  2. Would you pay the same or more to have your spot reserved, waiting for your arrival?
  3. Quick look at the deployed MVP (prototype) so they understand the idea.
  4. Open question: suggestions or things to take into account.
- **Interviewees:** 3.

## Why these interviews carry a lot of weight

- **It's the right population, by selection.** Each interviewee was chosen because I saw them parking or circling in the pilot area. They are not random people answering a form: they are the target customer, at the place and time the problem happens.
- **No close-circle bias.** None of them knew me, so there was no reason to answer out of friendliness to me.
- **Problem and answer in the same moment.** They answered right after living the problem, not from memory.
- **Open conversation, not limited options.** They could explain, react to the real prototype, and propose things the survey could never have captured (see the suggestions below).

## Results

| Question | Result |
|---|---|
| Is it usually hard to find parking in this area? | **3/3**: almost always hard during working hours |
| Would you pay the same or more for a reserved spot? | **3/3**: completely willing to pay **a little more** than today for a guaranteed spot |
| Reaction to the MVP | **3/3** approved it and liked the idea a lot |

- **The pain matches the field observation:** hard during working hours, consistent with the full spots and ~1-min refill times measured in the morning and afternoon, and with free spots at night.
- **Willingness to pay is above "the same":** all three said "a little more", the same signal as the survey ("quite a bit more, if it really guarantees me the spot").

## Suggestions from the interviewees

### 1. Enforcement must be continuous

The city government and its parking attendants must enforce the reserved spots **continuously**. Without that, people won't respect them.

- **Confirms** the survey's top concern: that the reservation won't be respected (4/6 comments).
- Reinforces that enforcement is **the condition for the product to work**, not a detail (assumptions #5 and #6).

### 2. Excess demand: people who would reserve all day, every weekday

If the street already fills up on its own, a reservation system doesn't create spots; it decides **who gets them**. Some drivers (e.g., people who work in the area) could reserve the same spot all day, Monday to Friday, and leave everyone else out. Ideas from the interviewees:

- A **priority queue**.
- A **limit on how often** someone can reserve.
- **Higher prices in certain zones**, to spread demand to nearby zones that are less congested.
- **Variable prices by time of day or by length of stay**.

This is new. The survey only raised the opposite angle (a respondent asking for recurring reservations as a feature).

### 3. Keep some zones outside the reservation system

Leave some zones free for drivers who only need to stop for a few minutes or who can't reserve at that moment.

- **Confirms** the existing decision to keep **casual zones** (no reservation).

### 4. Extending or shortening a reservation

- **Extending:** whoever already has the spot should have **priority** over someone new who wants to reserve it.
- **Leaving early:** the driver should be able to end the reservation early and get **part of the money back**, or at least have the spot **marked as free** for others.

- **New.** Today the MVP rules only cover cancellation before arrival and late departure as a violation ([mvp.md, section 4](mvp.md#4-system-rules)).

## What this means

1. **Pain and willingness to pay are confirmed in the right population.** The survey suggested it with a sample of doubtful origin; here it appears 3/3 in drivers chosen because they suffer the problem.
2. **The value is the guaranteed spot,** and they would pay a little more for it. This supports the message "arrive with your spot guaranteed".
3. **Direction to explore: refocus the product.**
   - Reservations only in **certain zones** (the most congested ones), with casual zones around them.
   - **Variable pricing** by **time of day, zone, and length of stay**, to manage excess demand and spread congestion to nearby zones.
   - Rules to **extend** (priority to the current holder) and **end early** (partial refund or release the spot).
   - Limits against **monopolizing** spots (frequency limit, queue, or price).

   This direction **will be validated and adjusted** progressively. It does not yet change the MVP rules.

## Limitations

- **3 interviews.** A strong signal because of who they are, but a small number.
- **Stated, not demonstrated:** they said they would pay a little more; nobody has paid yet.
- **Seeing the prototype may have made the answers more favorable** (the idea looks finished and attractive).
- One area (Centro) and working hours only.

## Next steps (to decide)

- Turn the suggestions into concrete rules for the MVP: pricing by zone, time, and duration; extend and end early; limit on repeated reservations.
- Check whether variable pricing is acceptable to the city government (it sets the rates) and to drivers.
- Repeat the street interviews with more drivers, and ask for a commitment (contact or pre-reservation) to move from what they say to what they do.
