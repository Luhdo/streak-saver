
import { config as cg } from "dotenv";
cg();

import { scheduleJob } from "node-schedule";
import simpleGit from "simple-git";
import dayjs from "dayjs";
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

class AutoCommit {
  constructor() {
    this.git = simpleGit();
    this.today = dayjs();
    this.logFile = "auto_commit.log";
  }

  getTodayDate() {
    return this.today.format("YYYY-MM-DD");
  }

  async fetchCommits(since, until) {
    const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/commits?since=${since}&until=${until}`;

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
    } catch (err) {
      this.log(`Error fetching commits: ${err.message}`);
      return [];
    }
  }

  async checkTodayCommits() {
    const [since, until] = [this.today.startOf('day').toISOString(), this.today.endOf('day').toISOString()];
    const commits = await this.fetchCommits(since, until);
    return commits.length > 0;
  }

  async commitAndPush() {
    try {
      await this.git.add(FILE_TO_UPDATE);
      await this.git.commit(COMMIT_MESSAGE);
      await this.git.push("origin", BRANCH);
      this.log(`Auto-commit pushed.`);
    } catch (err) {
      this.log(`Git push error: ${err.message}`);
    }
  }

  log(message) {
    const logEntry = `[${this.getTodayDate()}] ${message}\n`;
    appendFileSync(this.logFile, logEntry);
    console.log(logEntry.trim());
  }

  async run() {
    try {
      if (await this.checkTodayCommits()) {
        this.log("Commit already exists. No action needed.");
        return;
      }

      await evolve();
      await this.commitAndPush();
      this.log("Auto-commit successful.");
    } catch (error) {
      this.log(`Error during auto-commit: ${error.message}`);
    }
  }

  start() {
    scheduleJob("55 23 * * *", () => this.run());
  }
}

const autoCommit = new AutoCommit();
autoCommit.start();
