# Upload and host on GitHub

## 1. Create the repository

Create a new GitHub repository named `ep-heart-physics-base`. Choose **Private** if the source should remain private. Do not initialise it with a README.

## 2. Push this folder

Replace `YOUR_USERNAME` below:

```bash
cd /path/to/ep-heart-physics-base
git init
git add .
git commit -m "Initial cardiac EP physics base"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ep-heart-physics-base.git
git push -u origin main
```

## 3. Publish the demo

In the GitHub repository, open:

`Settings → Pages → Build and deployment → Source → GitHub Actions`

The included workflow verifies and builds the app before deploying it.

The public demo will normally appear at:

`https://YOUR_USERNAME.github.io/ep-heart-physics-base/`

A private repository does not make the deployed browser files secret. Do not put credentials, patient data or private keys in the frontend.
