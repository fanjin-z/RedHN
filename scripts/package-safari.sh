#!/usr/bin/env bash
set -euo pipefail

REGENERATE=false
for argument in "$@"; do
    case "${argument}" in
        --regenerate)
            REGENERATE=true
            ;;
        --help|-h)
            cat <<'USAGE'
Usage: npm run package:safari [-- --regenerate]

Build Safari and update Xcode resources, preserving native settings.
Create a project if none exists.

  --regenerate  Recreate the project (can overwrite custom settings).
  --help, -h    Show help.
USAGE
            exit 0
            ;;
        *)
            echo "error: unknown argument '${argument}' (see --help)." >&2
            exit 1
            ;;
    esac
done

PROJECT_LOCATION="${SAFARI_PROJECT_LOCATION:-.output/safari-xcode}"
APP_NAME="${SAFARI_APP_NAME:-RedHN}"
BUNDLE_ID="${SAFARI_BUNDLE_ID:-com.gigabeyond.redhn}"
EXTENSION_DIR=".output/safari-mv3"
XCODE_PROJECT_PATH="${PROJECT_LOCATION}/${APP_NAME}/${APP_NAME}.xcodeproj"
XCODE_APP_DIR="${PROJECT_LOCATION}/${APP_NAME}"
XCODE_RESOURCES="${XCODE_APP_DIR}/Shared (Extension)/Resources"

UPDATE_EXISTING=false
if [[ "${REGENERATE}" == false ]]; then
    if [[ -f "${XCODE_PROJECT_PATH}/project.pbxproj" ]]; then
        if [[ ! -d "${XCODE_RESOURCES}" || -L "${XCODE_RESOURCES}" || ! -f "${XCODE_RESOURCES}/manifest.json" ]]; then
            echo "error: unexpected resources at '${XCODE_RESOURCES}'; Xcode unchanged." >&2
            exit 1
        fi
        UPDATE_EXISTING=true
    elif [[ -e "${XCODE_APP_DIR}" || -L "${XCODE_APP_DIR}" ]]; then
        echo "error: project missing in '${XCODE_APP_DIR}'; refusing overwrite." >&2
        exit 1
    fi
fi

if [[ "${UPDATE_EXISTING}" == true ]]; then
    if ! command -v rsync >/dev/null 2>&1; then
        echo "error: rsync not found." >&2
        exit 1
    fi
elif ! xcrun --find safari-web-extension-packager >/dev/null 2>&1; then
    echo "error: Safari packager not found. Check xcode-select." >&2
    exit 1
fi

npm exec wxt -- build -b safari --mv3

if [[ ! -f "${EXTENSION_DIR}/manifest.json" ]]; then
    echo "error: missing Safari manifest; Xcode unchanged." >&2
    exit 1
fi

if [[ "${UPDATE_EXISTING}" == true ]]; then
    for resource in "${EXTENSION_DIR}"/*; do
        resource_name="${resource##*/}"
        if [[ ! -e "${XCODE_RESOURCES}/${resource_name}" ]]; then
            echo "note: check '${resource_name}' in both Xcode extension targets."
        fi
    done
    # Only this folder is generated from WXT. Never sync over the native project.
    # Checksums catch same-size edits built within the same timestamp interval.
    rsync -a --checksum --delete -- "${EXTENSION_DIR}/" "${XCODE_RESOURCES}/"
    echo "Xcode resources updated; native settings preserved."
else
    PACKAGER_ARGS=(
        "${EXTENSION_DIR}"
        --project-location "${PROJECT_LOCATION}"
        --app-name "${APP_NAME}"
        --bundle-identifier "${BUNDLE_ID}"
        --swift
        --copy-resources
        --no-open
        --no-prompt
    )
    if [[ "${REGENERATE}" == true ]]; then
        echo "Regenerating Xcode project; custom settings may be overwritten."
        PACKAGER_ARGS+=(--force)
    fi
    xcrun safari-web-extension-packager "${PACKAGER_ARGS[@]}"
    if [[ ! -f "${XCODE_PROJECT_PATH}/project.pbxproj" || ! -f "${XCODE_RESOURCES}/manifest.json" ]]; then
        echo "error: incomplete Xcode output at '${XCODE_APP_DIR}'." >&2
        exit 1
    fi
    echo "Xcode project created; configure signing and versions."
fi

echo "Xcode project: ${XCODE_PROJECT_PATH}"
