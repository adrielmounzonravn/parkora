# Parkora field observation: parking times in Centro Cochabamba

**Date:** 2026-10-19 (Monday) · Appendix to [evidence.md](evidence.md) and [plan.md](plan.md).
**Raw data:** [data/field_observations_2026-10-19.csv](data/field_observations_2026-10-19.csv)

## Why this observation

The survey ([evidence.md, section B](evidence.md#b-survey-results)) asked drivers how long it took them to find parking, using ranges (e.g., "5 to 10 min"). Two problems with that:

- The ranges lose precision, and one of them touched the 10-min threshold of criterion 1.
- Nobody times how long it takes to find parking, so the answers are an **impression** that can be higher or lower than reality.

To see what actually happens, and not only what drivers say, I went to the same streets as the MVP pilot and timed drivers with a stopwatch.

## Method

- **Place:** the MVP pilot blocks in Centro Cochabamba: Calle 25 de Mayo, Calle Bolívar, and Calle Sucre (same spots as the prototype, [web/data.js](web/data.js)).
- **Sessions:** three on the same day: morning (10:00–12:00), afternoon (14:30–16:30), and night (19:00–20:00).
- **Measurement 1, spot refill time:** seconds from when a car leaves an on-street spot until another car occupies **that same spot**.
- **Measurement 2, search time:** I identified a car that was looking for parking in the area and followed it, timing it until it parked.
- **Observer:** one person, manual stopwatch.

## Results

### Spot refill time (seconds)

| Session | n | Values | Median | Mean | Range |
|---|---|---|---|---|---|
| Morning, 10:00–12:00 | 5 | 37, 15, 98, 43, 67 | **43** | 52 | 15–98 |
| Afternoon, 14:30–16:30 | 7 | 115, 42, 53, 88, 74, 55, 38 | **55** | 66 | 38–115 |
| Night, 19:00–20:00 | 3 | 153, 221, 142 | **153** | 172 | 142–221 |
| **Peak (morning + afternoon)** | 12 | | **54** | 60 | 15–115 |

- **Morning:** every on-street spot was already occupied when I arrived.
- **Night:** values are higher and not directly comparable. There were free spots, so arriving drivers parked in other spots instead of the one that had just been freed.

### Search time of a driver looking for parking

| Session | Time | What happened |
|---|---|---|
| Morning | **433 s (7 min 13 s)** | 3 laps around the block before finding a freed spot; slowed down by traffic in the area |
| Afternoon | **351 s (5 min 51 s)** | Laps around the block before finding a freed spot |
| Night | — | I couldn't identify any car searching |

## What this means

1. **There is high demand at specific times, confirmed by behavior, not just opinions.** In the morning and afternoon the spots were full, and every freed spot was taken again in under 2 minutes (median ~1 min). Demand is higher than the supply of on-street spots at those hours.
2. **Finding parking takes real time, and it's spent circling.** The two drivers I followed needed ~6 to 7 minutes and several laps around the block. This supports the problem (assumption #3) and the congestion argument for the city: cars circling add traffic to blocks that are already congested.
3. **The magnitude matches the survey.** The survey's most common answer was "5 to 10 min", and the measured times fall in that same range. Drivers did not exaggerate, but the typical search is still **below the 10-min threshold** of criterion 1. The observation confirms that the pain is real and frequent at peak times, not that it is larger than the survey showed.
4. **The problem depends on the time of day.** At night there were free spots and demand dropped. This supports focusing reservations on peak hours (for example, reservation zones active only at certain times, or casual parking at night). It also supports measuring success by time slot, not as a daily average.
5. **Implication for the model:** at peak hours spots are effectively at ~100% occupancy, with almost no idle time between cars. The volume estimate in [plan.md, section 5](plan.md#5-pricing-marketing-and-first-paying-customers) (~4 to 6 reservations per spot per day) is limited by stay length, not by lack of demand, at least during those hours.

## Limitations

- **One day, one observer, a weekday.** It doesn't show weekends or how much it varies between days.
- **Small sample:** 15 refill times and only 2 followed cars.
- **Search time is a lower bound:** I started timing when I identified the car, so it may have been searching before.
- I didn't record which street each measurement was on, or how many spots were on each block.
- Night refill times measure something different (there were free spots), so they are not a measure of demand at the same level as the other sessions.

## Next steps (to decide)

- Analyze these data in more depth to identify concrete problems (e.g., which hours are critical, how much circling traffic there is).
- Repeat the observation in other areas from the survey (La Cancha, university area, hospital area) and on other days, including weekends.
- In a repeat, record the street, the number of spots per block, and more followed cars per session.
