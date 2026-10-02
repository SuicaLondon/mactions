use std::{env, fs, path::Path};

fn collect(dir: &Path, root: &Path, result: &mut String) {
    let mut entries: Vec<_> = fs::read_dir(dir)
        .expect("Read frontend build")
        .map(|e| e.unwrap().path())
        .collect();
    entries.sort();
    for path in entries {
        if path.is_dir() {
            collect(&path, root, result);
            continue;
        }
        let name = format!("/{}", path.strip_prefix(root).unwrap().to_string_lossy());
        let mime = match path.extension().and_then(|s| s.to_str()) {
            Some("html") => "text/html; charset=utf-8",
            Some("js") => "text/javascript; charset=utf-8",
            Some("css") => "text/css; charset=utf-8",
            Some("svg") => "image/svg+xml",
            _ => "application/octet-stream",
        };
        // Resolve the project root at compile time so cached output survives a folder rename.
        result.push_str(&format!(
            "({name:?}, {mime:?}, include_bytes!(concat!(env!(\"CARGO_MANIFEST_DIR\"), {:?}))),\n",
            format!("/{}", path.to_string_lossy())
        ));
    }
}

fn main() {
    let root = Path::new("web/dist");
    println!("cargo:rerun-if-changed=web/dist");
    assert!(
        root.join("index.html").exists(),
        "Build the frontend first: npm --prefix web ci && npm --prefix web run build"
    );
    let mut assets = String::from("static ASSETS: &[(&str, &str, &[u8])] = &[\n");
    collect(root, root, &mut assets);
    assets.push_str("];\n");
    fs::write(
        Path::new(&env::var("OUT_DIR").unwrap()).join("web_assets.rs"),
        assets,
    )
    .unwrap();
}
