# Parkora prototype changelog: changes from customer feedback

**Date:** 2026-10-22 · Appendix to [plan.md](plan.md).
**Based on:** the [field observation of 2026-10-19](field_observations.md) and the [street interviews of 2026-10-20 and 2026-10-21](street_interviews.md).
**Prototype:** [web/](web/) (driver, parking attendant, and city government views).

## Why this version

The street interviews ended with a direction to explore: reservations focused on congested zones, variable pricing, rules to extend or end a reservation early, and limits against monopolizing spots. This version of the prototype puts those ideas in front of drivers, so the **next round of interviews can test their reaction to the concrete rules**, not to the abstract idea.

All values below are **reference values for testing**. They are not agreed with any city government. Rates, zones, and hours are set by each city; the Bs figures are the Cochabamba pilot example and are configurable in [web/data.js](web/data.js).

## Changes

| # | Change | Feedback that motivated it |
|---|---|---|
| 1 | Variable pricing by street, time of day, and length of stay | Interviews: manage excess demand with price; spread demand to nearby zones. Field observation: spots full at peak hours, free at night. |
| 2 | Limits per license plate | Interviews: some drivers could reserve the same spot all day, every weekday. |
| 3 | Waitlist | Interviews: priority queue for excess demand. |
| 4 | Extend with priority for the current holder | Interviews: whoever has the spot should have priority to extend. |
| 5 | End early with partial refund and immediate release | Interviews: end early and get part of the money back, or at least free the spot. |
| 6 | Visible continuous enforcement | Interviews: enforcement must be continuous. Survey: top concern is that the reservation won't be respected. |
| 7 | Clearer casual zones and free use after hours | Interviews: keep zones without reservation. Field observation: low demand at night. |

### 1. Variable pricing

Each 30-min block pays the base rate plus the surcharges that apply. The total is rounded to Bs 0.50.

| Factor | Reference value |
|---|---|
| Base rate | Bs 2/hour (current official rate in Cochabamba) |
| High-demand streets (Bolívar, 25 de Mayo) | +25% |
| Peak hours (10:00–12:30, 14:30–16:00) | +50% |
| From the 3rd hour on | +50% |

- The peak hours match the field observation sessions where every spot was full and freed spots were retaken in about 1 minute.
- The map shows a **"Prices right now"** card with each street's hourly rate and marks the cheapest one (Calle Sucre), to nudge drivers toward less congested blocks.
- When choosing a time window, the total shows which surcharges it includes.

**Example:** at peak hour, Calle Bolívar costs Bs 3.50/hour and Calle Sucre Bs 3/hour. Off-peak, Calle Sucre costs the base Bs 2/hour.

### 2. Limits per license plate

- 1 reservation at a time.
- Up to 2 reservations per day.
- Reservations on up to 3 different days per week.

The limits are shown before paying, so drivers understand why they exist ("so nobody keeps a spot all week").

### 3. Waitlist

- If the chosen time is already taken, the driver can join the waitlist for that spot and time.
- When the spot frees up (someone cancels, ends early, or doesn't arrive), the first person in line sees **"Free now!"** with a link that opens the reservation with the time already filled in.

### 4. Extend with priority

- During an active reservation, the driver can extend by 30 min or 1 hour and pays the difference.
- The **30 min after a reservation are held for its holder** until 15 min before it ends. Until then, nobody else can reserve that time; after that, it opens to everyone.

### 5. End early

- A **"I'm leaving: end now"** button frees the spot for others immediately.
- The driver gets back **50% of the unused time**.

### 6. Visible continuous enforcement

- **Driver:** the confirmation states that parking attendants patrol the zone every 30 min, shows the last round, and promises a response within 15 min if the spot is taken.
- **Parking attendant:** a "Patrol round" card with a "Round done" button. It turns red when a round is overdue.
- **Parking attendant:** a "Car didn't arrive: release the spot" button, available after the 15-min late-arrival tolerance. The reservation is marked as a no-show (no refund) and the waitlist is notified.

### 7. Casual zones and after-hours use

- Spots without reservation (No. 10, 20, 21, 30) are explained as first come, first served, for quick stops or drivers who couldn't reserve.
- The app states that **after 16:00 every spot works without a reservation**, matching the low night demand seen in the field.

### City government dashboard

- Four new metrics: average price per reserved hour, spots released early (ended early or no-show), people on the waitlist, and patrol rounds today.
- The pilot rules list now includes variable pricing, limits, extending, ending early, the waitlist, enforcement, and casual spots.

## What to ask drivers about this version

- **Variable pricing:** Is paying more at peak hours or on busy streets acceptable? Would a cheaper street one block away change where they park?
- **Limits:** Are the per-plate limits fair? Do they affect people who work in the area?
- **Waitlist:** Would they use it, or just look for another spot?
- **Extend and end early:** Are these rules clear? Is a 50% refund enough to make them end early?
- **Enforcement:** Does the patrol message make them trust that the reservation will be respected?

## Known limitations of the prototype

- **Reference values only.** Prices, limits, and times are placeholders to test reactions, not a pricing proposal.
- **Simulated payments.** Extensions are charged and refunds paid without a real payment provider.
- **Real clock.** The prototype uses the device's time. Near 16:00 there are almost no reservable times; outside 08:00–16:00 it simulates 11:00 (peak hour).
- **Rounding.** Because totals are rounded to Bs 0.50, extension prices can look uneven (e.g., +Bs 1 for 30 min but +Bs 3 for 1 hour).
- **Misleading message.** When a driver picks a free spot at a time that overlaps their own reservation, the error says the spot is taken instead of "1 reservation at a time". The limit itself works.
- **Waitlist is single-device.** Notifications appear only inside "My reservations"; there are no SMS or WhatsApp alerts.
- **Saved demo data resets.** Data saved by the previous version in the browser is discarded on first load.
- **Automatic demo not re-checked.** The presentation's automatic walkthrough (`?demo=1`) was not re-run with this version.

## Next steps

- Run the next round of street interviews with this version and record reactions to each rule.
- Update the MVP system rules with the rules that hold up.
- Check with the city government whether variable pricing and per-plate limits are allowed (the city sets the rates).
