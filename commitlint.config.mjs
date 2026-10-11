/** @type {import('@commitlint/types').UserConfig} */
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
      ],
    ],
    "header-max-length": [2, "always", 100],
    // 한국어 설명을 허용하기 위해 대소문자 규칙은 끕니다.
    "subject-case": [0],
  },
};

export default config;
