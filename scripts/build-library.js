// Prepares the Library for publishing
import fs from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import deleteGeneratedFilesFrom from "./delete-generated-files.js";

console.log("Building all of the components/utilities in the `/src` folder...");
const colors = Object.freeze({ reset: "\x1b[0m", blue: "\x1b[34m", red: "\x1b[31m" });
const root = path.resolve(new URL(import.meta.url).pathname, "../../");
const sourceCodeDirectory = path.resolve(root, "src");

try {
  await deleteGeneratedFilesFrom(sourceCodeDirectory);

  // Generate `.d.ts` files
  await /** @type {Promise<void>} */ (
    new Promise((resolve, reject) => {
      exec("npx tsc", { cwd: sourceCodeDirectory }, (error) => (error ? reject(error) : resolve()));
    })
  );

  // Add the files that are needed for a successful `npm publish`. (See: https://docs.npmjs.com/cli/v11/commands/npm-publish)
  const publishFiles = /** @type {const} */ (["LICENSE"]);
  await Promise.all(publishFiles.map((f) => fs.copyFile(path.resolve(root, f), path.resolve(sourceCodeDirectory, f))));

  console.log(`${colors.blue}Build process was successful!${colors.reset}`);
} catch (error) {
  console.log(`${colors.red}Reverting the build process because the following error occurred:${colors.reset}`);
  console.error(error);
  await deleteGeneratedFilesFrom(sourceCodeDirectory);
}
