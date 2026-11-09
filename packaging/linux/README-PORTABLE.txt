MusicMenker Spatial Sound Effects - Linux Portable (tar.gz)

1. Extract this archive in a writable directory.
2. Run ./run.sh in the extracted directory.
3. The host must provide Tauri 2 runtime libraries, including WebKitGTK 4.1.
   This archive does not bundle system GTK/WebKitGTK or glibc libraries.
4. On Debian 13 / NVIDIA systems exhibiting GBM failures, start with:
   WEBKIT_DISABLE_DMABUF_RENDERER=1 ./run.sh

The archive is not guaranteed to run on every Linux distribution.
Application data follows regular per-user desktop storage rules, and is
not automatically relocated to the unpacked directory.

Project and license information: README.md and THIRD_PARTY.md.
