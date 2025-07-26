
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

const checkTodayCommits = async () => {
  const since = `${getTodayDate()}T00:00:00`;
  const until = `${getTodayDate()}T23:59:59`;
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

    const commits = await response.json();
    return commits.length > 0;
  } catch (err) {
    console.error(err.message);
    return false;
  }
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

scheduleJob("55 23 * * *", async () => {
  const hasCommits = await checkTodayCommits();
  if (!hasCommits) {
    await evolve();
    await commitAndPush();
  } else {
    console.log(`[${getTodayDate()}] Commit already exists. No action needed.`);
  }
});
