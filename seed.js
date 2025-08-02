
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

const git = simpleGit();

const getTodayDate = () => dayjs().format("YYYY-MM-DD");

const fetchCommits = async (since, until) => {
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
};

const checkTodayCommits = async () => {
  const today = getTodayDate();
  const since = `${today}T00:00:00`;
  const until = `${today}T23:59:59`;
  const commits = await fetchCommits(since, until);
  return commits.length > 0;
};

const commitAndPush = async () => {
  try {
    await git.add(FILE_TO_UPDATE);
    await git.commit(COMMIT_MESSAGE);
    await git.push("origin", BRANCH);
    console.log(`[${getTodayDate()}] Auto-commit pushed.`);
  } catch (err) {
    console.error("Git push error:", err);
  }
};

const logToFile = (message) => {
  const logEntry = `[${getTodayDate()}] ${message}\n`;
  appendFileSync("auto_commit.log", logEntry);
};

scheduleJob("55 23 * * *", async () => {
  const today = getTodayDate();
  const hasCommits = await checkTodayCommits();

  if (!hasCommits) {
    await evolve();
    await commitAndPush();
    logToFile("Auto-commit successful.");
  } else {
    console.log(`[${today}] Commit already exists. No action needed.`);
    logToFile("Commit already exists. No action needed.");
  }
});
