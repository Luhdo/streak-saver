
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

// Initialize simple-git
const git = simpleGit();

// Helper function to get the current date in YYYY-MM-DD format
const getTodayDate = () => dayjs().format("YYYY-MM-DD");

// Schedule the job to run at 23:55 every day
scheduleJob("55 23 * * *", async () => {
  // Check if commits for today already exist
  const hasCommits = await checkTodayCommits();
  if (!hasCommits) {
    // If no commits exist, run evolve and commit the changes
    await evolve();
    await commitAndPush();
  } else {
    // Log a message if commits already exist
    console.log(`[${getTodayDate()}] Commit already exists. No action needed.`);
  }
});

// Function to check for commits on GitHub for the current day
async function checkTodayCommits() {
  // Define the time range for the commit check
  const since = `${getTodayDate()}T00:00:00`;
  const until = `${getTodayDate()}T23:59:59`;

  // Construct the GitHub API URL
  const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/commits?since=${since}&until=${until}`;

  try {
    // Make a request to the GitHub API
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "User-Agent": "commit-checker",
      },
    });

    // Handle errors from the API
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    // Parse the response as JSON
    const commits = await response.json();
    // Return true if commits exist, false otherwise
    return commits.length > 0;
  } catch (err) {
    // Log any errors during the API request
    console.error("GitHub API error:", err);
    return false;
  }
}

// Function to update the file with a message indicating no commits
function _updateFile() {
  const message = `No commits on ${getTodayDate()}\n`;
  appendFileSync(FILE_TO_UPDATE, message);
}

// Function to commit and push changes to the repository
async function commitAndPush() {
  try {
    // Add the updated file
    await git.add(FILE_TO_UPDATE);
    // Commit the changes with the specified message
    await git.commit(COMMIT_MESSAGE);
    // Push the changes to the remote repository
    await git.push("origin", BRANCH);
    // Log a success message
    console.log(`[${getTodayDate()}] Auto-commit pushed.`);
  } catch (err) {
    // Log any errors during the commit or push process
    console.error("Git push error:", err);
  }
}
