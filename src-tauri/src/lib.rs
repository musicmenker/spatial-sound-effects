#[cfg(windows)]
mod portable {
    use std::{env, fs};

    const MARKER: &str = "MusicMenker.portable";

    fn prepare_profile() -> Result<(), String> {
        let exe = env::current_exe().map_err(|e| format!("Executable location: {e}"))?;
        let parent = exe.parent().ok_or("Executable directory not found")?;
        if !parent.join(MARKER).is_file() {
            return Ok(());
        }
        let root = parent.join("app-data").join("webview2");
        fs::create_dir_all(&root).map_err(|e| format!("Cannot create portable data directory {}: {e}", root.display()))?;
        // Canonicalize prevents a relative WebView2 profile path from depending on CWD.
        let canonical = root.canonicalize().map_err(|e| format!("Portable data path: {e}"))?;
        if !canonical.is_dir() {
            return Err("Portable data directory is not a directory".into());
        }
        // Microsoft WebView2 supports WEBVIEW2_USER_DATA_FOLDER as an environment override.
        // Only this application process and its children inherit the setting.
        // Confirm the folder is writable instead of silently using a non-portable fallback.
        let probe = canonical.join(format!(".musicmenker-write-test-{}", std::process::id()));
        let mut options = fs::OpenOptions::new();
        options.write(true).create_new(true);
        let file = options.open(&probe).map_err(|e| format!("Portable storage not writable {}: {e}", canonical.display()))?;
        drop(file);
        fs::remove_file(&probe).map_err(|e| format!("Cannot remove portable storage probe {}: {e}", probe.display()))?;
        env::set_var("WEBVIEW2_USER_DATA_FOLDER", canonical);
        Ok(())
    }

    fn error_dialog(message: &str) {
        #[link(name = "user32")]
        extern "system" {
            fn MessageBoxW(window: isize, text: *const u16, title: *const u16, mode: u32) -> i32;
        }
        use std::os::windows::ffi::OsStrExt;
        let msg: Vec<u16> = std::ffi::OsStr::new(message).encode_wide().chain(Some(0)).collect();
        let title: Vec<u16> = std::ffi::OsStr::new("MusicMenker Portable").encode_wide().chain(Some(0)).collect();
        unsafe { MessageBoxW(0, msg.as_ptr(), title.as_ptr(), 0x10); }
    }

    pub(super) fn prepare_or_exit() {
        if let Err(error) = prepare_profile() {
            let message = format!("Portable mode cannot start.\n\n{error}\n\nMove the application to a writable folder.");
            eprintln!("{message}");
            error_dialog(&message);
            std::process::exit(1);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(windows)]
    portable::prepare_or_exit();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("MusicMenker desktop application failed to start");
}
