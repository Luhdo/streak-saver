
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
 * @classdesc A class for automatically committing and pushing changes to a Git repository.
 */
class AutoCommit {
  private git: SimpleGit;
  private today: Dayjs;
  private logFile: string;
  private readonly apiUrl: string;

  /**
   * @constructor
   * @memberof AutoCommit
   * @constructs AutoCommit
   */
  constructor() {
    this.git = simpleGit();
    this.today = dayjs();
    this.logFile = "auto_commit.log";
    this.apiUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/commits`;
  }

  /**
   * @method getFormattedDate
   * @memberof AutoCommit
   * @private
   * @returns {string} The formatted date string (YYYY-MM-DD).
   */
  private getFormattedDate(): string {
    return this.today.format("YYYY-MM-DD");
  }

  /**
   * @method fetchCommits
   * @memberof AutoCommit
   * @private
   * @async
   * @param {string} since - The start date for fetching commits.
   * @param {string} until - The end date for fetching commits.
   * @returns {Promise<any[]>} A promise that resolves with an array of commit objects.
   * @throws {Error} If there's an error fetching commits from the GitHub API.
   */
  private async fetchCommits(since: string, until: string): Promise<any[]> {
    try {
      const url = `${this.apiUrl}?since=${since}&until=${until}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          "User-Agent": "commit-checker",
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `GitHub API error: ${response.status} - ${response.statusText} - ${errorBody}`
        );
      }

      return await response.json();
    } catch (err: any) {
      this.log(`Error fetching commits: ${err.message}`);
      throw err;
    }
  }

  /**
   * @method checkTodayCommits
   * @memberof AutoCommit
   * @private
   * @async
   * @returns {Promise<boolean>} A promise that resolves with a boolean indicating whether commits exist for today.
   * @throws {Error} If there's an error checking for commits.
   */
  private async checkTodayCommits(): Promise<boolean> {
    try {
      const [since, until] = [
        this.today.startOf("day").toISOString(),
        this.today.endOf("day").toISOString(),
      ];
      const commits = await this.fetchCommits(since, until);
      return commits.length > 0;
    } catch (err: any) {
      this.log(`Error checking commits: ${err.message}`);
      throw err;
    }
  }

  /**
   * @method commitAndPush
   * @memberof AutoCommit
   * @private
   * @async
   * @returns {Promise<void>} A promise that resolves when the commit and push operations are complete.
   * @throws {Error} If there's a Git push error.
   */
  private async commitAndPush(): Promise<void> {
    try {
      await this.git.add(FILE_TO_UPDATE);
      await this.git.commit(COMMIT_MESSAGE);
      await this.git.push("origin", BRANCH);
      this.log("Auto-commit pushed.");
    } catch (err: any) {
      this.log(`Git push error: ${err.message}`);
      throw err;
    }
  }

  /**
   * @method log
   * @memberof AutoCommit
   * @private
   * @param {string} message - The log message to write.
   */
  private log(message: string): void {
    try {
      const logEntry = `[${this.getFormattedDate()}] ${message}\n`;
      appendFileSync(this.logFile, logEntry);
      console.log(logEntry.trim());
    } catch (err: any) {
      console.error(`Error writing to log: ${err.message}`);
    }
  }

  /**
   * @method run
   * @memberof AutoCommit
   * @async
   * @returns {Promise<void>} A promise that resolves when the auto-commit process is complete.
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
   * @memberof AutoCommit
   * @public
   * @returns {void} Starts the scheduled job for auto-commit.
   */
  start(): void {
    try {
      scheduleJob("55 23 * * *", () => this.run());
    } catch (err: any) {
      this.log(`Error scheduling job: ${err.message}`);
    }
  }

  /**
   * @method reset
   * @memberof AutoCommit
   * @async
   * @returns {Promise<void>} A promise that resolves when the Git reset is complete.
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

  const evolveMock = require("./utilities/evolve").default;
  const checkTodayCommitsMock = jest.spyOn(autoCommit, "checkTodayCommits");
  const commitAndPushMock = jest.spyOn(autoCommit, "commitAndPush");

  it("should call evolve and commitAndPush when no commits exist", async () => {
    checkTodayCommitsMock.mockResolvedValue(false);
    try {
      await autoCommit.run();
      expect(evolveMock).toHaveBeenCalled();
      expect(commitAndPushMock).toHaveBeenCalled();
    } catch (error) {
      console.error("Test failed with error:", error);
    } finally {
      checkTodayCommitsMock.mockRestore();
      commitAndPushMock.mockRestore();
    }
  });

  it("should not call evolve and commitAndPush when commits exist", async () => {
    checkTodayCommitsMock.mockResolvedValue(true);
    try {
      await autoCommit.run();
      expect(evolveMock).not.toHaveBeenCalled();
      expect(commitAndPushMock).not.toHaveBeenCalled();
    } catch (error) {
      console.error("Test failed with error:", error);
    } finally {
      checkTodayCommitsMock.mockRestore();
      commitAndPushMock.mockRestore();
    }
  });
}
