import { Injectable, Logger } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * The bridge between "an editor published something" and "the static HTML is
 * rebuilt".
 *
 * The API cannot run the prerender itself. The renderer is a one-shot container
 * that drives a headless browser against the running site; starting it would
 * mean handing this process the Docker socket, which is root on the host - an
 * unacceptable amount of authority for a CMS to hold in order to refresh some
 * files.
 *
 * So this writes a REQUEST and something outside decides. A marker file in a
 * volume both sides can see, and the prerender-watch service, which renders
 * when the marker is newer than the start of the last successful build. The
 * API's authority stops at "I would like a rebuild".
 *
 * Nothing here is awaited by a request handler. An editor pressing Publish gets
 * their response immediately; the rebuild is a consequence, not a step.
 */
@Injectable()
export class PrerenderService {
  private readonly log = new Logger('Prerender');
  /** Shared with the prerender-watch service. */
  private readonly dir = process.env.PRERENDER_STATE_DIR ?? '/app/prerender-state';
  private readonly requestFile = join(this.dir, 'rebuild-requested.json');
  private readonly statusFile = join(this.dir, 'last-run.json');
  private readonly successFile = join(this.dir, 'last-success.json');

  /** Coalesces a burst. Publishing a page fires several writes in a second and
      they all want the same single rebuild. */
  private pending: NodeJS.Timeout | null = null;
  private reasons = new Set<string>();
  private static readonly COALESCE_MS = 5_000;

  requestRebuild(reason: string) {
    this.reasons.add(reason);
    if (this.pending) return;
    this.pending = setTimeout(() => {
      const reasons = [...this.reasons];
      this.reasons.clear();
      this.pending = null;
      // Deliberately not awaited: a failure to write the marker must not turn
      // into a failed publish. It is logged and surfaced through status.
      void this.write(reasons);
    }, PrerenderService.COALESCE_MS);
    this.pending.unref?.();
  }

  private async write(reasons: string[]) {
    try {
      await mkdir(dirname(this.requestFile), { recursive: true });
      await writeFile(
        this.requestFile,
        JSON.stringify({ requestedAt: new Date().toISOString(), reasons }, null, 2),
      );
      this.log.log(`Rebuild requested (${reasons.join(', ')})`);
    } catch (err) {
      // A CMS whose edits never reach the crawlable HTML is worse than no
      // prerendering, because it looks like it is working. Loud on the way down.
      this.log.error(`Could not request a rebuild: ${(err as Error).message}`);
    }
  }

  /**
   * What the admin shows. Deliberately includes the REQUEST as well as the last
   * run, because the failure mode that matters is "requested at 14:02, last
   * successful run 11:40" - a rebuild that was asked for and never happened.
   */
  async status() {
    const read = async (f: string) => {
      try { return JSON.parse(await readFile(f, 'utf8')); } catch { return null; }
    };
    const [requested, last, success] = await Promise.all([
      read(this.requestFile), read(this.statusFile), read(this.successFile),
    ]);
    const requestedAt = requested?.requestedAt ? Date.parse(requested.requestedAt) : null;
    // Against the START of the last SUCCESSFUL run. A failed run also has a
    // finish time, and comparing with that reported a failure as up to date. An
    // edit made while a render was in progress was not in that render, even
    // though the render finished after it.
    const coveredFrom = success?.startedAt ? Date.parse(success.startedAt) : null;
    return {
      requested,
      last,
      lastSuccess: success,
      stale: Boolean(requestedAt && (!coveredFrom || coveredFrom <= requestedAt)),
      // The most recent attempt failed. The site is still serving the build
      // from lastSuccess; this is what tells an editor their change is stuck.
      failing: last?.ok === false,
    };
  }
}
