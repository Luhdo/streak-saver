
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

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = () => dayjs().format("YYYY-MM-DD");

// Function to fetch commits from GitHub API
const fetchCommits = async (since, until) => {
  // Construct the GitHub API URL
  const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/commits?since=${since}&until=${until}`;

  try {
    // Make a GET request to the GitHub API
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`, // Include the GitHub token for authentication
        "User-Agent": "commit-checker", // Set a user-agent for the request
      },
    });

    // Check if the response was successful
    if (!response.ok) {
      // If not, throw an error with the response text
      const error = await response.text();
      throw new Error(`GitHub API error: ${error}`);
    }

    // Parse the response body as JSON and return the commits
    return await response.json();
  } catch (err) {
    // Log any errors to the console
    console.error(err.message);
    // Return an empty array if there was an error
    return [];
  }
};

// Function to check if there are any commits today
const checkTodayCommits = async () => {
  // Get today's date
  const today = getTodayDate();
  // Construct the since and until dates for the API request
  const since = `${today}T00:00:00`;
  const until = `${today}T23:59:59`;
  // Fetch the commits for today
  const commits = await fetchCommits(since, until);
  // Return true if there are any commits, false otherwise
  return commits.length > 0;
};

// Function to commit and push changes to the repository
const commitAndPush = async () => {
  try {
    // Add the specified file to the staging area
    await git.add(FILE_TO_UPDATE);
    // Commit the changes with the specified message
    await git.commit(COMMIT_MESSAGE);
    // Push the changes to the remote repository
    await git.push("origin", BRANCH);
    // Log a success message to the console
    console.log(`[${getTodayDate()}] Auto-commit pushed.`);
  } catch (err) {
    // Log any errors to the console
    console.error("Git push error:", err);
  }
};

// Function to log messages to a file
const logToFile = (message) => {
  // Create a log entry with the current date and the message
  const logEntry = `[${getTodayDate()}] ${message}\n`;
  // Append the log entry to the auto_commit.log file
  appendFileSync("auto_commit.log", logEntry);
};

// Schedule a job to run every day at 23:55
scheduleJob("55 23 * * *", async () => {
  // Get today's date
  const today = getTodayDate();
  // Check if there are any commits for today
  const hasCommits = await checkTodayCommits();

  // If there are no commits for today
  if (!hasCommits) {
    // Run the evolve function
    await evolve();
    // Commit and push the changes
    await commitAndPush();
    // Log a success message to the log file
    logToFile("Auto-commit successful.");
  } else {
    // If there are commits for today, log a message to the console
    console.log(`[${today}] Commit already exists. No action needed.`);
    // Log a message to the log file
    logToFile("Commit already exists. No action needed.");
  }
});
