// Последовательная очередь: один сайт за раз (бережём память под Chromium, CLAUDE.md).
let tail: Promise<unknown> = Promise.resolve();

export function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(task, task);
  // не даём отклонённому хвосту рвать цепочку
  tail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
