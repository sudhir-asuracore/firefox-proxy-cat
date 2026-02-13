[![CI](https://github.com/sudhir-asuracore/firefox-proxy-cat/actions/workflows/ci.yml/badge.svg)](https://github.com/sudhir-asuracore/firefox-proxy-cat/actions/workflows/ci.yml)
[![Release](https://github.com/sudhir-asuracore/firefox-proxy-cat/actions/workflows/release.yml/badge.svg)](https://github.com/sudhir-asuracore/firefox-proxy-cat/actions/workflows/release.yml)
[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/U7U61FUIAB)

# Proxy Cat

Proxy Cat is a Firefox extension for routing traffic with intent. Create proxy
profiles, map them to URL patterns, and override behavior per tab or tab group.
Everything is stored locally and can be exported or imported as JSON.

## Features
- Profile-based proxy routing (HTTP/HTTPS/SOCKS/Direct)
- Wildcard and regex URL rules
- Per-tab overrides from the popup
- Per-tab-group overrides from the context menu
- Import/export backups

## Install (local development)
1. Clone the repo.
2. Load the extension in Firefox:
   - Open `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select `manifest.json`

## Usage
- Add profiles in the popup or options page.
- Create rules with wildcard patterns or `re:` regex.
- Use the popup to override the current tab.
- Use the tab context menu to assign or disable a tab or tab group.

## Development
Requirements: Node.js 20+ and npm.

```bash
npm ci
npm test
npm run build
```

Build output is a signed-ready zip in `dist/` for manual upload to the Firefox
Add-ons portal.

## Permissions
- proxy: apply proxy settings per request
- tabs: read active tab info for overrides
- contextMenus: tab and tab-group actions
- storage: save config locally
- <all_urls>: evaluate rules for all sites
- tabGroups (optional): group overrides

## Privacy
Proxy Cat does not collect, transmit, or sell user data. All configuration data
stays in the browser and is not sent to any external service.

## Support
If you find this useful, you can support the project:

<a href='https://ko-fi.com/U7U61FUIAB' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi6.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>

## License
MIT. See `LICENSE`.

## Contact
Open a GitHub issue in this repository.
