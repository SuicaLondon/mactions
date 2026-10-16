//! Read-only GitHub activity. Detail data is fetched only when its view is opened.
mod cache;
mod inventory;
mod jobs;
mod normalize;
mod read;
mod runs;
mod scope;
mod topology;

pub use cache::JobListCache;
pub use inventory::{runners, work};
pub use jobs::{job, job_history};
pub(crate) use read::parallel_reads;
pub use runs::{run, runs, runs_filtered};
pub use scope::{repositories, Scope};
pub use topology::run_graph;

#[cfg(test)]
mod tests;
