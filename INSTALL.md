# GISA Safety Shield — Installation Guide
## By Braxton Roy

### What this does
Automatically blocks trafficking sites, scams, phishing, grooming, 
and malware. Protects you in real time while you browse.
Currently blocking 86,000+ confirmed threats updated every hour.

### What you need
- A Mac or Windows computer
- Google Chrome
- Docker Desktop (free) — https://www.docker.com/products/docker-desktop

### Step 1 — Install Docker Desktop
Download and install from: https://www.docker.com/products/docker-desktop

### Step 2 — Download GISA
Download the gisa-clara folder and put it on your Desktop.

### Step 3 — Start the safety platform
Open Terminal and run:
cd ~/Desktop/gisa-clara
docker compose -f docker-compose.simple.yml up -d

### Step 4 — Install the Chrome extension
1. Open Chrome
2. Go to chrome://extensions
3. Turn on Developer Mode (top right)
4. Click Load Unpacked
5. Select the gisa-clara/extension folder

### Step 5 — You're protected!
Look for the shield icon in Chrome.
Visit http://localhost:8001/dashboard to see what's being blocked.

### To start GISA after restarting your computer
Open Terminal and run:
cd ~/Desktop/gisa-clara
docker compose -f docker-compose.simple.yml up -d

### Built by
Braxton Roy — fighting trafficking one block at a time.
National Human Trafficking Hotline: 1-888-373-7888
