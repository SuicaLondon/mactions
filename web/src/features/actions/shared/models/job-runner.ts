/**
 * Whether a job ran on the runner with this GitHub id. Without a runner nothing matches, not even
 * jobs whose runner GitHub has not reported.
 */
export function ranOnRunner(job: { runner_id?: number | null }, runnerId: number | undefined) {
  return runnerId !== undefined && job.runner_id === runnerId;
}
