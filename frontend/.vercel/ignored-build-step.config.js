/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require("child_process");

module.exports = async () => {
  try {
    const changedFiles = execSync("git diff --name-only HEAD^ HEAD")
      .toString()
      .split("\n")
      .filter(Boolean);

    return changedFiles.every((file) => file.startsWith("backend/"));
  } catch (e) {
    // fallback nếu không lấy được diff, cứ build
    return false;
  }
};