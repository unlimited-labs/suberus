# Technology Stack

## Core Stack

**Framework:** Tanstack Start
https://tanstack.com/start/latest

Tanstack Start uses Nitro as a server. Full documentation can be found: https://v3.nitro.build/llms.txt

**Database:** PostgreSQL 18+

**ORM:** Prisma
https://www.prisma.io/docs/llms.txt

**Real-time Sync:** Electric SQL
https://electric-sql.com/llms.txt

**Client Store:** TanStack DB
https://tanstack.com/db/latest

**UI Components:** Shadcn UI + radix-ui + 
https://ui.shadcn.com/llms.txt

**UI Icons:** Tabler Icons
https://tabler.io/icons

**Animations:** tw-animate-css
https://github.com/Wombosvideo/tw-animate-css

**Drag and Drop:** dnd-kit
https://dndkit.com/

**Data Tables:** TanStack Table
https://tanstack.com/table

**Forms:** TanStack Form
https://tanstack.com/form

**Environment Validation:** T3 Env
https://env.t3.gg

**Performance:** React Compiler
https://react.dev/learn/react-compiler

**Auth:** better-auth with Prisma
https://www.better-auth.com/llms.txt

**File Storage:** garage 
https://garagehq.deuxfleurs.fr/
https://garagehq.deuxfleurs.fr/documentation/quick-start/

**Validation:** Zod
https://zod.dev/llms.txt

**Dates & Times:** date-fns (+ @date-fns/tz for IANA timezones)
https://date-fns.org/docs/Getting-Started
https://github.com/date-fns/tz
- Use date-fns for ALL date/time work — formatting, parsing, arithmetic (`addDays`/`addMinutes`/`differenceInCalendarDays`/`compareAsc`…), comparisons (`isAfter`/`isPast`/`isValid`), intervals (`eachDayOfInterval`/`areIntervalsOverlapping`). Do NOT hand-roll with `getTime()` math, `* 60_000`/`MS_PER_DAY` constants, `setHours`/`setDate`, or `toLocaleDateString`/`toLocaleTimeString`.
- Timezone-aware ops use `@date-fns/tz`: `format(d, pattern, { in: tz(zone) })`, `new TZDate(...)`. Shared helpers live in `src/lib/tz-datetime.ts`; display formatting (respecting the user's DATE_FORMAT/TIME_FORMAT settings) in `src/lib/format-date.ts` (+ the `useDateFormat` hook).
- The conference zone is the persisted `CONFERENCE_TIMEZONE` setting (single source of truth, seeded from the browser at install) — pass it explicitly; don't re-detect.

**Email:** Nodemailer (SMTP)
**Containerization:** Docker + Docker Compose


## Deployment

**Self-Hosted (VPS):**
**Docker Compose:** All services in containers
