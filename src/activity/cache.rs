//! Bounded memory of Job lists for completed Run attempts, which GitHub never changes.
use serde_json::Value;
use std::{collections::HashMap, sync::Mutex};

/// Total cached Jobs across all lists. Lists omit Steps, so this stays a few MiB.
const MAX_JOBS: usize = 2048;

/// One Job list request: a single attempt, or every attempt up to and including `attempt`.
#[derive(Clone, PartialEq, Eq, Hash)]
pub(super) struct JobListKey {
    repo: String,
    run_id: u64,
    attempt: u64,
    all_attempts: bool,
}

impl JobListKey {
    pub(super) fn new(repo: &str, run_id: u64, attempt: u64, all_attempts: bool) -> Self {
        Self {
            repo: repo.to_ascii_lowercase(),
            run_id,
            attempt,
            all_attempts,
        }
    }
}

/// Least-recently-used Job lists, owned by the `Manager` for the life of the process.
#[derive(Default)]
pub struct JobListCache(Mutex<Lists>);

#[derive(Default)]
struct Lists {
    clock: u64,
    jobs: usize,
    entries: HashMap<JobListKey, (u64, Vec<Value>)>,
}

impl JobListCache {
    pub(super) fn get(&self, key: &JobListKey) -> Option<Vec<Value>> {
        let mut lists = self.0.lock().unwrap();
        lists.clock += 1;
        let clock = lists.clock;
        let (used, jobs) = lists.entries.get_mut(key)?;
        *used = clock;
        Some(jobs.clone())
    }

    /// Store a list only when it can no longer change; the caller checks the Run's status.
    pub(super) fn insert(&self, key: JobListKey, jobs: &[Value]) {
        if jobs.len() > MAX_JOBS
            || jobs
                .iter()
                .any(|job| job["status"].as_str() != Some("completed"))
        {
            return;
        }
        let mut lists = self.0.lock().unwrap();
        if let Some((_, previous)) = lists.entries.remove(&key) {
            lists.jobs -= previous.len();
        }
        while lists.jobs + jobs.len() > MAX_JOBS {
            let Some(oldest) = lists
                .entries
                .iter()
                .min_by_key(|(_, (used, _))| *used)
                .map(|(key, _)| key.clone())
            else {
                break;
            };
            let (_, evicted) = lists.entries.remove(&oldest).unwrap();
            lists.jobs -= evicted.len();
        }
        lists.clock += 1;
        let clock = lists.clock;
        lists.jobs += jobs.len();
        lists.entries.insert(key, (clock, jobs.to_vec()));
    }

    #[cfg(test)]
    pub(super) fn len(&self) -> usize {
        self.0.lock().unwrap().entries.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn completed(count: usize) -> Vec<Value> {
        vec![json!({"status":"completed"}); count]
    }

    #[test]
    fn evicts_least_recently_used_lists_to_stay_within_the_job_budget() {
        let cache = JobListCache::default();
        let key = |run| JobListKey::new("Example/Repo", run, 1, true);
        cache.insert(key(1), &completed(MAX_JOBS / 2));
        cache.insert(key(2), &completed(MAX_JOBS / 2));
        assert!(cache
            .get(&JobListKey::new("example/repo", 1, 1, true))
            .is_some());
        cache.insert(key(3), &completed(1));
        assert!(cache.get(&key(2)).is_none());
        assert!(cache.get(&key(1)).is_some());
        assert!(cache.get(&key(3)).is_some());
        assert!(cache
            .get(&JobListKey::new("example/repo", 1, 2, true))
            .is_none());
        assert!(cache
            .get(&JobListKey::new("example/repo", 1, 1, false))
            .is_none());

        cache.insert(key(4), &completed(MAX_JOBS + 1));
        assert!(cache.get(&key(4)).is_none());
        assert_eq!(cache.len(), 2);
    }
}
