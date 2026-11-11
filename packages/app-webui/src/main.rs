use axum::{
    Router,
    extract::{Path, State},
    http::{StatusCode, Uri},
    response::{Html, IntoResponse, Response},
    routing::get,
};
use serde_json::{Value, json};
use std::{
    env,
    error::Error,
    fs,
    sync::{
        Arc,
        atomic::{AtomicUsize, Ordering},
    },
    time::Duration,
};
use tower_http::services::ServeDir;
use uuid::Uuid;
use webui::{Protocol, RenderOptions, ResponseWriter, WebUIHandler};
use webui_handler::plugin::webui::WebUIHydrationPlugin;

#[global_allocator]
static ALLOCATOR: mimalloc3::MiMalloc = mimalloc3::MiMalloc;

struct StringWriter(String);

impl ResponseWriter for StringWriter {
    fn write(&mut self, content: &str) -> webui::HandlerResult<()> {
        self.0.push_str(content);
        Ok(())
    }

    fn write_escaped(&mut self, content: &str) -> webui::HandlerResult<()> {
        html_escape::encode_safe_to_string(content, &mut self.0);
        Ok(())
    }

    fn write_escaped_attribute(&mut self, name: &str, value: &str) -> webui::HandlerResult<()> {
        self.0.push(' ');
        self.0.push_str(name);
        self.0.push_str("=\"");
        html_escape::encode_safe_to_string(value, &mut self.0);
        self.0.push('"');
        Ok(())
    }

    fn end(&mut self) -> webui::HandlerResult<()> {
        Ok(())
    }
}

struct Page {
    protocol: Protocol,
    handler: WebUIHandler,
    entry: &'static str,
    output_capacity: AtomicUsize,
}

impl Page {
    fn load(name: &str, entry: &'static str, interactive: bool) -> Result<Self, Box<dyn Error>> {
        let protocol = Protocol::from_protobuf(&fs::read(format!("dist/{name}/protocol.bin"))?)?;
        let handler = if interactive {
            WebUIHandler::with_plugin(|| Box::new(WebUIHydrationPlugin::new()))
        } else {
            WebUIHandler::new()
        };
        Ok(Self {
            protocol,
            handler,
            entry,
            output_capacity: AtomicUsize::new(0),
        })
    }

    fn render(&self, path: &str, state: &Value) -> Response {
        let capacity = self.output_capacity.load(Ordering::Relaxed);
        let mut writer = StringWriter(String::with_capacity(capacity));
        match self.handler.render(
            &self.protocol,
            state,
            &RenderOptions::new(self.entry, path),
            &mut writer,
        ) {
            Ok(()) => {
                if writer.0.len() != capacity {
                    self.output_capacity
                        .store(writer.0.len(), Ordering::Relaxed);
                }
                Html(writer.0).into_response()
            }
            Err(error) => {
                eprintln!("WebUI render failed for {path}: {error}");
                (StatusCode::INTERNAL_SERVER_ERROR, "Rendering failed").into_response()
            }
        }
    }
}

struct AppState {
    home: Page,
    ssr: Page,
    throughput: Page,
    detail: Page,
    initial: Page,
    client: Page,
    table_state: Value,
    client_state: Value,
    client_detail_state: Value,
}

impl AppState {
    fn load() -> Result<Self, Box<dyn Error>> {
        // Match testdata/src/ssr.ts: generate once, then borrow on every request.
        let entries: Vec<Value> = (0..1000)
            .map(
                |_| json!({ "id": Uuid::new_v4().to_string(), "name": Uuid::new_v4().to_string() }),
            )
            .collect();
        Ok(Self {
            home: Page::load("index", "page.html", false)?,
            ssr: Page::load("ssr", "page.html", false)?,
            throughput: Page::load("throughput", "page.html", false)?,
            detail: Page::load("detail", "detail.html", false)?,
            initial: Page::load("initial", "page.html", false)?,
            client: Page::load("client", "page.html", true)?,
            table_state: json!({ "entries": entries }),
            client_state: json!({ "entries": [], "id": "", "isDetail": false }),
            client_detail_state: json!({ "entries": [], "id": "", "isDetail": true }),
        })
    }
}

async fn page(State(state): State<Arc<AppState>>, uri: Uri) -> Response {
    let path = uri.path();
    match path {
        "/" => state.home.render(path, &Value::Null),
        "/initial-load" => state.initial.render(path, &Value::Null),
        "/client-side-rendered" => state.client.render(path, &state.client_state),
        "/server-side-rendered" | "/ssr-throughput" => {
            // Node's setTimeout(resolve, 0) in the shared fixture has a 1 ms floor.
            tokio::time::sleep(Duration::from_millis(1)).await;
            let page = if path == "/ssr-throughput" {
                &state.throughput
            } else {
                &state.ssr
            };
            page.render(path, &state.table_state)
        }
        _ => StatusCode::NOT_FOUND.into_response(),
    }
}

async fn server_detail(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    uri: Uri,
) -> Response {
    state.detail.render(uri.path(), &json!({ "id": id }))
}

async fn client_detail(State(state): State<Arc<AppState>>, uri: Uri) -> Response {
    state.client.render(uri.path(), &state.client_detail_state)
}

fn app(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/", get(page))
        .route("/server-side-rendered", get(page))
        .route("/ssr-throughput", get(page))
        .route("/initial-load", get(page))
        .route("/client-side-rendered", get(page))
        .route("/server-side-rendered/{id}", get(server_detail))
        .route("/client-side-rendered/{id}", get(client_detail))
        .nest_service(
            "/assets",
            ServeDir::new("dist/public")
                .precompressed_br()
                .precompressed_gzip(),
        )
        .with_state(state)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".into());
    let port: u16 = env::var("PORT").unwrap_or_else(|_| "3000".into()).parse()?;
    let state = Arc::new(AppState::load()?);
    let listener = tokio::net::TcpListener::bind((host.as_str(), port)).await?;
    println!("WebUI listening on http://{}", listener.local_addr()?);
    axum::serve(listener, app(state))
        .with_graceful_shutdown(shutdown())
        .await?;
    Ok(())
}

async fn shutdown() {
    #[cfg(unix)]
    {
        let mut terminate =
            tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
                .expect("install SIGTERM handler");
        tokio::select! {
            result = tokio::signal::ctrl_c() => result.expect("listen for Ctrl-C"),
            _ = terminate.recv() => {}
        }
    }
    #[cfg(not(unix))]
    tokio::signal::ctrl_c().await.expect("listen for Ctrl-C");
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{body::Body, http::Request};
    use tower::ServiceExt;

    #[test]
    fn buffered_writes_preserve_text_and_attribute_escaping() {
        let ascii: String = (0..=127).map(char::from).collect();
        for value in ["", "unchanged", "&<>\"'/", "é水🙂/", &ascii] {
            let escaped = webui_handler::encode_safe(value);
            let mut writer = StringWriter(String::from("prefix:"));
            writer.write_escaped(value).unwrap();
            writer.write_escaped_attribute("data-value", value).unwrap();
            assert_eq!(
                writer.0,
                format!("prefix:{escaped} data-value=\"{escaped}\"")
            );
        }
    }

    async fn request(app: Router, path: &str) -> (StatusCode, String) {
        let response = app
            .oneshot(Request::builder().uri(path).body(Body::empty()).unwrap())
            .await
            .unwrap();
        let status = response.status();
        let body = axum::body::to_bytes(response.into_body(), 2_000_000)
            .await
            .unwrap();
        (status, String::from_utf8(body.to_vec()).unwrap())
    }

    #[tokio::test]
    async fn table_routes_render_the_same_stable_thousand_uuid_pairs() {
        let state = Arc::new(AppState::load().unwrap());
        let app = app(state.clone());
        for (path, columns) in [("/server-side-rendered", 3), ("/ssr-throughput", 2)] {
            let (status, html) = request(app.clone(), path).await;
            assert_eq!(status, StatusCode::OK);
            assert_eq!(html.matches("<tr>").count(), 1000);
            assert_eq!(html.matches("<td>").count(), 1000 * columns);
            assert!(!html.contains("<script"));
            for entry in state.table_state["entries"].as_array().unwrap() {
                let id = entry["id"].as_str().unwrap();
                let name = entry["name"].as_str().unwrap();
                assert!(html.contains(&format!("<td>{id}</td>")));
                assert!(html.contains(&format!("<td>{name}</td>")));
                if columns == 3 {
                    assert!(html.replace("&#x2F;", "/").contains(&format!(
                        "<a href=\"/server-side-rendered/{id}\">View →</a>"
                    )));
                }
            }
            assert_eq!(html, request(app.clone(), path).await.1);
        }
    }

    #[tokio::test]
    async fn dynamic_detail_responses_remain_fresh_when_sizes_change() {
        let app = app(Arc::new(AppState::load().unwrap()));
        for id in ["first".to_string(), "x".repeat(4096), "last".to_string()] {
            let (status, html) = request(app.clone(), &format!("/server-side-rendered/{id}")).await;
            assert_eq!(status, StatusCode::OK);
            assert!(html.contains(&format!("<p id=\"detail-id\">{id}</p>")));
        }
    }

    #[tokio::test]
    async fn client_routes_defer_data_to_the_browser_and_ssr_detail_escapes_input() {
        let app = app(Arc::new(AppState::load().unwrap()));
        for path in ["/client-side-rendered", "/client-side-rendered/example"] {
            let (status, html) = request(app.clone(), path).await;
            assert_eq!(status, StatusCode::OK);
            let document = html.split("<script").next().unwrap();
            assert!(!document.contains("<tr>"));
            assert!(!document.contains("id=\"detail-id\""));
            assert!(html.contains("/assets/client.js"));
            assert!(!html.contains(">example</p>"));
        }
        let (status, html) = request(app.clone(), "/server-side-rendered/%3Cscript%3E%26%22").await;
        assert_eq!(status, StatusCode::OK);
        assert!(html.contains("id=\"detail-id\">&lt;script&gt;&amp;&quot;</p>"));
        assert!(!html.contains("<script>"));
        assert_eq!(
            request(app.clone(), "/not-a-route").await.0,
            StatusCode::NOT_FOUND
        );
        assert_eq!(
            request(app.clone(), "/assets/protocol.bin").await.0,
            StatusCode::NOT_FOUND
        );
        let (status, html) = request(app, "/initial-load").await;
        assert_eq!(status, StatusCode::OK);
        assert!(html.contains("/assets/initial-load.css"));
        assert!(!html.contains("<script"));
    }
}
