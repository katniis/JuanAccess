<p align="center">
  <img src="client/public/juanaccess-logo.svg" alt="JuanAccess" width="280" />
</p>

<h1 align="center">JuanAccess</h1>

<p align="center">
  JuanAccess helps patients and clinic teams manage each visit from booking
  through billing, with fewer disconnected steps.
</p>

<p align="center">
  <a href="https://github.com/katniis/JuanAccess/actions/workflows/client-ci.yaml">
    <img src="https://img.shields.io/github/actions/workflow/status/katniis/JuanAccess/client-ci.yaml?branch=main&style=for-the-badge&label=Client%20CI" alt="Client CI" />
  </a>
  <a href="https://github.com/katniis/JuanAccess/actions/workflows/server-ci.yaml">
    <img src="https://img.shields.io/github/actions/workflow/status/katniis/JuanAccess/server-ci.yaml?branch=main&style=for-the-badge&label=Server%20CI" alt="Server CI" />
  </a>
  <a href="https://github.com/katniis/JuanAccess/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/katniis/JuanAccess?style=for-the-badge" alt="MIT License" />
  </a>
  <a href="https://juanaccess.vercel.app">
    <img src="https://img.shields.io/badge/live%20demo-open-0E7490?style=for-the-badge&logo=vercel&logoColor=white" alt="Live demo" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express 5" />
  <img src="https://img.shields.io/badge/PostgreSQL-Postgres-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Drizzle-ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black" alt="Drizzle ORM" />
</p>

Patients often have to follow up on appointment availability, insurance
questions, and bills in separate places. Clinic teams coordinate provider
schedules, rooms, equipment, and insurer paperwork by hand. JuanAccess connects
these steps around the same visit, so patients can see progress and clinic staff
can prepare what comes next.

## A visit in JuanAccess

1. **Find a time that works.** Patients can book an available slot or join a
   waitlist. JuanAccess matches appointments to provider schedules, rooms, and
   required equipment.
2. **Understand the insurance steps.** Patients can see coverage and
   pre-approval status. The current build simulates insurance decisions; it
   doesn’t connect to real insurers.
3. **Help the care team get ready.** Staff can review a short summary of relevant
   chart history, lab results, and medications. JuanAccess can also prepare
   prior-authorization and appeal drafts for review.
4. **Review the bill.** Patients can upload a bill and see possible duplicate,
   coverage, or coding issues. If something needs follow-up, they can edit or
   download a draft dispute letter.

## Try JuanAccess

Open the [live demo](https://juanaccess.vercel.app) to explore the experience.
Demo records are synthetic. Don’t enter real patient or payment information.

AI-generated drafts are optional and should be reviewed before use. A configured
Google Gemini integration can help prepare drafts; without it, the app uses
built-in fallback text.

## Your data

JuanAccess is a web app: account, appointment, coverage, chart, and billing
records are stored in the PostgreSQL database configured for the clinic’s
instance. Uploaded bill files are stored in Supabase Storage when that
integration is configured.

If AI drafting is enabled, relevant chart or bill details are sent to Google
Gemini to prepare a draft. If email delivery is enabled, messages are sent
through Resend. Both integrations are optional.

Patients can download appointment calendar files and dispute-letter drafts, and
delete bill uploads that haven’t already been submitted as disputes. The app
doesn’t currently provide a full-account data export or deletion control; contact
the clinic operating the instance for those requests.

## Run it locally

<details>
<summary>Developer setup</summary>

You’ll need Node.js 24 and a PostgreSQL database. Start the API and client in
separate terminals.

In the first terminal:

```sh
cd server
npm ci
cp .env.example .env
```

Set `DATABASE_URL` and `JWT_SECRET` in `server/.env`, then run:

```sh
npm run migrate
npm run dev
```

In a second terminal:

```sh
cd client
npm ci
cp .env.example .env
npm run dev
```

Open the client URL shown in the terminal, usually `http://localhost:5173`.
Optional integration settings are listed in the two `.env.example` files.

</details>

## Contributing

Questions, ideas, and pull requests are welcome. Please keep example and test
records synthetic; see the [product overview](docs/docs.md) for more context.

## License

JuanAccess is available under the [MIT License](LICENSE).
