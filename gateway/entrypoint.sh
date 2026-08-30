#!/bin/sh
set -e

cat > /app/Config.toml <<CONFIG
backendUrl = "${BACKEND_URL}"
apiKey = "${API_KEY}"
CONFIG

exec java -jar /app/gateway.jar
