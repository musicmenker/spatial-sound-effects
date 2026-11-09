MusicMenker Spatial Sound Effects - Windows x64 Portable

Run MusicMenker-SpatialSoundEffects.exe from its extracted directory.
Do not remove MusicMenker.portable: it enables portable WebView2 data storage.

Settings, projects and installed .mmsse presets saved by the WebView are stored
in app-data/webview2/ beside the EXE. Keep this folder when moving the app.
An existing installed copy uses a different profile: portable mode will not
migrate it automatically. Use the application's project / .mmsse export functions.

A compatible Microsoft WebView2 Runtime must already be installed.
The Portable ZIP does NOT bundle a fixed WebView2 runtime.
If the target folder is not writable, portable mode will refuse to start rather
than silently storing data outside the portable folder. Avoid Program Files.

Audio processing itself is offline. Untrusted files should not be imported.
