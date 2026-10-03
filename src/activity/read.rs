//! Bounded read fanout, pagination, and refresh cadence.
use anyhow::{ensure, Result};
use serde_json::Value;
use std::{
    sync::{
        atomic::{AtomicUsize, Ordering},
        Mutex,
    },
    thread,
};

pub(super) const PAGE_SIZE: usize = 20;
pub(super) const MAX_PAGES: u64 = 100;
pub(super) const FILTERED_MAX_PAGES: u64 = 50; // GitHub caps status-filtered searches at 1,000 runs.
const READ_WORKERS: usize = 4;
pub(super) const ACTIVE_STATUSES: &[&str] =
    &["in_progress", "queued", "waiting", "pending", "requested"];

/// Limit independent read fanout and retain input order, including failed results.
pub(super) fn parallel_reads<T: Sync, U: Send>(
    items: &[T],
    read: impl Fn(&T) -> U + Sync,
) -> Vec<U> {
    if items.len() <= 1 {
        return items.iter().map(read).collect();
    }
    let next = AtomicUsize::new(0);
    let output = Mutex::new((0..items.len()).map(|_| None).collect::<Vec<Option<U>>>());
    thread::scope(|scope| {
        for _ in 0..READ_WORKERS.min(items.len()) {
            let (next, output, read) = (&next, &output, &read);
            scope.spawn(move || loop {
                let index = next.fetch_add(1, Ordering::Relaxed);
                let Some(item) = items.get(index) else { break };
                let result = read(item);
                output.lock().unwrap()[index] = Some(result);
            });
        }
    });
    output
        .into_inner()
        .unwrap()
        .into_iter()
        .map(|value| value.expect("Every input was read"))
        .collect()
}

pub(super) fn page_number(page: u64) -> Result<()> {
    ensure!(
        (1..=MAX_PAGES).contains(&page),
        "Choose a page between 1 and 100"
    );
    Ok(())
}

pub(super) fn refresh_seconds(reads: usize) -> u64 {
    (reads as u64).saturating_mul(2).max(30)
}

pub(super) fn refresh_notice(messages: &mut Vec<String>, seconds: u64) {
    if seconds > 30 {
        messages.push(
            "Automatic refresh slows for this scope. You can refresh manually at any time.".into(),
        );
    }
}

pub(super) fn has_next(response: &Value, length: usize, page: u64) -> bool {
    page < MAX_PAGES
        && response["total_count"]
            .as_u64()
            .map(|total| total > page * PAGE_SIZE as u64)
            .unwrap_or(length == PAGE_SIZE)
}
pub(super) fn reached_run_limit(response: &Value, length: usize, page: u64) -> bool {
    page == MAX_PAGES
        && response["total_count"]
            .as_u64()
            .map(|total| total > MAX_PAGES * PAGE_SIZE as u64)
            .unwrap_or(length == PAGE_SIZE)
}
