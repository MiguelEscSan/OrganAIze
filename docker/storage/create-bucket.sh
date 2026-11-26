#!/bin/sh
set -eu

status=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "http://storage-api:5000/bucket" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"${BUCKET_NAME}\",\"name\":\"${BUCKET_NAME}\",\"public\":false}")

case "$status" in
  200|409) echo "bucket ${BUCKET_NAME} ready" ;;
  400) echo "bucket ${BUCKET_NAME} already exists or was rejected with 400"; exit 0 ;;
  *) echo "bucket creation failed with status ${status}"; exit 1 ;;
esac
