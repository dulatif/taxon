export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",     // New feature
        "fix",      // Bug fix
        "refactor", // Code refactoring (no feature change, no bug fix)
        "test",     // Adding or updating tests
        "style",    // Formatting, white-space, etc (no code logic change)
        "docs",     // Documentation changes
        "chore",    // Build process, tooling, dependency updates
        "perf",     // Performance improvement
        "ci",       // CI/CD changes
        "revert",   // Revert a previous commit
      ],
    ],
    "scope-enum": [
      1,
      "always",
      [
        "tooling",
        "theme",
        "arch",
        "types",
        "hooks",
        "components",
        "views",
        "modals",
        "services",
        "utils",
        "test",
        "app",
        "config",
      ],
    ],
    "subject-case": [2, "never", ["start-case", "pascal-case", "upper-case"]],
    "header-max-length": [2, "always", 72],
  },
};
