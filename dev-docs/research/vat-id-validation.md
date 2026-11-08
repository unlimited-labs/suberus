# Research: VAT ID validation sources

Issue: unlimited-labs/suberus#136 (map #135 "Configurable Billing details at registration"). Feeds #137 "VAT ID validation behaviour". Date: 2026-11-08. Repo at `788a20b1` (= `origin/master`).

Question: what can validate a **VAT ID** (the tax ID of the organization being invoiced, with country prefix, e.g. `PL5260250995`) that a participant enters at registration, and how reliably?

Method: library sources and npm metadata were read, bundles measured with esbuild, and every government endpoint below was called live on 2026-11-08 (Sunday, around 11:25–11:35 UTC) from a Polish network. "Observed" means a live call. Everything else cites its source.

## Summary table

| Source                                                  | Coverage                                                                                        | Latency (observed)                                                                                             | Availability                                                                                                                     | Auth                                                                                       | Terms / limits                                                                                                                                                        | Cost               | Sync in form submit?                                                                 |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------ |
| Offline checksum: `stdnum` 1.13.1                       | 29 VAT prefixes in `euVat` (EU minus XI, plus AD, CH) and about 90 countries' tax IDs in total  | in-process, µs                                                                                                 | always                                                                                                                           | none                                                                                       | MIT                                                                                                                                                                   | free               | yes, client and server                                                               |
| Offline checksum: `jsvat` 2.5.4                         | 35 countries (EU-27, GB, CH, NO, AD, BR, RU, RS)                                                | in-process                                                                                                     | always                                                                                                                           | none                                                                                       | MIT                                                                                                                                                                   | free               | yes                                                                                  |
| Offline: `validator` `isVAT` 13.15.35                   | 68 countries, but **regex only** except AU, CH, PT                                              | in-process                                                                                                     | always                                                                                                                           | none                                                                                       | MIT                                                                                                                                                                   | free               | yes, format only                                                                     |
| **EU VIES** (REST and SOAP)                             | EU-27 + XI (Northern Ireland), only numbers registered for intra-EU trade                       | 0.12–0.45 s for healthy states; 6.7–7.1 s for states flagged unavailable; FI failed fast with `MS_UNAVAILABLE` | per member state, with published daily or weekly downtime windows; 5 of 28 states flagged "Unavailable" at the time of the probe | none                                                                                       | single requests only, no batch; use limited to VAT due diligence; concurrency errors (`MS_MAX_CONCURRENT_REQ`, `GLOBAL_MAX_CONCURRENT_REQ`) with no published numbers | free               | yes, with a timeout and a fallback for unavailable states                            |
| PL **MF "Biała lista"** (`wl-api.mf.gov.pl`)            | PL NIPs in the VAT register: active, exempt, removed                                            | 0.12 s                                                                                                         | no published downtime                                                                                                            | none                                                                                       | `search`: 100 queries/day of up to 30 entities; `check`: 5,000 entities; `api2/status`: 50,000 queries/day; may block until 0:00                                      | free               | yes                                                                                  |
| PL **GUS BIR** (REGON)                                  | every entity with a REGON or NIP, VAT-registered or not (universities, institutes, foundations) | 0.08–0.41 s (test env)                                                                                         | no published downtime                                                                                                            | user key issued by email (`regon_bir@stat.gov.pl`), SOAP session                           | 3–4 req/s, 6,000–10,000 req/h depending on time of day                                                                                                                | free               | technically yes; SOAP 1.2 + WS-Addressing + MTOM, so a server-side adapter is needed |
| UK **HMRC** Check a UK VAT number v2.0                  | GB VAT numbers (XI is covered by VIES)                                                          | not measured (needs credentials)                                                                               | not published by HMRC; VIES help lists XI (HMRC-backed) as down Sat 07:30–10:30 and around 04:30 daily                           | OAuth 2.0 client credentials, scope `read:vat`, Developer Hub registration (about 2 weeks) | 3 req/s per application; "sole purpose" of trader due diligence                                                                                                       | free               | yes, after registration                                                              |
| CH **UID register** (`uid-wse.admin.ch` PublicServices) | Swiss UID / MWST numbers                                                                        | 0.16 s                                                                                                         | not published                                                                                                                    | none for PublicServices                                                                    | no documented limit found; 25 calls in a row all passed                                                                                                               | free               | yes                                                                                  |
| NO **Brønnøysund** Enhetsregisteret                     | every Norwegian org number, with `registrertIMvaregisteret` flag                                | 0.29 s                                                                                                         | not published                                                                                                                    | none (open data)                                                                           | NLOD 2.0 licence                                                                                                                                                      | free               | yes                                                                                  |
| AU **ABN Lookup**                                       | Australian ABN, incl. GST status                                                                | not measured                                                                                                   | not published                                                                                                                    | GUID by email after accepting the web services agreement                                   | agreement terms                                                                                                                                                       | free               | yes, after registration                                                              |
| US **IRS TIN Matching**                                 | EIN/SSN against name                                                                            | n/a                                                                                                            | n/a                                                                                                                              | IRS e-Services, payers of information returns only                                         | only for payers filing information returns                                                                                                                            | n/a                | **not usable** by a conference                                                       |
| **Stripe** tax ID verification                          | registry check for EU VAT (VIES), GB VAT (HMRC), AU ABN; format-only for the other 100+ types   | "usually a few seconds", async                                                                                 | Stripe retries on registry downtime                                                                                              | Stripe API key                                                                             | tied to a Stripe Customer object                                                                                                                                      | included in Stripe | **no**, result arrives by webhook                                                    |

## 1. Offline format and checksum validation

No checksum library is in the lockfile today (`pnpm-lock.yaml` has no `validator`, `jsvat` or `stdnum`). `dev-docs/STACK.md` names Zod for validation and has no entry for tax IDs. Zod has no VAT validator, so a library would go behind `z.string().refine()` or `superRefine`. Polish NIP is a weighted mod-11 checksum, so a hand-rolled rule for one country is a few lines. For all EU states it means maintaining about 28 algorithms that the Commission does not publish (VIES FAQ q11: "The European Commission cannot divulge these algorithms").

| Library                                                                 | Version / last release                  | Repo activity                                | Countries                                                                                                                                                                                      | Checksums                                                                           | Bundle (esbuild, minified / gzip)                                       | Notes                                                                                                                                                                |
| ----------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`stdnum`](https://github.com/koblas/stdnum-js) (port of python-stdnum) | 1.13.1, 2026-11-08 (1.12.x in Aug 2026) | 64 stars, pushed 2026-11-08, 17 open issues  | `euVat` map: AD AT BE BG CH CY CZ DE DK EE ES FI FR GR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK. About 90 countries in all, incl. `US.ein`, `GB.vat`, `NO.mva`, `PL.nip`/`regon`, `CH.vat` | yes, typed errors (`InvalidChecksum`, `InvalidLength`, `InvalidFormat`)             | `stdnum/pl` subpath: 5.6 KB / 2.1 KB; whole `euVat` map: 41 KB / 9.9 KB | ESM + CJS + TS types, per-country subpath exports. Accepts `PL` prefix and dashes. Key is `GR`, not VIES's `EL` (`GR.vat` accepts `EL…`). No `XI` (Northern Ireland) |
| [`jsvat`](https://github.com/se-panfilov/jsvat)                         | 2.5.4, 2024-12-12 (previous 2021)       | 140 stars, pushed 2026-03-18, 28 open issues | 35: EU-27, GB, CH, NO, AD, BR, RU, RS                                                                                                                                                          | yes                                                                                 | one country: 1.6 KB / 0.9 KB; all: 15.5 KB / 5.0 KB                     | zero deps. Expects the prefix (`5260250995` without `PL` was matched as BR and failed). Handles `EL`; no `XI`. Slow release cadence                                  |
| [`validator`](https://github.com/validatorjs/validator.js) `isVAT`      | 13.15.35, 2026-04-02                    | 23.7k stars, active                          | 68 countries                                                                                                                                                                                   | **only AU, CH, PT**; the other 65 are regexes. Checksum-wrong `PL5260250996` passes | 4.6 KB / 1.4 KB                                                         | catches typos in length only                                                                                                                                         |

Observed sanity check: `PL5260250995` (valid) and `PL5260250996` (last digit changed): `stdnum` and `jsvat` accept the first and reject the second; `validator` accepts both.

What offline validation cannot tell: whether the number exists, whether it is VAT-registered, or whom it belongs to.

## 2. EU VIES

Sources: [VIES WSDL](https://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl), [REST swagger](https://ec.europa.eu/assets/taxud/vow-information/swagger_publicVAT.yaml), VIES FAQ and help text (served from `https://ec.europa.eu/taxation_customs/vies/app/assets/i18n/en.json`, the SPA's text bundle), live calls.

**Endpoints** (base `https://ec.europa.eu/taxation_customs/vies/rest-api`, no auth, JSON):

- `GET /ms/{CC}/vat/{number}`: simple check. Returns `isValid`, `userError`, `name`, `address`, `requestDate`, `requestIdentifier` (always empty here).
- `POST /check-vat-number` with `{countryCode, vatNumber, requesterMemberStateCode?, requesterNumber?, traderName?, …}`: returns `valid`, `name`, `address`, approximate-match fields and, when a requester is given, `requestIdentifier`.
- `GET /check-status`: per-state `availability`.
- `POST /check-vat-test-service`: fixed answers for tests (`vatNumber: "100"` → valid, "John Doe").
- SOAP: `checkVat` and `checkVatApprox` on `…/vies/services/checkVatService` (same backend, same FAQ and disclaimer).

**Coverage.** EU-27 plus `XI` (Northern Ireland). Greece uses `EL`, not `GR`. Austria needs the `U` (`ATU…`) (FAQ q19). A number is checked live against the issuing state's database; "There does not exist a European data base" (q20).

**Valid number, INVALID in VIES.** FAQ q7: "Some Member States require an additional registration for intra-EU transactions and record in their national VIES databases only such VAT numbers; therefore, it is possible that a VAT number, even if correct, will not be validated through VIES". Poland is one of them (registration as "podatnik VAT UE"). A Polish entity can be an active VAT payer on the MF white list and still be INVALID in VIES.

**Name and address are withheld by some states.** FAQ q15: "If no name/address is displayed, this means that the relevant Member State does not permit the display of this data." Observed: DE (`DE143454214`) and ES (`ESA28015865`) returned `VALID` with `name: "---"`, `address: "---"`. PL, CZ and FR returned full name and address.

**Errors.** WSDL documentation: `INVALID_INPUT`, `GLOBAL_MAX_CONCURRENT_REQ`, `MS_MAX_CONCURRENT_REQ`, `SERVICE_UNAVAILABLE`, `MS_UNAVAILABLE`, `TIMEOUT`. The SPA text also has `…_TIME` variants ("in the current timeslot") and `INVALID_REQUESTER_INFO`. No numeric limit is published.

- Observed trap: on the `GET` endpoint, `MS_UNAVAILABLE` comes back as **HTTP 200 with `isValid: false`** (FI, 0.15 s). Only `userError` tells "unavailable" from "invalid". On `POST /check-vat-number` it comes back as HTTP 200 `{"actionSucceed": false, "errorWrappers": [{"error": "MS_UNAVAILABLE"}]}`.

**Availability.** Published windows (VIES help text; time zone not stated):

| State                            | Window                                           |
| -------------------------------- | ------------------------------------------------ |
| AT                               | around 06:00 daily, a few minutes                |
| CZ                               | around 07:00 daily, about 20 min                 |
| DE                               | **available only 05:00–23:00**                   |
| DK                               | 04:00–05:00 daily; Tue 06:45–07:15               |
| ES                               | around 23:00 daily, a few minutes                |
| FI                               | Sun 05:40–05:50                                  |
| FR                               | 01:30–01:40 almost daily                         |
| IE                               | Sunday nights, up to 2 h                         |
| IT                               | Mon–Sat from 20:00 for 30–60 min                 |
| MT                               | Thu 07:00–07:30                                  |
| NL                               | **Sat 21:50 to Sun 21:40**                       |
| PT                               | Fri around 23:30, 30+ min                        |
| RO                               | **Sat 21:50 to Sun 21:50**, almost every weekend |
| SI                               | a few hours at night                             |
| XI (and the former GB entry)     | Sat 07:30–10:30; around 04:30–04:40 daily        |
| BE CY EE EL HU LT LU LV PL SE SK | 24/7 (BG "Unknown", HR not listed)               |

FAQ q14: "Some parts of the system may be unavailable at certain times due to the necessity to back-up the Member States' databases."

Observed `check-status` at 11:25 UTC Sunday: CZ, EE, FI, FR, LT "Unavailable", the rest "Available". The flag did not predict the result: CZ (`CZ00177041`) and FR (`FR40303265045`) still answered `VALID` with name and address, but took **6.7 s and 7.1 s**. FI failed fast with `MS_UNAVAILABLE`.

**Latency (observed).** 18 sequential calls: PL 0.20–0.27 s, DE 0.20–0.23 s, IT 0.29–0.44 s. States flagged unavailable: about 7 s or a fast failure.

**Consultation number as proof.** Help text: "If you put your own VAT identification number in the box requester's VAT identification number, the reply will contain a unique consultation number. If you want to be able to prove to a tax administration of a Member State that you have checked a given VAT number at a given time, and obtained a given validation reply, please keep this consultation number in your archives." It also says this is "only ONE of the elements of evidence". Observed:

- With a requester (`PL6750001923`) the POST returned `requestIdentifier: "WAPIAAAAaG66JGsQ"`.
- A requester that fails the checksum (`PL1234567890`) got `INVALID_REQUESTER_INFO`.
- A requester that passes the checksum but is **not registered** (`PL1111111111`, which VIES itself reports INVALID) still got a `requestIdentifier`. The requester number is checksum-checked, not registry-checked.
- The requester must be an EU or XI VAT number, i.e. the **organizer's** VAT ID. The identifier proves the organizer checked, so it is per conference, not per Suberus deployment.

**Terms.** WSDL/disclaimer: the site exists to let "persons involved in the intra-Community supply of goods or of services … obtain confirmation of the validity of the VAT identification number"; "Any other use and any extraction and use of the data which is not in conformity with the objective of this site is strictly forbidden"; retransmission is forbidden except "as far as is necessary to support the activity of a legitimate user (for example: to draw up their own invoices)". FAQ q5: "No [batch]. The system is designed for single requests." The Commission "accepts no responsibility" for data quality, and q16 makes the same terms apply to the SOAP/REST service.

## 3. National registers beyond VIES

### Poland

**Domestic invoices use the bare NIP.** The official KSeF FA(3) schema ([`crd.gov.pl/wzor/2025/06/25/13775/schemat.xsd`](https://crd.gov.pl/wzor/2025/06/25/13775/schemat.xsd), `TPodmiot2`) identifies the buyer as one of: `NIP` (10 digits, no prefix), `KodUE` + `NrVatUE` (EU VAT ID), `KodKraju` + `NrID` (any other tax ID), or `BrakID` ("Podmiot nie posiada identyfikatora podatkowego"). A Polish organizer invoicing a Polish university writes `NIP=6750001923`, not `PL6750001923`. A foreign buyer without a VAT number is a valid case (`BrakID` or `NrID`).

**MF "Biała lista" / Wykaz podatników VAT** ([API page](https://www.gov.pl/web/kas/api-wykazu-podatnikow-vat), [`wl-api.mf.gov.pl`](https://wl-api.mf.gov.pl/)), spec v1.6.2 dated 2026-11-05:

- No auth. Test env `https://wykazpodatnikowvat-test.mf.gov.pl/api/` and `/api2`.
- Limits (gov.pl): `search` "100 zapytań dziennie o maksymalnie 30 podmiotów"; `check` 5,000 entities; **API WL2 (`/api2/status/nip/{nip}`) 50,000 queries/day**. "Po wyczerpaniu jednego z limitów dostęp do API może być zablokowany do godziny 0:00"; blocking is optional and also covers the website.
- `api2/status` (observed, 0.12 s) returns `statusCode` `C` (active), `Z` (exempt), `B` (not in the VAT register), `I` (invalid NIP), plus `D`, `N`, `X` per the spec page, with a `requestId` (e.g. `hCQTx-997g5fj`). No name or address.
- `api/search/nip/{nip}?date=` returns name, `statusVat`, REGON, KRS, addresses, bank accounts, registration and removal dates, and `exemptionSmeDate`. A NIP outside the register returns `subject: null`. It shares the 100/day limit.
- It covers the **VAT register only**. It does not say whether the entity is registered for intra-EU trade (that is VIES). A non-VAT entity is `B` / `null`.

**GUS BIR (REGON)** ([api.stat.gov.pl](https://api.stat.gov.pl/Home/RegonApi)):

- Free. Production user key by email to `regon_bir@stat.gov.pl` with organization name, REGON, contact, **source IP addresses** and expected concurrency.
- Versions: BIR 1.1 (May 2019) and BIR 1.2 (December 2024).
- Limits: 08:00–16:59: 6,000/h, 120/min, 3/s; 06:00–07:59 and 17:00–21:59: 8,000/h, 150/min, 3/s; 22:00–05:59: 10,000/h, 200/min, 4/s. "Usługobiorcy przekraczający limity będą informowani" (no immediate block).
- Observed on the test endpoint (`wyszukiwarkaregontest.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc`, public test key `abcde12345abcde12345`): `Zaloguj` returns a session id (0.41 s), and `DaneSzukajPodmioty` by NIP returns REGON, name and address (0.08 s). Test data is anonymised: the street came back as "ul. Test-Krucza".
- It is the only Polish source that covers entities **outside** the VAT register (public bodies, foundations, associations, VAT-exempt institutes). It does not say anything about VAT status.

Universities: AGH (`6750001923`) is `VALID` in VIES, `Czynny` on the white list and present in REGON. A university being in VIES is common but not guaranteed: it depends on whether it registered as a VAT-UE payer.

### United Kingdom: HMRC "Check a UK VAT number" v2.0

Sources: [Developer Hub page](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/vat-registered-companies-api/2.0), [OpenAPI in `hmrc/vat-registered-companies-api`](https://github.com/hmrc/vat-registered-companies-api/blob/main/public/api/conf/2.0/application.yaml), [rate limits](https://developer.service.hmrc.gov.uk/api-documentation/docs/reference-guide).

- "Version 1 was removed on 17 February 2025". v2.0 (beta, page updated 2026-10-14) is "behind authentication": OAuth 2.0 **client credentials**, scope `read:vat`. Registration "should take around 2 weeks"; production credentials come after sandbox testing and accepting Terms of Use 2.0.
- `GET /organisations/vat/check-vat-number/lookup/{targetVrn}` returns name, address and `processingDate`. `…/{targetVrn}/{requesterVrn}` adds a `consultationNumber`, but the **requester must be a UK VRN**, so a non-UK organizer gets no proof reference.
- 404 `NOT_FOUND` for unregistered numbers. "Standard limit is 3 requests per second per application", then 429.
- Purpose: "for the sole purpose of allowing traders to do due diligence on VAT-registered businesses".
- Credentials are per application. For Suberus that means either one registration by the vendor shared by all instances, or a registration per organizer.

### Switzerland: UID register

- `https://www.uid-wse.admin.ch/V5.0/PublicServices.svc` (SOAP 1.1). Operations: `ValidateVatNumber`, `ValidateUID`, `GetByUID`, `Search`, `GetOrganisationSample`. Per the BFS description, PublicServices work without login in "a restricted form"; PartnerServices need a login.
- Observed: `ValidateVatNumber("CHE-116.281.710")` → `true`, `CHE-000.000.000` → `false`, 0.16 s. 25 consecutive calls all returned 200.
- I found no published rate limit. The BFS pages now redirect to a language picker, so the official interface page could not be read.
- `ValidateVatNumber` returns a bare boolean. Name and address need `GetByUID`.

### Norway: Brønnøysund Enhetsregisteret

- `GET https://data.brreg.no/enhetsregisteret/api/enheter/{orgnr}`. No auth, NLOD 2.0 licence ([docs](https://data.brreg.no/enhetsregisteret/api/dokumentasjon/en/index.html)).
- Returns name, addresses, organization form and `registrertIMvaregisteret`. 404 for unknown numbers, 410 for deleted entities.
- Observed: 0.29 s. Brønnøysund registry unit `974760673` → `registrertIMvaregisteret: false`; UiT The Arctic University `970422528` → `true`.
- A Norwegian VAT ID is `NO` + 9-digit org number + `MVA`. The register answers both "does the org exist" and "is it VAT-registered".

### Others relevant to scientific conferences

- **Australia, ABN Lookup** ([web services](https://abr.business.gov.au/Tools/WebServices)): free. GUID issued by email after accepting the agreement. SOAP, with limited JSON for ABN and name search.
- **Austria** has its own FinanzOnline UID-Abfrage. Per a BMF document found in search (not opened), each UID may be queried twice per day per participant since April 2023. VIES already covers AT.
- Japan (NTA invoice registration), India (GSTIN), Ukraine, Turkey and other frequent conference countries: **not investigated**. Stripe's tax ID table lists their formats; Stripe checks them by format only.

## 4. Countries with no usable registry check

- **US EIN**: IRS TIN Matching is "only for payers and their authorized agents that submit information returns" (Forms 1099) ([IRS](https://www.irs.gov/tax-professionals/taxpayer-identification-number-tin-matching)). A conference cannot use it. `stdnum`'s `US.ein` checks only the format and that the 2-digit prefix is one the IRS assigns. The US has no federal VAT, so an EIN is not a VAT ID.
- **Stripe** ([Customer tax IDs](https://docs.stripe.com/billing/customer/tax-ids)): over 100 tax ID types, but "Stripe only checks the format of tax ID types other than AU ABN, EU VAT, and GB VAT". Registry checks are async (`verification.status`: `pending`, `verified`, `unverified`, `unavailable`, via `customer.tax_id.updated`). It needs a Stripe Customer object. The map puts passing Billing details to Stripe out of scope.
- For every other non-EU country the realistic ceiling is a format or checksum check where a library has one, otherwise accept free text.

## Implications for Suberus (facts #137 depends on)

1. **Admission to a scientific event is taxed where the event takes place, even B2B.** Directive 2006/112/EC Art. 53: "The place of supply of services in respect of admission to … scientific, educational … events … supplied to a taxable person, shall be the place where those events actually take place." Conference fees therefore usually do not get EU reverse charge, and the VAT ID is needed mainly to print on the invoice and identify the buyer, not to zero-rate. VIES's stated purpose is intra-Community supplies, and its terms allow use "to draw up their own invoices". Whether conference registration fits that purpose is a judgment for #137, not settled here.
2. **One field can hold two kinds of number.** A Polish buyer of a Polish organizer is invoiced by bare NIP, and the NIP may be valid while VIES says INVALID (not VAT-UE registered) or the white list says `B` (not VAT-registered at all). A strict "must pass VIES" rule rejects legitimate domestic institutions. KSeF also accepts `BrakID` (no tax ID) and `NrID` (non-EU tax ID).
3. **Country of the VAT ID ≠ participant country.** The map decides on a single `country` (the participant's). The VAT ID prefix carries its own country (a Polish researcher invoiced to a German institute). Validation keys on the prefix.
4. **Offline checksum is reliable and cheap.** `stdnum` covers all EU-27 + CH/NO/GB/AD with checksums, about 2 KB gz per country or about 10 KB gz for all EU, and runs the same in the browser and on the server, so it fits a Zod refine shared by the UI, server function and MCP tools. Gaps in every library: no `XI`; `GR` vs `EL` naming in `stdnum`; prefix handling differs between libraries.
5. **VIES can run synchronously only with a fallback.** Typical 0.2–0.45 s, but about 7 s for degraded states, scheduled downtime up to a whole weekend (NL, RO) or every night (DE 23:00–05:00), and `MS_UNAVAILABLE` returned as HTTP 200 + `isValid:false` on the GET endpoint. "Unavailable" must be its own outcome, separate from "invalid", or users get rejected at night and on weekends.
6. **Names can be compared only for some states.** DE and ES (and others) return `---`, so "the name must match VIES" cannot be a universal rule.
7. **Proof needs the organizer's own VAT ID.** The VIES `requestIdentifier` appears only with an EU/XI requester VAT number. That is a per-instance setting the organizer would have to supply, and VIES checks it by checksum only. HMRC's `consultationNumber` needs a UK VRN, so most organizers cannot get one.
8. **Results go stale.** Registration status changes. VIES, the white list and HMRC answer "as of now", and Stripe says it does not re-validate over time. Storing a checked-at timestamp (and identifier) is what makes a stored "verified" mean anything.
9. **Credentials and ops cost per source:** VIES, white list, Swiss UID, Brreg: none. GUS BIR: key per legal entity plus registered source IPs. HMRC: OAuth app, about 2 weeks onboarding, per-application terms. ABN: GUID. Each registry adds an outbound call from the server, and a public registration form is an open proxy into those quotas unless rate-limited (white-list search: 100/day per IP, then blocked until midnight).
10. **Data minimisation.** The white-list `search` response includes bank accounts and representatives. VIES terms forbid extraction beyond the stated purpose. Storing only status + name/address + identifier is the conservative reading.

## Not checked

- No load test of VIES concurrency limits; no published numbers exist.
- HMRC sandbox not called (needs credentials). BIR production not called (needs key).
- Swiss UID official rate-limit documentation was unreachable (BFS site redirect).
- Japan, India, Ukraine, Turkey registries.
- Commercial VIES wrappers (vatlayer, Vatstack, etc.): they resell the same registries.
