//! Parse declared dependencies and conservatively match runtime job names.
use super::source::MAX_SOURCE_BYTES;
use anyhow::{ensure, Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::{BTreeMap, HashSet};

const MAX_NODES: usize = 256;
const MAX_MATRIX: usize = 256;
const MAX_NAME_BYTES: usize = 1024;
const MAX_MATCHER_BYTES: usize = 256 * 1024;
const MAX_MATRIX_BYTES: usize = 256 * 1024;

#[derive(Deserialize)]
struct Workflow {
    jobs: BTreeMap<String, JobDefinition>,
}

#[derive(Deserialize)]
struct JobDefinition {
    name: Option<String>,
    #[serde(default)]
    needs: Value,
    strategy: Option<Strategy>,
    uses: Option<String>,
}

#[derive(Deserialize)]
struct Strategy {
    #[serde(default)]
    matrix: Value,
}

#[derive(Serialize)]
pub(super) struct Node {
    id: String,
    name: String,
    needs: Vec<String>,
    job_ids: Vec<u64>,
    matrix: bool,
    reusable: bool,
}

enum Matcher {
    Names(Vec<String>),
    Matrix {
        base: String,
        values: Vec<Vec<String>>,
    },
}

impl Matcher {
    fn matches(&self, name: &str) -> bool {
        match self {
            Self::Names(names) => names.iter().any(|candidate| candidate == name),
            Self::Matrix { base, values } => {
                let Some(suffix) = name
                    .strip_prefix(&format!("{base} ("))
                    .and_then(|name| name.strip_suffix(')'))
                else {
                    return false;
                };
                let mut actual: Vec<_> = suffix.split(", ").collect();
                actual.sort_unstable();
                values.iter().any(|expected| {
                    expected
                        .iter()
                        .map(String::as_str)
                        .eq(actual.iter().copied())
                })
            }
        }
    }
}

pub(super) fn graph(yaml: &str, jobs: &[Value]) -> Result<(Vec<Node>, Vec<u64>, bool)> {
    ensure!(
        yaml.len() <= MAX_SOURCE_BYTES,
        "This workflow exceeds the 256 KiB graph limit"
    );
    let options = serde_saphyr::options! {
        budget: serde_saphyr::budget! {
            max_depth: 64,
            max_events: 50_000,
            max_nodes: 25_000,
            max_documents: 1,
            max_aliases: 256,
            max_anchors: 256,
            max_total_scalar_bytes: MAX_SOURCE_BYTES * 2,
            max_recorded_anchor_bytes: MAX_SOURCE_BYTES * 2,
        },
        alias_limits: serde_saphyr::alias_limits! {
            max_total_replayed_events: 25_000,
            max_replay_stack_depth: 32,
            max_alias_expansions_per_anchor: 256,
        },
        duplicate_keys: serde_saphyr::options::DuplicateKeyPolicy::Error,
        merge_keys: serde_saphyr::options::MergeKeyPolicy::Error,
        strict_booleans: true,
        reject_unsupported_tags: true,
        emit_comments: false,
        with_snippet: false,
    };
    let workflow: Workflow = serde_saphyr::from_str_with_options(yaml, options).map_err(|_| {
        anyhow::anyhow!("The workflow cannot be parsed within the supported YAML limits")
    })?;
    ensure!(
        !workflow.jobs.is_empty() && workflow.jobs.len() <= MAX_NODES,
        "The workflow must contain between 1 and 256 declared jobs"
    );
    let mut nodes = Vec::new();
    let mut matchers = Vec::new();
    let mut matcher_bytes = 0;
    for (id, job) in &workflow.jobs {
        ensure!(
            valid_id(id),
            "The workflow contains an invalid job identifier"
        );
        let needs = match &job.needs {
            Value::Null => vec![],
            Value::String(id) => vec![id.clone()],
            Value::Array(ids) => ids
                .iter()
                .map(|id| {
                    id.as_str()
                        .map(String::from)
                        .context("A job dependency is not a static identifier")
                })
                .collect::<Result<_>>()?,
            _ => anyhow::bail!("A job dependency is not a static identifier"),
        };
        ensure!(
            needs
                .iter()
                .all(|dependency| dependency != id && workflow.jobs.contains_key(dependency)),
            "The workflow references a missing or self-dependent job"
        );
        let mut unique = HashSet::new();
        let needs: Vec<_> = needs
            .into_iter()
            .filter(|id| unique.insert(id.clone()))
            .collect();
        nodes.push(Node {
            id: id.clone(),
            name: job.name.clone().unwrap_or_else(|| id.clone()),
            needs,
            job_ids: vec![],
            matrix: job
                .strategy
                .as_ref()
                .is_some_and(|strategy| !strategy.matrix.is_null()),
            reusable: job.uses.is_some(),
        });
        matchers.push(matcher(id, job).filter(|matcher| {
            let bytes = match matcher {
                Matcher::Names(names) => names.iter().map(String::len).sum::<usize>(),
                Matcher::Matrix { base, values } => {
                    base.len() + values.iter().flatten().map(String::len).sum::<usize>()
                }
            };
            if bytes > MAX_MATCHER_BYTES - matcher_bytes {
                return false;
            }
            matcher_bytes += bytes;
            true
        }));
    }
    // Validate the declaration, never manufacture a topological order from API timestamps.
    let mut visited = HashSet::new();
    loop {
        let before = visited.len();
        for node in &nodes {
            if node
                .needs
                .iter()
                .all(|dependency| visited.contains(dependency))
            {
                visited.insert(node.id.clone());
            }
        }
        if visited.len() == nodes.len() {
            break;
        }
        ensure!(
            visited.len() > before,
            "The workflow dependency graph contains a cycle"
        );
    }
    let mut unmapped = Vec::new();
    // An unknown expression can evaluate to any display name, including another job's name.
    // In that case the source graph is valid, but no runtime ownership is asserted.
    let unresolved = matchers.iter().any(Option::is_none);
    for job in jobs {
        let id = job["id"]
            .as_u64()
            .context("GitHub returned a job without an ID")?;
        let name = job["name"].as_str().unwrap_or("");
        let candidates: Vec<_> = matchers
            .iter()
            .enumerate()
            .filter(|(_, matcher)| {
                !unresolved
                    && matcher
                        .as_ref()
                        .is_some_and(|matcher| matcher.matches(name))
            })
            .map(|(index, _)| index)
            .collect();
        if candidates.len() == 1 {
            nodes[candidates[0]].job_ids.push(id);
        } else {
            unmapped.push(id);
        }
    }
    // Two runtime records cannot safely be attributed to one non-matrix definition.
    for node in &mut nodes {
        if !node.matrix && node.job_ids.len() > 1 {
            unmapped.append(&mut node.job_ids);
        }
    }
    unmapped.sort_unstable();
    unmapped.dedup();
    let partial = unresolved || !unmapped.is_empty();
    Ok((nodes, unmapped, partial))
}

fn valid_id(id: &str) -> bool {
    id.bytes()
        .next()
        .is_some_and(|first| first.is_ascii_alphabetic() || first == b'_')
        && id
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || b"_-".contains(&byte))
}

fn scalar(value: &Value) -> Option<String> {
    match value {
        Value::String(value) if !value.contains("${{") => Some(value.clone()),
        Value::Number(value) => Some(value.to_string()),
        Value::Bool(value) => Some(value.to_string()),
        _ => None,
    }
}

fn matcher(id: &str, job: &JobDefinition) -> Option<Matcher> {
    if job.uses.is_some() {
        return None;
    }
    let Some(strategy) = job
        .strategy
        .as_ref()
        .filter(|strategy| !strategy.matrix.is_null())
    else {
        let name = job.name.as_deref().unwrap_or(id);
        return (name.len() <= MAX_NAME_BYTES && !name.contains("${{"))
            .then(|| Matcher::Names(vec![name.into()]));
    };
    let rows = expand_matrix(&strategy.matrix)?;
    if let Some(template) = &job.name {
        let names = rows
            .iter()
            .map(|row| render_name(template, row))
            .collect::<Option<Vec<_>>>()?;
        return Some(Matcher::Names(names));
    }
    let values = rows
        .iter()
        .map(|row| {
            let mut values = row.values().map(scalar).collect::<Option<Vec<_>>>()?;
            // Default names join scalar values. Delimiter-containing values are ambiguous.
            if values.iter().any(|value| value.contains([',', '(', ')'])) {
                return None;
            }
            if id.len() + values.iter().map(String::len).sum::<usize>() + values.len() * 2 + 3
                > MAX_NAME_BYTES
            {
                return None;
            }
            values.sort();
            Some(values)
        })
        .collect::<Option<Vec<_>>>()?;
    Some(Matcher::Matrix {
        base: id.into(),
        values,
    })
}

fn render_name(template: &str, row: &Map<String, Value>) -> Option<String> {
    let mut rest = template;
    let mut result = String::new();
    while let Some((prefix, expression)) = rest.split_once("${{") {
        if result.len() + prefix.len() > MAX_NAME_BYTES {
            return None;
        }
        result.push_str(prefix);
        let (expression, suffix) = expression.split_once("}}")?;
        let key = expression.trim().strip_prefix("matrix.")?;
        if !valid_id(key) {
            return None;
        }
        let value = scalar(row.get(key)?)?;
        if result.len() + value.len() > MAX_NAME_BYTES {
            return None;
        }
        result.push_str(&value);
        rest = suffix;
    }
    if result.len() + rest.len() > MAX_NAME_BYTES {
        return None;
    }
    result.push_str(rest);
    Some(result)
}

fn row_bytes(row: &Map<String, Value>) -> Option<usize> {
    row.iter().try_fold(0, |bytes, (key, value)| {
        Some(bytes + key.len() + scalar(value)?.len())
    })
}

fn expand_matrix(matrix: &Value) -> Option<Vec<Map<String, Value>>> {
    let fields = matrix.as_object()?;
    let mut rows = vec![Map::new()];
    let mut axes = 0;
    for (key, values) in fields
        .iter()
        .filter(|(key, _)| *key != "include" && *key != "exclude")
    {
        axes += 1;
        let values = values.as_array()?;
        if values.is_empty() || rows.len().saturating_mul(values.len()) > MAX_MATRIX {
            return None;
        }
        let mut expanded = Vec::new();
        let mut expanded_bytes = 0;
        for row in &rows {
            let row_size = row_bytes(row)?;
            for value in values {
                expanded_bytes += row_size + key.len() + scalar(value)?.len();
                if expanded_bytes > MAX_MATRIX_BYTES {
                    return None;
                }
                let mut variant = row.clone();
                variant.insert(key.clone(), value.clone());
                expanded.push(variant);
            }
        }
        rows = expanded;
    }
    if let Some(excludes) = fields.get("exclude") {
        for exclude in excludes.as_array()? {
            let exclude = exclude.as_object()?;
            for value in exclude.values() {
                scalar(value)?;
            }
            rows.retain(|row| {
                !exclude
                    .iter()
                    .all(|(key, value)| row.get(key) == Some(value))
            });
        }
    }
    if axes == 0 {
        rows.clear();
    }
    let originals = rows.clone();
    let mut expanded_bytes = rows
        .iter()
        .try_fold(0, |bytes, row| Some(bytes + row_bytes(row)?))?;
    if let Some(includes) = fields.get("include") {
        for include in includes.as_array()? {
            let include = include.as_object()?;
            let include_bytes = row_bytes(include)?;
            let mut matched = false;
            for (index, original) in originals.iter().enumerate() {
                if include
                    .iter()
                    .all(|(key, value)| original.get(key).is_none_or(|original| original == value))
                {
                    // Charge the whole inclusion before cloning, even overwritten fields.
                    expanded_bytes += include_bytes;
                    if expanded_bytes > MAX_MATRIX_BYTES {
                        return None;
                    }
                    rows[index].extend(include.clone());
                    matched = true;
                }
            }
            if !matched {
                expanded_bytes += include_bytes;
                if expanded_bytes > MAX_MATRIX_BYTES {
                    return None;
                }
                rows.push(include.clone());
            }
            if rows.len() > MAX_MATRIX {
                return None;
            }
        }
    }
    (!rows.is_empty()).then_some(rows)
}
