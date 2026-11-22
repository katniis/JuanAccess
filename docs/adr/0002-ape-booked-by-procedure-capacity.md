# APE Bookings are booked by Procedure capacity, not Practitioner slots

Every other Appointment books a timed slot with one Practitioner, room and piece of equipment. An APE Booking instead reserves a date and Arrival Window. A window can be picked only if every Procedure in the APE Package has capacity left in it, on a day that Procedure is offered. Practitioners are assigned on the day by staff, from whoever is on duty, through Station Assignment. We chose this because an APE is a station queue run by several Professions (nurses, med techs, radiologic techs, physicians), not a consult with one doctor. Who is on duty can also change between booking day and visit day.

## Considered Options

- **A timed slot per Procedure, possibly across days**: rejected as too much for patients to book, and it fights the fasting, single-morning reality of an APE.
- **One start time, with timed Procedure slots auto-sequenced back to back**: rejected. One late station would break the whole chain.

## Consequences

An APE Booking has no Practitioner, room or timed slot when it is booked, so code that assumes every Appointment has them must handle the APE case. APE Bookings have no waitlist: when a window is full, the patient picks another.
