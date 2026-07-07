# Running collect-joyalukkas-rate.js automatically, twice a day

The script itself just does one fetch-and-save each time it runs — the
"automatic" part comes from your OS scheduler calling it on a timer.
Pick whichever matches where this will live.

---

## Option 1: Cron (Linux / macOS / most cheap VPS hosting)

1. Make sure Node.js 18+ is installed (`node -v`).
2. Open your crontab:
   ```
   crontab -e
   ```
3. Add these two lines (adjust the path to wherever you put the script).
   This runs at 9:00 AM and 4:00 PM server time — pick times that make sense
   for when Joyalukkas actually updates their rate:
   ```
   0 9  * * * cd /full/path/to/gold-chart && /usr/bin/node collect-joyalukkas-rate.js >> collector.log 2>&1
   0 16 * * * cd /full/path/to/gold-chart && /usr/bin/node collect-joyalukkas-rate.js >> collector.log 2>&1
   ```
4. Save and exit. That's it — cron handles the rest, and `collector.log` will
   show you a running log of each run (useful for debugging if a run fails).

Find your Node path with `which node` if `/usr/bin/node` isn't correct on
your system.

---

## Option 2: Windows Task Scheduler

1. Open Task Scheduler → Create Basic Task.
2. Name it "Joyalukkas Gold Rate Collector".
3. Trigger: Daily, then after creating it, edit the task and add a **second
   trigger** for your second time of day (Task Scheduler only lets you set
   one time per trigger, but you can add multiple triggers to one task).
4. Action: "Start a program"
   - Program/script: `node`
   - Arguments: `collect-joyalukkas-rate.js`
   - Start in: the full path to your `gold-chart` folder
5. Finish, then test by right-clicking the task → Run.

---

## Option 3: Cloud scheduler (if this lives on a server you don't control 24/7,
## e.g. your laptop isn't always on)

If you want this to run reliably even when your own machine is off, move the
schedule to the cloud instead of your local machine:

- **GitHub Actions** (free, easiest if your code's already in a GitHub repo):
  create `.github/workflows/collect-gold-rate.yml` with a `schedule: cron:`
  trigger set to run twice a day, and a step that runs
  `node collect-joyalukkas-rate.js`, then commits the updated JSON file back
  to the repo.
- **A small always-on VPS** (DigitalOcean, Linode, etc.) running Option 1's
  cron setup.
- **Serverless scheduled functions** (AWS EventBridge + Lambda, Vercel Cron,
  Supabase Edge Functions with pg_cron, etc.) if you want zero server
  management — these each have their own scheduling syntax, so ask me if you
  pick one and want the exact config.

---

## A couple of practical notes

- **Duplicate protection is built in**: the script checks Joyalukkas'
  `metal_rate_time` field and skips saving if it hasn't changed since your
  last run — so running it more than twice a day "just in case" won't bloat
  your file with identical entries.
- **This endpoint is undocumented and unofficial** (found by inspecting their
  frontend's network requests, not published as a public API) — it could
  change or get blocked at any time without notice. Treat this collector as
  a nice-to-have supplementary data source, not something to depend on for
  anything business-critical.
- Want the GitHub Actions version fully written out? Let me know and I'll
  build the exact `.yml` file for it.
