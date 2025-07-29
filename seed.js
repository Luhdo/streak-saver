
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

/**
 * @type {simpleGit.SimpleGit}
 */
const git = simpleGit();

/**
 * Gets the current date in YYYY-MM-DD format.
 * @returns {string} The current date.
 */
const getTodayDate = () => dayjs().format("YYYY-MM-DD");

/**
 * Fetches commits from the GitHub API within a specified date range.
 * @param {string} since - The start date and time for the commit search (ISO 8601 format).
 * @param {string} until - The end date and time for the commit search (ISO 8601 format).
 * @returns {Promise<Array<object>>} An array of commit objects.  Returns an empty array if there's an error.
 */
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

/**
 * Checks if there are any commits on GitHub for the current date.
 * @returns {Promise<boolean>} True if commits exist for today, false otherwise.
 */
const checkTodayCommits = async () => {
  const since = `${getTodayDate()}T00:00:00`;
  const until = `${getTodayDate()}T23:59:59`;
  const commits = await fetchCommits(since, until);
  return commits.length > 0;
};

/**
 * Commits and pushes changes to the Git repository.
 * @async
 * @function commitAndPush
 * @throws {Error} If there's an error during the git operations.
 */
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

/**
 * Schedules a job to check for commits and automatically commit changes if none exist for the current day.
 * Runs at 23:55 every day.
 */
scheduleJob("55 23 * * *", async () => {
  const hasCommits = await checkTodayCommits();
  const today = getTodayDate();

  if (!hasCommits) {
    await evolve();
    await commitAndPush();
  } else {
    console.log(`[${today}] Commit already exists. No action needed.`);
  }
});
