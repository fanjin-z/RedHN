#!/usr/bin/env bash
set -euo pipefail

if ! xcrun --find safari-web-extension-packager >/dev/null 2>&1; then
    echo "error: safari-web-extension-packager was not found. Install Xcode and select it with xcode-select." >&2
    exit 1
fi

PROJECT_LOCATION="${SAFARI_PROJECT_LOCATION:-.output/safari-xcode}"
APP_NAME="${SAFARI_APP_NAME:-RedHN}"
BUNDLE_ID="${SAFARI_BUNDLE_ID:-com.gigabeyond.redhn}"
EXTENSION_DIR=".output/safari-mv3"
XCODE_PROJECT_PATH="${PROJECT_LOCATION}/${APP_NAME}/${APP_NAME}.xcodeproj"

npm exec wxt -- build -b safari --mv3

xcrun safari-web-extension-packager "${EXTENSION_DIR}" \
    --project-location "${PROJECT_LOCATION}" \
    --app-name "${APP_NAME}" \
    --bundle-identifier "${BUNDLE_ID}" \
    --swift \
    --copy-resources \
    --no-open \
    --no-prompt \
    --force

echo
echo "Safari Xcode project created at: ${XCODE_PROJECT_PATH}"
