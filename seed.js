
import { config as cg } from "dotenv";
// Load environment variables from .env file
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
      console.error(err.message);
      return [];
    }
  }

  async checkTodayCommits() {
    const today = this.getTodayDate();
    const since = `${today}T00:00:00`;
    const until = `${today}T23:59:59`;
    const commits = await this.fetchCommits(since, until);
    return commits.length > 0;
  }

  async commitAndPush() {
    try {
      await this.git.add(FILE_TO_UPDATE);
      await this.git.commit(COMMIT_MESSAGE);
      await this.git.push("origin", BRANCH);
      console.log(`[${this.getTodayDate()}] Auto-commit pushed.`);
    } catch (err) {
      console.error("Git push error:", err);
    }
  }

  logToFile(message) {
    const logEntry = `[${this.getTodayDate()}] ${message}\n`;
    appendFileSync("auto_commit.log", logEntry);
  }

  async run() {
    const today = this.getTodayDate();
    const hasCommits = await this.checkTodayCommits();

    if (!hasCommits) {
      await evolve();
      await this.commitAndPush();
      this.logToFile("Auto-commit successful.");
    } else {
      console.log(`[${today}] Commit already exists. No action needed.`);
      this.logToFile("Commit already exists. No action needed.");
    }
  }

  start() {
    scheduleJob("55 23 * * *", async () => {
      await this.run();
    });
  }
}

const autoCommit = new AutoCommit();
autoCommit.start();
