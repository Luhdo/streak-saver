import messageAI from "./messageAI";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "node:path";
import { FILE_TO_UPDATE } from "../config";

const PROMPTS = [
  "Improve this code",
  "Add meaningful comments",
  "Add one more function",
  "Refactor this to be more efficient",
  "Add JSDoc-style comments",
  "Introduce error handling",
  "Convert it to TypeScript",
  "Use ES6+ features",
  "Make it object-oriented",
  "Add a test case",
];

const TARGET_FILE = resolve(process.cwd(), FILE_TO_UPDATE);

function getRandomPrompt(): string {
  return PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
}

export default async function evolveFile() {
  const originalCode = readFileSync(TARGET_FILE, "utf8");
  const prompt = getRandomPrompt();

  console.log(`🧠 Prompt: ${prompt}`);

  const result = await messageAI("gemini-2.0-flash-lite", [
    {
      role: "system",
      content:
        "You are a helpful AI that edits JavaScript files. Only respond with the modified code without any explanations. with ```js and ``` tags.",
    },
    { role: "user", content: `${prompt}:\n\n${originalCode}` },
  ]);

  writeFileSync(TARGET_FILE, result.slice(5, -3)); // Remove ```js and ``` tags
  console.log(`✅ Evolved ${TARGET_FILE}`);
}
