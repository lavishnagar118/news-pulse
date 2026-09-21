import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { IIngestionRunner } from './ingestion.interface';
import { config } from '../../config';

/**
 * Local development runner: triggers the Python scraper as a local subprocess.
 * Uses detached child process so execution does not block Node API responses.
 */
export class SubprocessIngestionRunner implements IIngestionRunner {
  async trigger(jobId: string): Promise<void> {
    // Resolve absolute path to scraper/main.py
    let scraperScriptPath = path.resolve(__dirname, '../../../../scraper/main.py');
    if (!fs.existsSync(scraperScriptPath)) {
      scraperScriptPath = path.resolve(process.cwd(), config.pythonScraperPath);
    }

    if (!fs.existsSync(scraperScriptPath)) {
      throw new Error(`Scraper script not found at ${scraperScriptPath}`);
    }

    const scraperDir = path.dirname(scraperScriptPath);

    // Spawn python process detached so it does not block the API response
    const child = spawn(config.pythonBin, [scraperScriptPath, '--job-id', jobId], {
      detached: true,
      stdio: 'ignore',
      cwd: scraperDir,
    });

    child.unref();
  }
}
