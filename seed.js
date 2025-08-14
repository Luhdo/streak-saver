
import { config as cg } from "dotenv";
cg();

import { scheduleJob } from "node-schedule";
import simpleGit, { SimpleGit } from "simple-git";
import dayjs, { Dayjs } from "dayjs";
import { appendFileSync } from "node:fs";
import evolve from "./utilities/evolve";
import {
  BRANCH,
  COMMIT_MESSAGE,
  FILE_TO_UPDATE,
  GITHUB_TOKEN,
  GITHUB_USERNAME,
  REPO_NAME,
} from "./config";

/**
 * @class AutoCommit
 * @classdesc A class for automatically committing changes to a Git repository.
 */
class AutoCommit {
  private git: SimpleGit;
  private today: Dayjs;
  private logFile: string;
  private readonly apiUrl: string;

  /**
   * @constructor
   * @description Initializes the AutoCommit class.
   */
  constructor() {
    this.git = simpleGit();
    this.today = dayjs();
    this.logFile = "auto_commit.log";
    this.apiUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/commits`;
  }

  /**
   * @private
   * @method getFormattedDate
   * @returns {string} The current date formatted as YYYY-MM-DD.
   * @description Returns the current date in YYYY-MM-DD format.
   */
  private getFormattedDate(): string {
    return this.today.format("YYYY-MM-DD");
  }

  /**
   * @private
   * @async
   * @method fetchCommits
   * @param {string} since - The start date for fetching commits (ISO string).
   * @param {string} until - The end date for fetching commits (ISO string).
   * @returns {Promise<any[]>} An array of commit objects.
   * @description Fetches commits from the GitHub API within a specified date range.
   */
  private async fetchCommits(since: string, until: string): Promise<any[]> {
    const url = `${this.apiUrl}?since=${since}&until=${until}`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          "User-Agent": "commit-checker",
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`GitHub API error: ${error}`);
      }

      return await response.json();
    } catch (err: any) {
      this.log(`Error fetching commits: ${err.message}`);
      return [];
    }
  }

  /**
   * @private
   * @async
   * @method checkTodayCommits
   * @returns {Promise<boolean>} True if commits exist for today, false otherwise.
   * @description Checks if commits exist for the current day.
   */
  private async checkTodayCommits(): Promise<boolean> {
    const [since, until] = [
      this.today.startOf("day").toISOString(),
      this.today.endOf("day").toISOString(),
    ];
    const commits = await this.fetchCommits(since, until);
    return commits.length > 0;
  }

  /**
   * @private
   * @async
   * @method commitAndPush
   * @returns {Promise<void>}
   * @description Adds changes, commits, and pushes to the remote repository.
   */
  private async commitAndPush(): Promise<void> {
    try {
      await this.git.add(FILE_TO_UPDATE);
      await this.git.commit(COMMIT_MESSAGE);
      await this.git.push("origin", BRANCH);
      this.log("Auto-commit pushed.");
    } catch (err: any) {
      this.log(`Git push error: ${err.message}`);
    }
  }

  /**
   * @private
   * @method log
   * @param {string} message - The message to log.
   * @description Logs a message to both the console and a log file.
   */
  private log(message: string): void {
    const logEntry = `[${this.getFormattedDate()}] ${message}\n`;
    appendFileSync(this.logFile, logEntry);
    console.log(logEntry.trim());
  }

  /**
   * @async
   * @method run
   * @returns {Promise<void>}
   * @description Runs the auto-commit process. Checks for existing commits, evolves the file, and commits/pushes if necessary.
   */
  async run(): Promise<void> {
    try {
      if (await this.checkTodayCommits()) {
        this.log("Commit already exists. No action needed.");
        return;
      }

      await evolve();
      await this.commitAndPush();
      this.log("Auto-commit successful.");
    } catch (error: any) {
      this.log(`Error during auto-commit: ${error.message}`);
    }
  }

  /**
   * @method start
   * @description Schedules the auto-commit process to run daily at 23:55.
   */
  start(): void {
    scheduleJob("55 23 * * *", () => this.run());
  }

  /**
   * @async
   * @method reset
   * @returns {Promise<void>}
   * @description Resets the Git repository to the last commit (hard reset).
   */
  async reset(): Promise<void> {
    try {
      await this.git.reset("hard");
      this.log("Git reset successful.");
    } catch (err: any) {
      this.log(`Git reset error: ${err.message}`);
    }
  }
}

const autoCommit = new AutoCommit();
autoCommit.start();

if (process.env.NODE_ENV === "test") {
  console.log("Running test case...");
  jest.mock("./utilities/evolve", () => ({
    __esModule: true,
    default: jest.fn().mockResolvedValue(undefined),
  }));

  (autoCommit.checkTodayCommits as jest.Mock).mockResolvedValue(false);

  autoCommit.run().then(() => {
    expect(evolve).toHaveBeenCalled();
    console.log("Test case 1 passed");
  });

  (autoCommit.checkTodayCommits as jest.Mock).mockResolvedValue(true);
  autoCommit.run().then(() => {
    expect(evolve).not.toHaveBeenCalled();
    console.log("Test case 2 passed");
  });
}
