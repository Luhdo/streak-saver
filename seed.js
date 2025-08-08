
import { config as cg } from "dotenv";
// Load environment variables from .env file
cg();

import { scheduleJob } from "node-schedule";
// Import node-schedule for scheduling jobs
import simpleGit from "simple-git";
// Import simple-git for Git operations
import dayjs from "dayjs";
// Import dayjs for date and time manipulation
import { appendFileSync } from "node:fs";
// Import appendFileSync to write to a file
import evolve from "./utilities/evolve";
// Import the evolve function from the utilities folder
import {
  BRANCH,
  COMMIT_MESSAGE,
  FILE_TO_UPDATE,
  GITHUB_TOKEN,
  GITHUB_USERNAME,
  REPO_NAME,
} from "./config";
// Import configuration variables from the config file

class AutoCommit {
  constructor() {
    // Initialize the AutoCommit class
    this.git = simpleGit();
    // Initialize simple-git instance
    this.today = dayjs();
    // Get the current date using dayjs
    this.logFile = "auto_commit.log";
    // Define the log file name
  }

  getTodayDate() {
    // Method to format the current date
    return this.today.format("YYYY-MM-DD");
    // Return the formatted date
  }

  async fetchCommits(since, until) {
    // Method to fetch commits from the GitHub API
    const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/commits?since=${since}&until=${until}`;
    // Construct the GitHub API URL

    try {
      const response = await fetch(url, {
        // Fetch commits from the GitHub API
        headers: {
          // Set headers for the API request
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          // Set the authorization token
          "User-Agent": "commit-checker",
          // Set the user agent
        },
      });

      if (!response.ok) {
        // Check if the response is not okay
        const error = await response.text();
        // Get the error message from the response
        throw new Error(`GitHub API error: ${error}`);
        // Throw an error if the response is not ok
      }

      return await response.json();
      // Parse the response as JSON and return it
    } catch (err) {
      // Catch any errors during the API call
      this.log(`Error fetching commits: ${err.message}`);
      // Log the error message
      return [];
      // Return an empty array if there was an error
    }
  }

  async checkTodayCommits() {
    // Method to check if there are any commits today
    const [since, until] = [this.today.startOf('day').toISOString(), this.today.endOf('day').toISOString()];
    // Define the start and end times for today
    const commits = await this.fetchCommits(since, until);
    // Fetch commits for today
    return commits.length > 0;
    // Return true if there are any commits, false otherwise
  }

  async commitAndPush() {
    // Method to commit and push changes to the repository
    try {
      await this.git.add(FILE_TO_UPDATE);
      // Add the file to be committed
      await this.git.commit(COMMIT_MESSAGE);
      // Commit the changes with the specified message
      await this.git.push("origin", BRANCH);
      // Push the changes to the remote repository
      this.log(`Auto-commit pushed.`);
      // Log a message indicating the push was successful
    } catch (err) {
      // Catch any errors during the Git operations
      this.log(`Git push error: ${err.message}`);
      // Log the error message
    }
  }

  log(message) {
    // Method to log messages to the console and a log file
    const logEntry = `[${this.getTodayDate()}] ${message}\n`;
    // Create a log entry with the current date and message
    appendFileSync(this.logFile, logEntry);
    // Append the log entry to the log file
    console.log(logEntry.trim());
    // Log the entry to the console
  }

  async run() {
    // Method to run the auto-commit process
    try {
      if (await this.checkTodayCommits()) {
        // Check if commits already exist for today
        this.log("Commit already exists. No action needed.");
        // Log a message if commits already exist
        return;
        // Exit the function if commits already exist
      }

      await evolve();
      // Execute the evolve function
      await this.commitAndPush();
      // Commit and push the changes
      this.log("Auto-commit successful.");
      // Log a message indicating the auto-commit was successful
    } catch (error) {
      // Catch any errors during the auto-commit process
      this.log(`Error during auto-commit: ${error.message}`);
      // Log the error message
    }
  }

  start() {
    // Method to start the auto-commit process
    scheduleJob("55 23 * * *", () => this.run());
    // Schedule the run method to execute daily at 23:55
  }
}

const autoCommit = new AutoCommit();
// Create an instance of the AutoCommit class
autoCommit.start();
// Start the auto-commit process
