# Homestuck Translation

This is where all the translation work lives. You do **not** need to understand Git or GitHub to work here.
Just follow the steps for your role (translator, reviewer, admin).

## How it works

There are two copies of the translation:

| Copy | What it is | Who changes it |
|---|---|---|
| **review** | The working copy. Everyone writes here. | Everyone |
| **main** | The finished copy. Only reviewed, approved work. | Reviewer |

Your Obsidian uploads your work automatically **2 minutes after you stop typing**, and downloads everyone else's work every 5 minutes.
You never have to "merge", "pull" or "update" anything.

---

## For translators

### First-time setup (do this once)

1. Install these three programs (just click Next through the installers):
   - [Git for Windows](https://git-scm.com/download/win)
   - [GitHub Desktop](https://desktop.github.com/)
   - [Obsidian](https://obsidian.md/)
2. Open **GitHub Desktop** and sign in with your GitHub account.
   (The admin must have invited you to the project first. Check your email for the invite.)
3. In GitHub Desktop, click **File → Clone repository**, pick **Homestuck-TR**, choose a folder (for example `Documents\Translation`) and click **Clone**.
4. At the top of GitHub Desktop, check that it says **Current branch: review**. If it doesn't, click it and pick **review**.
5. Open **Obsidian**, click **Open folder as vault** and pick the folder from step 3.
6. If Obsidian asks about community plugins, click **Trust author and enable plugins**.
7. The first time Obsidian uploads, a GitHub sign-in window may pop up. Sign in. You only do this once.

You will only need Obsidian to do work on the project after you are done with the setup. No need to open any other app unless you are doing smth extra (contact admin when you are planning on doing something out of the ordinary). 

### Every day

1. Open Obsidian.
2. Translate **only the pages you were assigned**. If two people edit the same page at the same time admin will get mad.
3. When you're done, wait **2 minutes** after your last change, then close Obsidian OR press `Ctrl + P` and type "commit-and-sync", press enter.
   If you forget, nothing is lost. Your work is still on your computer and uploads the next time you open Obsidian.

### Rules

- Only edit your own assigned pages.
- Always stay on the **review** branch.
  
- Never switch to **main**. (If you change main by accident, it is undone automatically and your work is moved to review. An issue will tell you what happened.)
- Never delete the folder to "start fresh". Ask the admin instead.
- Don't put Word, `.odt` or other non-text files in the folder. Git can't combine those if two people change them.

---

## For the reviewer

### See what is waiting for review

Open this link. It shows every difference between the working copy and the finished copy:

**https://github.com/baransocksatthis/Homestuck-TR/compare/main...review**

Every Monday an issue called **"Weekly reminder: work waiting"** also appears in the **Issues** tab.
It lists pages that have been sitting unreviewed for 2+ weeks.

### Fixing mistakes

Fix them in **your own Obsidian**, on the **review** branch, just like a translator would.
Never edit **main** directly.

### Approving work (copying it into main)

1. On GitHub, open the **Actions** tab.
2. On the left, click **Approve work (copy review → main)**.
3. Click the **Run workflow** button on the right.
4. Type what you want to approve, separated by commas. Use the folder or file names, with capitals and spaces exactly as they are. For example:
   - `ACT 1`
   - `1-100.md, 248-300.md`
   - `Main File/ACT 1/1-100.md` (the full path also works)
   - `EVERYTHING` (approves all of it)
5. Click the green **Run workflow** button.
6. After a minute it shows a ✅ (done) or ❌ (click it to see why, usually a typo in a name).

Only people on the approvers list can do this. Anyone else gets a ❌ saying "Not allowed".

Approving copies the **current** version of those files from review to main.
If someone keeps editing a page after you approved it, approve it again later.

---

## Personal branches (optional, for big experimental work)

Most people should just work on **review**. But if you want to try something big without others seeing it yet:

1. In GitHub Desktop: **Branch → New branch**, give it your name (eg. "review-baran"), base it on **review**.
2. Work in Obsidian as usual. It now saves to your branch.
3. Every night, and after every approval, your branch automatically gets everyone else's latest work.
4. When you're done: in GitHub Desktop, **Branch → Create pull request**, and make sure it goes into **review**. Then switch back to **review** at the top of GitHub Desktop.

If a personal branch has unsent work for more than 2 weeks, it shows up in the weekly reminder.

---

## If something goes wrong

| What you see | What to do |
|---|---|
| Obsidian says something about a **conflict** | Someone else edited the same page. Open the page and look for lines like `<<<<<<<`, `=======` and `>>>>>>>`. Keep the text you want, delete those marker lines, save. If unsure, **stop and ask the admin.** |
| An issue says **"Branch 'x' could not be updated automatically"** | Nothing is lost. The admin fixes it in GitHub Desktop: switch to that branch → **Branch → Update from review** → resolve the files it lists. |
| An issue says **"Change to main by @x was undone"** | Nothing is lost. That person should switch GitHub Desktop back to **review**. The issue says where their work went. |
| Obsidian says **"git not found"** | Git for Windows isn't installed. Install it (step 1 of setup) and restart Obsidian. |
| Anything else | Don't delete anything. Take a screenshot and send it to the admin. |

---

## For the admin (one-time setup on github.com)

In **Settings → Actions → General**, tick **Allow GitHub Actions to create and approve pull requests**. The Approve button doesn't work without it.

Behind the scenes, four automations live in `.github/workflows/`:

- `approve.yml`: the reviewer's "Approve" button. It sends the work to main through a pull request that it merges itself. Who may press it is set by `APPROVERS` at the top (GitHub usernames, separated by spaces).
- `guard-main.yml`: undoes any change to main that didn't come from the Approve button, moves it to review, and opens an issue. People listed in `MAIN_KEEPERS` at the top are allowed to change main directly.
- `sync-branches.yml`: keeps review and personal branches up to date (after every approval, and nightly).
- `reminder.yml`: the Monday reminder issue. Change `DAYS: 14` in it to change what "waiting too long" means.
