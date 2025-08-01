# 🧠 streak-saver

[![License](https://img.shields.io/github/license/Luhdo/streak-saver?style=flat-square)](LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/Luhdo/streak-saver?style=flat-square)](https://github.com/Luhdo/streak-saver/commits/main)
[![Issues](https://img.shields.io/github/issues/Luhdo/streak-saver?style=flat-square)](https://github.com/Luhdo/streak-saver/issues)
[![Stars](https://img.shields.io/github/stars/Luhdo/streak-saver?style=flat-square)](https://github.com/Luhdo/streak-saver/stargazers)

---

`streak-saver` is an automated GitHub activity bot that keeps your contribution graph alive **without spamming random commits**. Every day at **23:55**, it checks if you've committed to your configured repository. If not, it intelligently **evolves a file using an AI model** and commits the change.

Think of it as your intelligent code companion that ensures your green squares never stop while improving or evolving your code daily.

---

## ✨ Features

- ✅ Checks for commits daily
- 🧠 Uses AI (Gemini, Together, OpenRouter) to improve the code
- 🔁 Random prompt-based file evolution
- 🔒 Authenticated via environment variables
- 🕒 Runs automatically using `node-schedule`
- 💡 Works great with GitHub Actions or a private VPS

---

## 🛠️ Installation

### 1. Clone the repo

```bash
git clone https://github.com/Luhdo/streak-saver.git
cd streak-saver
````

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment variables

Create a `.env` file in the root directory:

```env
GITHUB_USERNAME=your-username
REPO_NAME=your-repo-name
GITHUB_TOKEN=your-personal-access-token

GEMINI_API_KEY=your-gemini-api-key
TOGETHER_API_KEY=your-together-api-key
OPENROUTER_API_KEY=your-openrouter-api-key
```

> 📌 Only the providers you want to use need to have an API key.

---

## ⚙️ Configuration

Edit the `config.ts` file to customize behavior:

```ts
export const GITHUB_USERNAME = process.env.GITHUB_USERNAME!;
export const REPO_NAME = process.env.REPO_NAME!;
export const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
export const FILE_TO_UPDATE = "file-to-auto-evolve.ts"; // the file you want to evolve
export const COMMIT_MESSAGE = "🤖 Auto-evolved code";
export const BRANCH = "main";
```

Make sure `FILE_TO_UPDATE` exists in your repo before running the bot.

---

## 🚀 Running the Bot

```bash
npm run start
```

This will:

1. Check for any commits today.
2. If none found, evolve the configured file using AI.
3. Commit and push the changes to your repo.

You can also run it in a loop using [PM2](https://pm2.keymetrics.io/), [cron job](https://crontab.guru/#55_23_*_*_*), or GitHub Actions.

---

## 🔧 How It Works

1. At `23:55` every day, the bot runs.
2. It checks for commits on the current day using GitHub’s REST API.
3. If no commit exists, it selects a **random prompt** (e.g., "Improve this code", "Add one more function").
4. It sends the current file content + prompt to the selected **AI model**.
5. Replaces the file content with the AI's improved version.
6. Commits and pushes the change.

### Example Prompts

* `Add meaningful comments`
* `Make it object-oriented`
* `Add JSDoc-style comments`
* `Convert to TypeScript`
* …and more!

---

## 💡 Ideas for Usage

* Keep GitHub contribution streak alive
* Automatically evolve creative JS experiments or utility scripts
* Use as a base for creative auto-coding experiments or code-gen games

---

## 📄 License

This project is licensed under the **Apache License 2.0**.
See [`LICENSE`](LICENSE) for details.

---

## 🧩 Credits

Built by [Ludho Mohammadpour](https://github.com/Luhdo)
Inspired by the idea of combining **AI-assisted coding** and **habit building**.

---

## 🌟 Support

If you like this project, give it a ⭐ on GitHub and share it with your friends!

