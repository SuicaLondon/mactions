use super::*;
use std::sync::Arc;

struct ConnectionFixture(std::result::Result<Value, String>);

impl crate::core::Backend for ConnectionFixture {
    fn api(&self, method: &str, endpoint: &str, body: Option<Value>) -> Result<Value> {
        assert_eq!(method, "GET");
        assert_eq!(endpoint, "/user");
        assert!(body.is_none());
        self.0.clone().map_err(anyhow::Error::msg)
    }
    fn prepare(&self, _: &crate::core::Runner) -> Result<String> {
        unreachable!()
    }
    fn configure(&self, _: &crate::core::Runner) -> Result<u64> {
        unreachable!()
    }
    fn recover_registration(&self, _: &crate::core::Runner) -> Result<Option<u64>> {
        unreachable!()
    }
    fn install_service(&self, _: &crate::core::Runner) -> Result<()> {
        unreachable!()
    }
    fn start(&self, _: &crate::core::Runner) -> Result<()> {
        unreachable!()
    }
    fn stop(&self, _: &crate::core::Runner) -> Result<()> {
        unreachable!()
    }
    fn remove_service(&self, _: &crate::core::Runner) -> Result<()> {
        unreachable!()
    }
    fn local_status(&self, _: &crate::core::Runner) -> Result<String> {
        unreachable!()
    }
}

#[test]
fn connection_distinguishes_authentication_from_unavailable_account_checks() {
    let cases = [
            (Ok(json!({"login":"octocat"})), "connected"),
            (
                Err("GitHub authentication is missing or expired. Run `mactions auth login` on this Mac".into()),
                "disconnected",
            ),
            (Err("Could not connect to api.github.com".into()), "unavailable"),
            (Ok(json!({"message":"Service unavailable"})), "unavailable"),
            (Ok(json!({"login":""})), "unavailable"),
        ];
    for (response, expected_state) in cases {
        let dir = tempfile::tempdir().unwrap();
        let manager = Manager::new(
            dir.path().join("data"),
            Arc::new(ConnectionFixture(response.clone())),
        )
        .unwrap();
        let result = connection(&manager);
        assert_eq!(result["state"], expected_state);
        assert_eq!(result["connected"], expected_state == "connected");
        if expected_state == "connected" {
            assert_eq!(result["login"], "octocat");
        } else {
            assert!(result["login"].is_null());
        }
        if let Err(message) = response {
            assert_eq!(result["message"], message);
        } else {
            assert!(result["message"].is_string());
        }
    }
}
