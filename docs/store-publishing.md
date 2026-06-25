# Store Publishing

This guide covers release artifacts and store submission steps. Use
`docs/store-listing.md` for reusable listing copy, permission justifications,
privacy disclosure, and reviewer instructions.

## Release Artifacts

Tagged GitHub releases attach every `.output/*.zip` file produced by
`.github/workflows/release.yml`.

| Store            | Artifact                                            |
| ---------------- | --------------------------------------------------- |
| Chrome Web Store | `.output/*-chrome.zip`                              |
| Firefox Add-ons  | `.output/*-firefox.zip` and `.output/*-sources.zip` |
| Edge Add-ons     | `.output/*-chrome.zip`                              |
| Safari           | `.output/*-safari.zip`                              |

Local commands:

```sh
npm run zip
npm run zip:firefox
npm run zip:safari
```

## Store Steps

### Chrome Web Store

1. Open the Chrome Web Store Developer Dashboard.
2. Upload `.output/*-chrome.zip`.
3. Use `docs/store-listing.md` for the description, permission justification,
   privacy disclosure, privacy policy URL, and reviewer instructions.
4. Submit the item for review.

### Firefox Add-ons

1. Open the Firefox Add-ons Developer Hub.
2. Upload `.output/*-firefox.zip`.
3. Upload `.output/*-sources.zip` when source submission is requested.
4. Use `docs/store-listing.md` for reusable listing and review text.
5. Submit the add-on for review.

### Edge Add-ons

1. Open Microsoft Partner Center for Edge Add-ons.
2. Upload `.output/*-chrome.zip`.
3. Use `docs/store-listing.md` for reusable listing and review text.
4. Submit the extension for certification.

### Safari App Store

GitHub Releases provide an unsigned Safari MV3 extension zip:
`.output/*-safari.zip`.

Safari App Store publication must be packaged, signed, archived, and uploaded
locally with the publisher's Apple Developer account:

```sh
SAFARI_BUNDLE_ID=[your.bundle.id] npm run package:safari
```

Open `.output/safari-xcode/RedHN/RedHN.xcodeproj` in Xcode, configure signing
for the app and extension targets, test in Safari, archive, and upload through
Xcode or App Store Connect.

#### Local Safari Testing

1. In Safari, enable the Develop menu if needed (Settings > Advanced > check 'Show features for web developers'), then choose
   `Develop > Allow Unsigned Extensions` and 'Add Temporary Extension'.
2. In Safari, open `https://news.ycombinator.com` and grant RedHN website permissions.

## Public Repo Safety

Do not commit or publish credentials or private account details, including:

- Store API credentials, OAuth client secrets, or refresh tokens.
- Apple certificates, provisioning profiles, private keys, or App Store Connect
  API keys.
- Account emails, passwords, team-private IDs, or `.env*` files.

Only public metadata belongs in these docs, such as public store URLs, public
extension IDs, the privacy policy URL, and the public Safari bundle ID.
