# SimplePrint Deployment Guide

## Hosting

- **Platform**: Fly.io
- **Dashboard**: https://fly.io/apps/simpleprint
- **Live URL**: https://simpleprint.fly.dev
- **IP**: 66.241.125.91
- **Region**: yyz (Toronto)
- **GitHub Account**: cr8tivenest88
- **Repo**: git@github.com:cr8tivenest88/simplePrint.git

## How Deployment Works

The GitHub repo is connected to Fly.io. Every push to `main` triggers an automatic deploy.

```
git push  -->  Fly.io builds Docker image  -->  Deploys to simpleprint.fly.dev
```

## Deploy Steps

### 1. Make your changes

### 2. Commit and push

```powershell
git add .
git commit -m "your message"
git push
```

That's it. Fly.io handles the rest.

### Manual Deploy (optional)

If you need to deploy without pushing to GitHub:

```powershell
npm run deploy
# or
flyctl deploy --remote-only
```

## First-Time Setup (if starting fresh)

### Install Fly CLI

```powershell
# PowerShell
irm https://fly.io/install.ps1 | iex
```

This installs to `C:\Users\Glori\.fly\bin\flyctl.exe`.

### Add to PATH

```powershell
[Environment]::SetEnvironmentVariable("Path", [Environment]::GetEnvironmentVariable("Path", "User") + ";C:\Users\Glori\.fly\bin", "User")
```

Restart your terminal after this.

### Login

```powershell
flyctl auth login
```

Login email: cr8tivenest@gmail.com

### Connect GitHub (one-time)

1. Go to https://fly.io/apps/simpleprint/settings
2. Connect your GitHub repo (cr8tivenest88/simplePrint)
3. Auto-deploy is now enabled on push

## Key Files

| File | Purpose |
|------|---------|
| `fly.toml` | Fly.io app config (region, VM size, volumes) |
| `Dockerfile` | How the app is built for deployment |
| `.dockerignore` | Files excluded from the Docker build |

## Fly.io App Config (fly.toml)

- **App**: simpleprint
- **Region**: yyz (Toronto)
- **VM**: shared CPU, 1 core, 256mb RAM
- **Port**: 3080 (force HTTPS)
- **Volume**: `simpleprint_data` mounted at `/app/data`
- **Always running**: min 1 machine, auto-stop disabled

## Useful Commands

```powershell
# Check app status
flyctl status

# View logs
flyctl logs

# SSH into the running machine
flyctl ssh console

# Open the app in browser
flyctl open

# Check deployed app info
flyctl info

# Scale VM (if needed)
flyctl scale memory 512
flyctl scale count 2
```

## Troubleshooting

### "flyctl not recognized"
Restart your terminal, or use the full path: `C:\Users\Glori\.fly\bin\flyctl.exe`

### Deploy stuck on "Waiting for depot builder"
Use: `flyctl deploy --remote-only`

### Permission denied on git push
Make sure you're authenticated as `cr8tivenest88`. Check with:
```powershell
ssh -T git@github.com
```

### CORS errors on live site
Update allowed origins in `middleware/cors.js` and redeploy.
