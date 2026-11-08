# Dependencies, release procedure and licensing

Frontend: Alpine.js, Tone.js, WaveSurfer.js, wavefile, Ajv, Dexie, JSZip, SortableJS, fourier-transform, i18next, Vite. Desktop layer: Tauri 2, official dialog/fs plugins, Rust. Versions and license details for existing packages are in `THIRD_PARTY.md`; Tauri is under the MIT/Apache-2.0 dual license, subject to exact dependency versions.

For v0.0.2.1, `fourier-transform@2.5.1` replaces Meyda (see `MEYDA_REPLACEMENT.md`). The source package does **not** currently contain a generated `package-lock.json` or `src-tauri/Cargo.lock` because registry/crate resolution was unavailable in the preparation environment. These must be created from real package resolution, committed, and reviewed **before** enabling the CI release process. Do not fabricate hashes or lock entries. The version range entries in `package.json` are provisional until pinned by a lockfile.

## Prepare a reproducible build on a connected development machine

```sh
npm install
npm run icons
cd src-tauri
cargo generate-lockfile
cd ..
npm ci
npm run check:syntax
npm test
npm run check:offline
npm run check:versions
```

Check `package-lock.json`, `Cargo.lock` and license notices into Git. Do not upgrade dependencies silently on every build. GitHub Actions intentionally fails if either lockfile is absent.

## Desktop release checklist

1. Build the Web application with `./build-install.sh build web`.
2. Build the native packages via Tauri CLI or GitHub Actions on each OS.
3. Test a supported audio file, all core processing controls, and both playback modes on that OS.
4. Compare exported WAV samples to the rendered AudioBuffer after accounting for quantization.
5. Test the offline launch and edit/save flow; validate installers on a clean host.
6. Generate SHA-256 sums of actual release artifacts, sign/notarize where applicable.
7. Publish only when tests and legal/license checks pass.

## Product license

The product's outbound source-code license has **not been specified by MusicMenker**. This package does not grant permissions to redistribute the first-party source under an unselected open-source license. Third-party packages retain their own licenses. Choose and add a product `LICENSE` file before a public source release.
