use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::{Arc, Mutex};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WindowEvent,
};

#[derive(Clone)]
struct BackendManager {
    child: Arc<Mutex<Option<Child>>>,
}

impl BackendManager {
    fn new() -> Self {
        Self {
            child: Arc::new(Mutex::new(None)),
        }
    }

    fn start(&self) {
        // Check if backend is already listening on 127.0.0.1:8765
        if let Ok(stream) = std::net::TcpStream::connect("127.0.0.1:8765") {
            drop(stream);
            println!("[Tauri] Backend already running on 127.0.0.1:8765");
            return;
        }

        let mut target_paths: Vec<PathBuf> = Vec::new();

        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(parent) = exe_path.parent() {
                // Production macOS bundle: Contents/MacOS/stockprofile-backend
                target_paths.push(parent.join("stockprofile-backend"));
                target_paths.push(parent.join("../Resources/stockprofile-backend"));
            }
        }

        // Local paths fallback
        target_paths.push(PathBuf::from("binaries/stockprofile-backend-aarch64-apple-darwin"));
        target_paths.push(PathBuf::from("src-tauri/binaries/stockprofile-backend-aarch64-apple-darwin"));
        target_paths.push(PathBuf::from("../dist/stockprofile-backend"));
        target_paths.push(PathBuf::from("dist/stockprofile-backend"));

        for path in target_paths {
            if path.exists() {
                println!("[Tauri] Spawning bundled backend from: {:?}", path);
                match Command::new(&path).spawn() {
                    Ok(c) => {
                        *self.child.lock().unwrap() = Some(c);
                        println!("[Tauri] Backend process spawned successfully.");
                        return;
                    }
                    Err(e) => {
                        eprintln!("[Tauri] Failed to spawn backend at {:?}: {}", path, e);
                    }
                }
            }
        }

        eprintln!("[Tauri] Warning: Could not find bundled stockprofile-backend binary to launch.");
    }

    fn stop(&self) {
        if let Some(mut child) = self.child.lock().unwrap().take() {
            println!("[Tauri] Terminating backend process...");
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

#[tauri::command]
fn show_main_window(app_handle: tauri::AppHandle) {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[tauri::command]
fn hide_main_window(app_handle: tauri::AppHandle) {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.hide();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let backend_manager = BackendManager::new();
    backend_manager.start();
    let backend_manager_for_menu = backend_manager.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .setup(move |app| {
            let open_i = MenuItem::with_id(app, "open", "Open Dashboard", true, None::<&str>)?;
            let sync_i = MenuItem::with_id(app, "sync", "Sync Portfolios Now", true, None::<&str>)?;
            let alerts_i = MenuItem::with_id(app, "alerts", "Active Alerts", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit StockProfile", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&open_i, &sync_i, &alerts_i, &quit_i])?;

            let menu_backend = backend_manager_for_menu.clone();
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| {
                    match event.id.as_ref() {
                        "open" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "sync" => {
                            let _ = app.emit("tray-sync-requested", ());
                        }
                        "quit" => {
                            menu_backend.stop();
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![show_main_window, hide_main_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
