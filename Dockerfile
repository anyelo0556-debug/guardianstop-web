# Guardian Stop — Web + Risk Engine (Node + Python)
FROM node:20-slim

# Install Python 3 and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Create symlink for python
RUN ln -sf /usr/bin/python3 /usr/bin/python

WORKDIR /app

# Install Node dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Install Python dependencies
COPY requirements-engine.txt ./
RUN pip3 install --no-cache-dir -r requirements-engine.txt

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Expose port
EXPOSE 10000

# Start both services
CMD ["bash", "start-combined.sh"]
