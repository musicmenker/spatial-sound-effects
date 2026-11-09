# Offline and platform behavior

**Desktop runtime:** Vite bundles app JS/CSS and Tauri embeds the entire `dist` directory. The editor has no server endpoints, remote resources or cloud processing. Input decoding depends on the platform's native webview media codecs. All editable data remains local. Updating the app or obtaining platform runtimes/codec components may require connectivity.

**Web edition:** Cloudflare Pages serves the files over HTTPS and does not guarantee availability to a first-time offline visitor. No service worker has been added; do not describe the Web edition as offline installable.

**Windows:** Default NSIS uses WebView2 bootstrapper download if needed; the additional `offline-windows` config includes WebView2 offline installer. No code-signing certificate is included.

**macOS:** Uses the system WKWebView; apps built without Apple Developer ID signing and notarization may show Gatekeeper warnings. Native builds from Apple hosts are required.

**Linux:** Uses WebKitGTK and GStreamer. AppImage is configured to bundle additional multimedia components on Ubuntu runners; compatibility still depends on glibc and distribution. A DEB installs system dependencies via the package manager. Test AppImage and DEB separately in disconnected environments.

**Privacy:** All audio processing uses locally loaded files and the built-in Web Audio API. Native file permissions are scoped to user-selected paths. No analytics or telemetry implementation has been added.

**Save data:** Web and desktop store their IndexedDB databases in *different origins*. To migrate, export a `.sse.zip` (includes audio) and import it on the other platform. Automatic drafts must not be treated as a backup.

**Offline test procedure:** With the app freshly installed and network disabled: launch → import source file → choose preset → use all three switches → generate preview → listen to processed audio → save WAV → export `.sse.zip` → close and re-open project. Repeat on all supported OS / CPU architectures.

**Content Security Policy limitation:** Alpine.js's standard runtime evaluates directives dynamically, so the Tauri WebView configuration currently includes `script-src 'unsafe-eval'` for compatibility. This is a limited security exception, not a claim of hardened CSP. No remote HTML or JavaScript is loaded by the app; future CSP tightening requires migrating to a compatible expression interpreter (e.g. Alpine CSP build) and repeating UI regressions.

**Windows x64 Portable:** The `MusicMenker.portable` marker next to the EXE redirects the WebView2 profile (including IndexedDB) to `app-data/webview2/` beside the EXE. Write access is mandatory. The system WebView2 Runtime is not bundled. Installed and portable copies intentionally have separate storage.

**Linux tar.gz Portable:** A native ELF and a `run.sh` launcher are provided with dependency diagnostics. This is not a self-contained universal build; the host supplies WebKitGTK 4.1 and related libraries. The archive does not redirect the standard user data location. Fedora RPM and Arch pacman builds have distribution-specific dependencies.
