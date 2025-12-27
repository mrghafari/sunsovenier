#!/bin/bash
set -e

URL=$1
MAX_RETRIES=10
RETRY_INTERVAL=10

if [ -z "$URL" ]; then
    echo "Usage: ./health-check.sh <url>"
    exit 1
fi

HEALTH_ENDPOINT="${URL}/api/health"

echo "Checking health at: $HEALTH_ENDPOINT"
echo "Max retries: $MAX_RETRIES"
echo "Retry interval: ${RETRY_INTERVAL}s"

for i in $(seq 1 $MAX_RETRIES); do
    echo "Health check attempt $i/$MAX_RETRIES..."
    
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_ENDPOINT" || echo "000")
    
    if [ "$HTTP_STATUS" = "200" ]; then
        echo "Health check passed! Status: $HTTP_STATUS"
        exit 0
    fi
    
    echo "Health check failed. Status: $HTTP_STATUS"
    
    if [ $i -lt $MAX_RETRIES ]; then
        echo "Waiting ${RETRY_INTERVAL}s before retry..."
        sleep $RETRY_INTERVAL
    fi
done

echo "Health check failed after $MAX_RETRIES attempts!"
exit 1
