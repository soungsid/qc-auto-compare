FROM python:3.11-slim

# Install Playwright system dependencies
# Note: libasound2t64 is the renamed libasound2 in Debian Trixie+
RUN apt-get update && apt-get install -y \
    wget curl gnupg ca-certificates \
    libnss3 libatk1.0-0t64 libatk-bridge2.0-0t64 \
    libcups2t64 libdrm2 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 \
    libasound2t64 libpangocairo-1.0-0 libpango-1.0-0 \
    libcairo2 libgtk-3-0t64 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# System deps already installed above — no --with-deps to avoid obsolete font packages
RUN playwright install chromium

COPY . .

CMD ["scrapy", "crawl", "nissan_qc_spider"]
