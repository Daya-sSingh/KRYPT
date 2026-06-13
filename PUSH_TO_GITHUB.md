# Push Krypt to GitHub (you only see README because push didn't finish)

Your full app is already saved on your Mac at `/Users/daya/projects/krypt`.
GitHub only has the README until you complete ONE of these methods.

---

## Easiest: GitHub Desktop

1. Download **GitHub Desktop**: https://desktop.github.com/
2. Install and **Sign in** with your GitHub account (Daya-sSingh)
3. **File → Add Local Repository**
4. Choose folder: `/Users/daya/projects/krypt`
5. If it asks to create a repo, choose **Publish** OR:
   - **Repository → Repository Settings → Remote**
   - URL: `https://github.com/Daya-sSingh/KRYPT.git`
6. Click **Push origin** (or **Publish branch**)

Refresh https://github.com/Daya-sSingh/KRYPT — you should see `src/`, `netlify.toml`, `public/`, etc.

---

## Terminal (if you prefer)

### A) Install GitHub CLI and login

```bash
brew install gh
gh auth login
```

Follow prompts → Login with browser.

### B) Push

```bash
cd /Users/daya/projects/krypt
git push -u origin main
```

If it says "rejected" because README exists on GitHub:

```bash
git pull origin main --allow-unrelated-histories
# fix conflicts if any (keep your files)
git push -u origin main
```

---

## After push

1. Open https://github.com/Daya-sSingh/KRYPT — must show `netlify.toml`, `src/`, `public/icon.png`
2. Netlify → trigger deploy (or wait for auto deploy)
3. Hard refresh your live site
