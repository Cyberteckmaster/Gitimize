import { RepoFacts } from "./ingest";
import { z } from "zod";

export const CheckResultSchema = z.object({
  id: z.string(),
  category: z.enum(["docs", "code-quality", "security", "devops", "community"]),
  name: z.string(),
  description: z.string(),
  weight: z.number(),
  passed: z.boolean(),
  score: z.number(),
  maxScore: z.number(),
  details: z.string().optional(),
  fix: z.object({
    title: z.string(),
    description: z.string(),
    code: z.string().optional(),
    files: z.array(z.string()).optional(),
    effort: z.enum(["trivial", "easy", "moderate", "hard"]),
    impact: z.enum(["low", "medium", "high", "critical"]),
  }).optional(),
});

export type CheckResult = z.infer<typeof CheckResultSchema>;

export const AuditResultSchema = z.object({
  score: z.number(),
  grade: z.enum(["S", "A", "B", "C", "D", "F"]),
  checks: z.array(CheckResultSchema),
  summary: z.object({
    docs: z.number(),
    codeQuality: z.number(),
    security: z.number(),
    devops: z.number(),
    community: z.number(),
  }),
  totalChecks: z.number(),
  passedChecks: z.number(),
  failedChecks: z.number(),
  fixes: z.array(z.object({
    checkId: z.string(),
    title: z.string(),
    description: z.string(),
    code: z.string().optional(),
    files: z.array(z.string()).optional(),
    effort: z.enum(["trivial", "easy", "moderate", "hard"]),
    impact: z.enum(["low", "medium", "high", "critical"]),
    priority: z.number(),
  })),
  strictness: z.enum(["lenient", "balanced", "strict"]),
  source: z.enum(["live", "snapshot"]),
  auditedAt: z.string(),
});

export type AuditResult = z.infer<typeof AuditResultSchema>;

const CATEGORY_WEIGHTS = {
  docs: 25,
  "code-quality": 25,
  security: 20,
  devops: 15,
  community: 15,
} as const;

const CHECKS: Array<{
  id: string;
  category: "docs" | "code-quality" | "security" | "devops" | "community";
  name: string;
  description: string;
  weight: number;
  check: (facts: RepoFacts, strictness: "lenient" | "balanced" | "strict") => { passed: boolean; score: number; maxScore: number; details?: string; fix?: CheckResult["fix"] };
}> = [
  // DOCS (25 points, 10 checks = 2.5 each)
  {
    id: "docs-readme-exists",
    category: "docs",
    name: "README exists",
    description: "Repository has a README file",
    weight: 2.5,
    check: (facts) => {
      const passed = !!facts.readme && facts.readme.length > 100;
      return {
        passed,
        score: passed ? 2.5 : 0,
        maxScore: 2.5,
        details: passed ? `README found (${facts.readme?.length || 0} chars)` : "No README or too short",
        fix: !passed ? {
          title: "Create README.md",
          description: "Add a comprehensive README with project description, installation, usage, and contribution guidelines",
          code: `# ${facts.repo}\n\n${facts.description || "A great project"}\n\n## Installation\n\n\`\`\`bash\nnpm install\n\`\`\`\n\n## Usage\n\n\`\`\`bash\nnpm start\n\`\`\`\n\n## Contributing\n\nSee [CONTRIBUTING.md](CONTRIBUTING.md)\n\n## License\n\n${facts.license || "MIT"}`,
          files: ["README.md"],
          effort: "trivial",
          impact: "high",
        } : undefined,
      };
    },
  },
  {
    id: "docs-readme-quality",
    category: "docs",
    name: "README quality",
    description: "README has proper structure with badges, installation, usage, API docs",
    weight: 2.5,
    check: (facts) => {
      if (!facts.readme) return { passed: false, score: 0, maxScore: 2.5, details: "No README" };
      const readme = facts.readme.toLowerCase();
      const sections = [
        /##\s*(install|setup|getting started)/i,
        /##\s*(usage|example|quick start)/i,
        /##\s*(api|reference|documentation)/i,
        /##\s*(contribut|develop)/i,
        /##\s*(license|legal)/i,
        /\[!\[.*\]\(https:\/\/img\.shields\.io/,
      ];
      const found = sections.filter(r => r.test(facts.readme!)).length;
      const passed = found >= 4;
      return {
        passed,
        score: passed ? 2.5 : (found / 6) * 2.5,
        maxScore: 2.5,
        details: `${found}/6 key sections present`,
        fix: !passed ? {
          title: "Improve README structure",
          description: "Add missing sections: installation, usage, API docs, contributing, license, and badges",
          effort: "easy",
          impact: "high",
        } : undefined,
      };
    },
  },
  {
    id: "docs-license",
    category: "docs",
    name: "License file",
    description: "Repository has a LICENSE file",
    weight: 2.5,
    check: (facts) => {
      const passed = !!facts.license;
      return {
        passed,
        score: passed ? 2.5 : 0,
        maxScore: 2.5,
        details: passed ? `License: ${facts.license}` : "No license detected",
        fix: !passed ? {
          title: "Add LICENSE file",
          description: "Choose and add an open source license (MIT, Apache-2.0, GPL-3.0, etc.)",
          code: "MIT License\n\nCopyright (c) 2024\n\nPermission is hereby granted...",
          files: ["LICENSE"],
          effort: "trivial",
          impact: "high",
        } : undefined,
      };
    },
  },
  {
    id: "docs-contributing",
    category: "docs",
    name: "Contributing guidelines",
    description: "Repository has CONTRIBUTING.md",
    weight: 2.5,
    check: (facts) => {
      const passed = !!facts.contributing && facts.contributing.length > 200;
      return {
        passed,
        score: passed ? 2.5 : 0,
        maxScore: 2.5,
        details: passed ? "CONTRIBUTING.md found" : "Missing or minimal CONTRIBUTING.md",
        fix: !passed ? {
          title: "Create CONTRIBUTING.md",
          description: "Add contribution guidelines with code of conduct, PR process, and development setup",
          code: `# Contributing\n\nThank you for contributing!\n\n## Code of Conduct\n\nSee [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)\n\n## How to Contribute\n\n1. Fork the repo\n2. Create a feature branch\n3. Make your changes\n4. Run tests and linting\n5. Submit a PR\n\n## Development Setup\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\``,
          files: ["CONTRIBUTING.md"],
          effort: "easy",
          impact: "medium",
        } : undefined,
      };
    },
  },
  {
    id: "docs-changelog",
    category: "docs",
    name: "Changelog",
    description: "Repository has a CHANGELOG or release notes",
    weight: 2.5,
    check: (facts) => {
      const passed = !!facts.changelog || (facts.releases.length > 0 && facts.releases.some(r => r.body));
      return {
        passed,
        score: passed ? 2.5 : 0,
        maxScore: 2.5,
        details: passed ? "Changelog or detailed releases found" : "No changelog",
        fix: !passed ? {
          title: "Create CHANGELOG.md",
          description: "Add a changelog following Keep a Changelog format",
          code: `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n## [Unreleased]\n\n### Added\n- New feature X\n\n### Fixed\n- Bug Y\n\n## [1.0.0] - 2024-01-01\n\n### Added\n- Initial release`,
          files: ["CHANGELOG.md"],
          effort: "easy",
          impact: "medium",
        } : undefined,
      };
    },
  },
  {
    id: "docs-code-of-conduct",
    category: "docs",
    name: "Code of Conduct",
    description: "Repository has a CODE_OF_CONDUCT.md",
    weight: 2.5,
    check: (facts) => {
      const readme = facts.readme?.toLowerCase() || "";
      const passed = readme.includes("code of conduct") || readme.includes("code_of_conduct");
      return {
        passed,
        score: passed ? 2.5 : 0,
        maxScore: 2.5,
        details: passed ? "Code of Conduct referenced" : "No Code of Conduct",
        fix: !passed ? {
          title: "Add Code of Conduct",
          description: "Adopt Contributor Covenant or similar",
          code: `# Contributor Covenant Code of Conduct\n\n## Our Pledge\n\nWe as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone...`,
          files: ["CODE_OF_CONDUCT.md"],
          effort: "trivial",
          impact: "medium",
        } : undefined,
      };
    },
  },
  {
    id: "docs-issue-templates",
    category: "docs",
    name: "Issue templates",
    description: "Repository has issue templates for bugs, features, questions",
    weight: 2.5,
    check: (facts) => {
      const passed = facts.issueTemplates.length >= 2;
      return {
        passed,
        score: passed ? 2.5 : (facts.issueTemplates.length / 2) * 2.5,
        maxScore: 2.5,
        details: `${facts.issueTemplates.length} issue templates`,
        fix: !passed ? {
          title: "Add issue templates",
          description: "Create bug report, feature request, and question templates",
          code: `--- 
name: Bug Report
about: Report a bug
labels: bug
---
**Describe the bug**
A clear description of the bug.

**To Reproduce**
Steps to reproduce.

**Expected behavior**
What you expected.`,
          files: [".github/ISSUE_TEMPLATE/bug_report.md", ".github/ISSUE_TEMPLATE/feature_request.md"],
          effort: "easy",
          impact: "medium",
        } : undefined,
      };
    },
  },
  {
    id: "docs-pr-template",
    category: "docs",
    name: "PR template",
    description: "Repository has a pull request template",
    weight: 2.5,
    check: (facts) => {
      const passed = !!facts.prTemplate && facts.prTemplate.length > 100;
      return {
        passed,
        score: passed ? 2.5 : 0,
        maxScore: 2.5,
        details: passed ? "PR template found" : "No PR template",
        fix: !passed ? {
          title: "Add PR template",
          description: "Create a pull request template with checklist",
          code: `## Description\n\n## Changes\n\n## Checklist\n- [ ] Tests pass\n- [ ] Linting passes\n- [ ] Documentation updated\n- [ ] Changelog updated`,
          files: [".github/PULL_REQUEST_TEMPLATE.md"],
          effort: "trivial",
          impact: "medium",
        } : undefined,
      };
    },
  },
  {
    id: "docs-security-policy",
    category: "docs",
    name: "Security policy",
    description: "Repository has a SECURITY.md with vulnerability reporting",
    weight: 2.5,
    check: (facts) => {
      const passed = !!facts.securityPolicy && facts.securityPolicy.includes("report");
      return {
        passed,
        score: passed ? 2.5 : 0,
        maxScore: 2.5,
        details: passed ? "Security policy found" : "No security policy",
        fix: !passed ? {
          title: "Add SECURITY.md",
          description: "Document supported versions and vulnerability reporting process",
          code: `# Security Policy\n\n## Supported Versions\n\n| Version | Supported |\n| ------- | --------- |\n| 1.x.x   | ✅        |\n\n## Reporting a Vulnerability\n\nEmail security@example.com`,
          files: ["SECURITY.md"],
          effort: "trivial",
          impact: "high",
        } : undefined,
      };
    },
  },
  {
    id: "docs-api-docs",
    category: "docs",
    name: "API documentation",
    description: "Project has API documentation (TypeDoc, JSDoc, OpenAPI, etc.)",
    weight: 2.5,
    check: (facts) => {
      const pkg = facts.packageJson;
      const hasTypedoc = pkg?.devDependencies?.typedoc || pkg?.scripts?.["doc:api"];
      const hasOpenAPI = facts.githubActions.some(w => w.content.includes("openapi") || w.content.includes("swagger"));
      const passed = !!hasTypedoc || hasOpenAPI;
      return {
        passed,
        score: passed ? 2.5 : 0,
        maxScore: 2.5,
        details: passed ? "API docs configured" : "No API documentation",
        fix: !passed ? {
          title: "Add API documentation",
          description: "Set up TypeDoc for TypeScript or OpenAPI/Swagger for REST APIs",
          code: `npm install --save-dev typedoc\n\n# package.json\n"scripts": {\n  "doc:api": "typedoc --out docs/api src"\n}`,
          files: ["typedoc.json", "package.json"],
          effort: "easy",
          impact: "medium",
        } : undefined,
      };
    },
  },

  // CODE QUALITY (25 points, 10 checks = 2.5 each)
  {
    id: "code-typescript",
    category: "code-quality",
    name: "TypeScript configured",
    description: "Project uses TypeScript with strict mode",
    weight: 2.5,
    check: (facts) => {
      const tsconfig = facts.tsconfig;
      const strict = tsconfig?.compilerOptions?.strict === true;
      const passed = !!tsconfig && strict;
      return {
        passed,
        score: passed ? 2.5 : (!!tsconfig ? 1.5 : 0),
        maxScore: 2.5,
        details: passed ? "TypeScript strict mode enabled" : !!tsconfig ? "TypeScript but not strict" : "No TypeScript",
        fix: !passed ? {
          title: "Enable TypeScript strict mode",
          description: "Add strict: true to tsconfig.json compilerOptions",
          code: `{\n  "compilerOptions": {\n    "strict": true,\n    "noImplicitAny": true,\n    "strictNullChecks": true,\n    "strictFunctionTypes": true\n  }\n}`,
          files: ["tsconfig.json"],
          effort: "easy",
          impact: "high",
        } : undefined,
      };
    },
  },
  {
    id: "code-linting",
    category: "code-quality",
    name: "ESLint configured",
    description: "Project has ESLint with recommended rules",
    weight: 2.5,
    check: (facts) => {
      const passed = !!facts.eslintConfig;
      return {
        passed,
        score: passed ? 2.5 : 0,
        maxScore: 2.5,
        details: passed ? "ESLint configured" : "No ESLint config",
        fix: !passed ? {
          title: "Add ESLint",
          description: "Configure ESLint with recommended rules for your framework",
          code: `npm install --save-dev eslint @eslint/js typescript-eslint\n\n# eslint.config.js\nexport default [\n  ...require('@eslint/js').configs.recommended,\n  ...require('typescript-eslint').configs.recommended,\n]`,
          files: ["eslint.config.js", "package.json"],
          effort: "easy",
          impact: "high",
        } : undefined,
      };
    },
  },
  {
    id: "code-formatting",
    category: "code-quality",
    name: "Prettier configured",
    description: "Project has Prettier for code formatting",
    weight: 2.5,
    check: (facts) => {
      const passed = !!facts.prettierrc;
      return {
        passed,
        score: passed ? 2.5 : 0,
        maxScore: 2.5,
        details: passed ? "Prettier configured" : "No Prettier config",
        fix: !passed ? {
          title: "Add Prettier",
          description: "Configure Prettier for consistent formatting",
          code: `npm install --save-dev prettier\n\n# .prettierrc\n{\n  "semi": true,\n  "singleQuote": true,\n  "tabWidth": 2,\n  "trailingComma": "es5"\n}`,
          files: [".prettierrc", "package.json"],
          effort: "trivial",
          impact: "medium",
        } : undefined,
      };
    },
  },
  {
    id: "code-tests",
    category: "code-quality",
    name: "Tests configured",
    description: "Project has test framework configured (Jest, Vitest, etc.)",
    weight: 2.5,
    check: (facts) => {
      const pkg = facts.packageJson;
      const hasTest = pkg?.scripts?.test || pkg?.devDependencies?.jest || pkg?.devDependencies?.vitest || pkg?.devDependencies?.mocha;
      const passed = !!hasTest;
      return {
        passed,
        score: passed ? 2.5 : 0,
        maxScore: 2.5,
        details: passed ? "Test framework configured" : "No test framework",
        fix: !passed ? {
          title: "Add test framework",
          description: "Set up Vitest (recommended) or Jest for testing",
          code: `npm install --save-dev vitest @vitest/ui\n\n# package.json\n"scripts": {\n  "test": "vitest run",\n  "test:ui": "vitest --ui"\n}\n\n# vitest.config.ts\nimport { defineConfig } from 'vitest/config'\nexport default defineConfig({ test: { environment: 'jsdom' } })`,
          files: ["vitest.config.ts", "package.json"],
          effort: "easy",
          impact: "high",
        } : undefined,
      };
    },
  },
  {
    id: "code-test-coverage",
    category: "code-quality",
    name: "Test coverage",
    description: "Project tracks test coverage",
    weight: 2.5,
    check: (facts) => {
      const pkg = facts.packageJson;
      const hasCoverage = pkg?.scripts?.coverage || pkg?.scripts?.["test:coverage"] || pkg?.devDependencies?.["@vitest/coverage-v8"] || pkg?.devDependencies?.["jest-coverage"];
      const passed = !!hasCoverage;
      return {
        passed,
        score: passed ? 2.5 : 0,
        maxScore: 2.5,
        details: passed ? "Coverage configured" : "No coverage tracking",
        fix: !passed ? {
          title: "Add test coverage",
          description: "Enable coverage reporting with Vitest or Jest",
          code: `npm install --save-dev @vitest/coverage-v8\n\n# vitest.config.ts\nexport default defineConfig({ test: { coverage: { provider: 'v8' } } })\n\n# package.json\n"scripts": { "test:coverage": "vitest run --coverage" }`,
          files: ["vitest.config.ts", "package.json"],
          effort: "easy",
          impact: "medium",
        } : undefined,
      };
    },
  },
  {
    id: "code-ci",
    category: "code-quality",
    name: "CI pipeline",
    description: "Repository has CI workflow (GitHub Actions, etc.)",
    weight: 2.5,
    check: (facts) => {
      const passed = facts.githubActions.length > 0;
      return {
        passed,
        score: passed ? 2.5 : 0,
        maxScore: 2.5,
        details: `${facts.githubActions.length} workflow(s) found`,
        fix: !passed ? {
          title: "Add CI workflow",
          description: "Create GitHub Actions workflow for lint, test, and build",
          code: `# .github/workflows/ci.yml\nname: CI\non: [push, pull_request]\njobs:\n  ci:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: oven-sh/setup-bun@v1\n      - run: bun install\n      - run: bun run lint\n      - run: bun run test\n      - run: bun run build`,
          files: [".github/workflows/ci.yml"],
          effort: "easy",
          impact: "high",
        } : undefined,
      };
    },
  },
  {
    id: "code-ci-lint-test",
    category: "code-quality",
    name: "CI runs lint & test",
    description: "CI pipeline runs linting and tests",
    weight: 2.5,
    check: (facts) => {
      const hasLint = facts.githubActions.some(w => w.content.includes("lint") || w.content.includes("eslint"));
      const hasTest = facts.githubActions.some(w => w.content.includes("test") || w.content.includes("vitest") || w.content.includes("jest"));
      const passed = hasLint && hasTest;
      return {
        passed,
        score: passed ? 2.5 : (hasLint || hasTest ? 1.25 : 0),
        maxScore: 2.5,
        details: `CI: lint=${hasLint}, test=${hasTest}`,
        fix: !passed ? {
          title: "Add lint and test to CI",
          description: "Ensure CI runs both linting and tests on every PR",
          effort: "easy",
          impact: "high",
        } : undefined,
      };
    },
  },
  {
    id: "code-husky",
    category: "code-quality",
    name: "Git hooks (Husky)",
    description: "Project uses Husky for pre-commit hooks",
    weight: 2.5,
    check: (facts) => {
      const passed = !!facts.husky || (facts.packageJson?.husky && Object.keys(facts.packageJson.husky).length > 0);
      return {
        passed,
        score: passed ? 2.5 : 0,
        maxScore: 2.5,
        details: passed ? "Husky configured" : "No git hooks",
        fix: !passed ? {
          title: "Add Husky pre-commit hooks",
          description: "Set up Husky to run lint-staged on commit",
          code: `npm install --save-dev husky lint-staged\n\n# package.json\n"husky": {\n  "hooks": {\n    "pre-commit": "lint-staged"\n  }\n},\n"lint-staged": {\n  "*.{js,ts,jsx,tsx}": ["eslint --fix", "prettier --write"]\n}`,
          files: ["package.json", ".husky/pre-commit"],
          effort: "easy",
          impact: "medium",
        } : undefined,
      };
    },
  },
  {
    id: "code-commitlint",
    category: "code-quality",
    name: "Commit message convention",
    description: "Project enforces conventional commits with commitlint",
    weight: 2.5,
    check: (facts) => {
      const passed = !!facts.commitlint;
      return {
        passed,
        score: passed ? 2.5 : 0,
        maxScore: 2.5,
        details: passed ? "commitlint configured" : "No commit linting",
        fix: !passed ? {
          title: "Add commitlint",
          description: "Enforce conventional commit messages",
          code: `npm install --save-dev @commitlint/cli @commitlint/config-conventional\n\n# commitlint.config.js\nexport default { extends: ['@commitlint/config-conventional'] }\n\n# .husky/commit-msg\nnpx --no-install commitlint --edit $1`,
          files: ["commitlint.config.js", ".husky/commit-msg"],
          effort: "easy",
          impact: "medium",
        } : undefined,
      };
    },
  },
  {
    id: "code-dependency-updates",
    category: "code-quality",
    name: "Automated dependency updates",
    description: "Repository uses Dependabot or Renovate for dependency updates",
    weight: 2.5,
    check: (facts) => {
      const passed = !!facts.dependabotConfig || !!facts.renovate;
      return {
        passed,
        score: passed ? 2.5 : 0,
        maxScore: 2.5,
        details: passed ? "Auto dependency updates configured" : "No automated dependency updates",
        fix: !passed ? {
          title: "Add Dependabot or Renovate",
          description: "Configure automated dependency updates with PRs",
          code: `# .github/dependabot.yml\nversion: 2\nupdates:\n  - package-ecosystem: "npm"\n    directory: "/"\n    schedule:\n      interval: "weekly"\n    open-pull-requests-limit: 10`,
          files: [".github/dependabot.yml"],
          effort: "trivial",
          impact: "high",
        } : undefined,
      };
    },
  },

  // SECURITY (20 points, 10 checks = 2 each)
  {
    id: "sec-branch-protection",
    category: "security",
    name: "Branch protection",
    description: "Main branch has protection rules (required reviews, status checks)",
    weight: 2,
    check: (facts) => {
      const bp = facts.branchProtection;
      const hasProtection = bp && (bp.required_status_checks?.strict || bp.required_pull_request_reviews?.required_approving_reviews >= 1);
      const passed = !!hasProtection;
      return {
        passed,
        score: passed ? 2 : 0,
        maxScore: 2,
        details: passed ? "Branch protection enabled" : "No branch protection",
        fix: !passed ? {
          title: "Enable branch protection",
          description: "Require PR reviews and status checks before merging to main",
          effort: "easy",
          impact: "critical",
        } : undefined,
      };
    },
  },
  {
    id: "sec-rulesets",
    category: "security",
    name: "Repository rulesets",
    description: "Repository uses rulesets for additional protection",
    weight: 2,
    check: (facts) => {
      const passed = facts.repoRules && facts.repoRules.length > 0;
      return {
        passed,
        score: passed ? 2 : 0,
        maxScore: 2,
        details: `${facts.repoRules?.length || 0} rulesets`,
        fix: !passed ? {
          title: "Add repository rulesets",
          description: "Configure rulesets for branch naming, commit signing, etc.",
          effort: "easy",
          impact: "high",
        } : undefined,
      };
    },
  },
  {
    id: "sec-dependabot-alerts",
    category: "security",
    name: "Dependabot alerts",
    description: "Dependabot security alerts are enabled",
    weight: 2,
    check: (facts) => {
      const passed = facts.dependabotConfig !== null;
      return {
        passed,
        score: passed ? 2 : 0,
        maxScore: 2,
        details: passed ? "Dependabot configured" : "No Dependabot security alerts",
        fix: !passed ? {
          title: "Enable Dependabot alerts",
          description: "Turn on Dependabot security alerts in repository settings",
          effort: "trivial",
          impact: "critical",
        } : undefined,
      };
    },
  },
  {
    id: "sec-secret-scanning",
    category: "security",
    name: "Secret scanning",
    description: "GitHub secret scanning is enabled",
    weight: 2,
    check: (facts) => {
      return {
        passed: false,
        score: 0,
        maxScore: 2,
        details: "Cannot verify via API - enable in repo settings",
        fix: {
          title: "Enable secret scanning",
          description: "Turn on secret scanning and push protection in repository settings",
          effort: "trivial",
          impact: "critical",
        },
      };
    },
  },
  {
    id: "sec-signed-commits",
    category: "security",
    name: "Signed commits required",
    description: "Repository requires signed commits",
    weight: 2,
    check: (facts) => {
      const bp = facts.branchProtection;
      const passed = bp?.required_signatures === true;
      return {
        passed,
        score: passed ? 2 : 0,
        maxScore: 2,
        details: passed ? "Signed commits required" : "Signed commits not required",
        fix: !passed ? {
          title: "Require signed commits",
          description: "Enable 'Require signed commits' in branch protection rules",
          effort: "easy",
          impact: "high",
        } : undefined,
      };
    },
  },
  {
    id: "sec-workflow-permissions",
    category: "security",
    name: "Workflow permissions",
    description: "GitHub Actions workflows use minimal permissions",
    weight: 2,
    check: (facts) => {
      const hasMinimal = facts.githubActions.some(w => w.content.includes("permissions:") && w.content.includes("read"));
      return {
        passed: hasMinimal,
        score: hasMinimal ? 2 : 0,
        maxScore: 2,
        details: hasMinimal ? "Minimal permissions found" : "Workflows may have excessive permissions",
        fix: !hasMinimal ? {
          title: "Restrict workflow permissions",
          description: "Add explicit minimal permissions to all workflows",
          code: `permissions:\n  contents: read\n  pull-requests: read\n  # Add only what's needed`,
          files: [".github/workflows/*.yml"],
          effort: "easy",
          impact: "high",
        } : undefined,
      };
    },
  },
  {
    id: "sec-pinned-actions",
    category: "security",
    name: "Pinned GitHub Actions",
    description: "Workflows pin actions to specific SHA hashes",
    weight: 2,
    check: (facts) => {
      const allPinned = facts.githubActions.every(w => 
        w.content.includes("@") && !w.content.includes("@v") && w.content.match(/@[a-f0-9]{40}/)
      );
      const somePinned = facts.githubActions.some(w => w.content.match(/@[a-f0-9]{40}/));
      return {
        passed: allPinned && facts.githubActions.length > 0,
        score: allPinned ? 2 : (somePinned ? 1 : 0),
        maxScore: 2,
        details: allPinned ? "All actions pinned to SHA" : somePinned ? "Some actions pinned" : "No actions pinned",
        fix: !allPinned ? {
          title: "Pin actions to SHA",
          description: "Replace version tags with full commit SHAs for all GitHub Actions",
          effort: "moderate",
          impact: "high",
        } : undefined,
      };
    },
  },
  {
    id: "sec-env-example",
    category: "security",
    name: "Environment example",
    description: "Repository has .env.example without secrets",
    weight: 2,
    check: (facts) => {
      const passed = !!facts.envExample && !facts.envExample.includes("=") || facts.envExample.split("\n").every(l => !l.includes("SECRET") && !l.includes("KEY") && !l.includes("TOKEN") && !l.includes("PASSWORD"));
      return {
        passed,
        score: passed ? 2 : 0,
        maxScore: 2,
        details: passed ? ".env.example exists without secrets" : "Missing or unsafe .env.example",
        fix: !passed ? {
          title: "Create safe .env.example",
          description: "Add .env.example with placeholder values only",
          code: `# Database\nDATABASE_URL="postgresql://user:pass@localhost:5432/db"\n\n# Auth\nNEXTAUTH_SECRET="your-secret-here"\n\n# APIs\nOPENAI_API_KEY="sk-..."\nGITHUB_TOKEN="ghp_..."`,
          files: [".env.example"],
          effort: "trivial",
          impact: "high",
        } : undefined,
      };
    },
  },
  {
    id: "sec-gitignore",
    category: "security",
    name: "Proper .gitignore",
    description: "Repository has .gitignore that excludes secrets, node_modules, build artifacts",
    weight: 2,
    check: (facts) => {
      if (!facts.gitignore) return { passed: false, score: 0, maxScore: 2, details: "No .gitignore" };
      const required = ["node_modules", ".env", "*.log", "dist", "build", ".DS_Store", "coverage", ".vercel", ".next"];
      const found = required.filter(p => facts.gitignore!.includes(p)).length;
      const passed = found >= 7;
      return {
        passed,
        score: passed ? 2 : (found / required.length) * 2,
        maxScore: 2,
        details: `${found}/${required.length} essential patterns`,
        fix: !passed ? {
          title: "Improve .gitignore",
          description: "Add patterns for node_modules, env files, logs, build outputs",
          code: `node_modules\n.env\n.env.local\n.env.*.local\n*.log\ndist\nbuild\n.next\n.vercel\ncoverage\n.DS_Store\n*.pem\n.idea\n.vscode`,
          files: [".gitignore"],
          effort: "trivial",
          impact: "high",
        } : undefined,
      };
    },
  },
  {
    id: "sec-codeowners",
    category: "security",
    name: "CODEOWNERS file",
    description: "Repository has CODEOWNERS for required reviews",
    weight: 2,
    check: (facts) => {
      const passed = !!facts.codeowners;
      return {
        passed,
        score: passed ? 2 : 0,
        maxScore: 2,
        details: passed ? "CODEOWNERS configured" : "No CODEOWNERS",
        fix: !passed ? {
          title: "Add CODEOWNERS",
          description: "Define code owners for automatic review requests",
          code: `# Global owners\n* @org/core-team\n\n# Specific paths\n/src/auth/ @org/security-team\n/src/payments/ @org/payments-team\n\n# Docs\n*.md @org/docs-team`,
          files: [".github/CODEOWNERS"],
          effort: "easy",
          impact: "medium",
        } : undefined,
      };
    },
  },

  // DEVOPS (15 points, 10 checks = 1.5 each)
  {
    id: "devops-dockerfile",
    category: "devops",
    name: "Dockerfile",
    description: "Project has a multi-stage Dockerfile",
    weight: 1.5,
    check: (facts) => {
      const passed = !!facts.dockerfile && facts.dockerfile.includes("FROM") && facts.dockerfile.includes("AS");
      return {
        passed,
        score: passed ? 1.5 : (!!facts.dockerfile ? 0.75 : 0),
        maxScore: 1.5,
        details: passed ? "Multi-stage Dockerfile" : !!facts.dockerfile ? "Basic Dockerfile" : "No Dockerfile",
        fix: !passed ? {
          title: "Add multi-stage Dockerfile",
          description: "Create optimized Dockerfile with build and runtime stages",
          code: `# Build stage\nFROM node:20-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\n# Runtime stage\nFROM node:20-alpine\nWORKDIR /app\nCOPY --from=builder /app/dist ./dist\nCOPY --from=builder /app/node_modules ./node_modules\nCOPY --from=builder /app/package.json ./\nEXPOSE 3000\nCMD ["node", "dist/index.js"]`,
          files: ["Dockerfile"],
          effort: "moderate",
          impact: "high",
        } : undefined,
      };
    },
  },
  {
    id: "devops-docker-compose",
    category: "devops",
    name: "Docker Compose",
    description: "Project has docker-compose.yml for local development",
    weight: 1.5,
    check: (facts) => {
      // Would need to check for docker-compose.yml in file list
      return {
        passed: false,
        score: 0,
        maxScore: 1.5,
        details: "Not checked in current ingestion",
        fix: {
          title: "Add docker-compose.yml",
          description: "Create docker-compose for local development with services",
          code: `version: '3.8'\nservices:\n  app:\n    build: .\n    ports:\n      - "3000:3000"\n    environment:\n      - DATABASE_URL=postgresql://postgres:postgres@db:5432/app\n    depends_on:\n      - db\n  db:\n    image: postgres:16-alpine\n    environment:\n      - POSTGRES_PASSWORD=postgres\n      - POSTGRES_DB=app\n    volumes:\n      - pgdata:/var/lib/postgresql/data\nvolumes:\n  pgdata:`,
          files: ["docker-compose.yml"],
          effort: "easy",
          impact: "medium",
        },
      };
    },
  },
  {
    id: "devops-cd",
    category: "devops",
    name: "Continuous deployment",
    description: "Repository has CD workflow for staging/production",
    weight: 1.5,
    check: (facts) => {
      const hasCD = facts.githubActions.some(w => 
        w.name.toLowerCase().includes("deploy") || 
        w.name.toLowerCase().includes("cd") ||
        w.content.includes("deploy")
      );
      return {
        passed: hasCD,
        score: hasCD ? 1.5 : 0,
        maxScore: 1.5,
        details: hasCD ? "CD workflow found" : "No CD workflow",
        fix: !hasCD ? {
          title: "Add CD workflow",
          description: "Create deployment workflow for staging and production",
          code: `# .github/workflows/cd.yml\nname: Deploy\non:\n  release:\n    types: [published]\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - name: Deploy to production\n        run: echo "Deploy..."`,
          files: [".github/workflows/cd.yml"],
          effort: "moderate",
          impact: "high",
        } : undefined,
      };
    },
  },
  {
    id: "devops-environment-vars",
    category: "devops",
    name: "Environment configuration",
    description: "Project documents required environment variables",
    weight: 1.5,
    check: (facts) => {
      const passed = !!facts.envExample;
      return {
        passed,
        score: passed ? 1.5 : 0,
        maxScore: 1.5,
        details: passed ? ".env.example exists" : "No environment documentation",
        fix: !passed ? {
          title: "Document environment variables",
          description: "Create .env.example with all required variables",
          effort: "trivial",
          impact: "high",
        } : undefined,
      };
    },
  },
  {
    id: "devops-health-check",
    category: "devops",
    name: "Health check endpoint",
    description: "Application has a health check endpoint",
    weight: 1.5,
    check: (facts) => {
      // Would need to check source code
      return {
        passed: false,
        score: 0,
        maxScore: 1.5,
        details: "Not checked in current ingestion",
        fix: {
          title: "Add health check endpoint",
          description: "Implement GET /health endpoint for monitoring",
          code: `// app/api/health/route.ts\nexport async function GET() {\n  return Response.json({ status: 'ok', timestamp: new Date().toISOString() })\n}`,
          files: ["app/api/health/route.ts", "src/routes/health.ts"],
          effort: "trivial",
          impact: "medium",
        },
      };
    },
  },
  {
    id: "devops-logging",
    category: "devops",
    name: "Structured logging",
    description: "Application uses structured logging (Pino, Winston, etc.)",
    weight: 1.5,
    check: (facts) => {
      const pkg = facts.packageJson;
      const hasLogger = pkg?.dependencies?.pino || pkg?.dependencies?.winston || pkg?.dependencies?.["@logtail/next"];
      return {
        passed: !!hasLogger,
        score: hasLogger ? 1.5 : 0,
        maxScore: 1.5,
        details: hasLogger ? "Structured logger found" : "No structured logging",
        fix: !hasLogger ? {
          title: "Add structured logging",
          description: "Implement Pino or Winston for structured JSON logs",
          code: `npm install pino pino-pretty\n\n// lib/logger.ts\nimport pino from 'pino'\nexport const logger = pino({ level: process.env.LOG_LEVEL || 'info' })`,
          files: ["lib/logger.ts", "package.json"],
          effort: "easy",
          impact: "medium",
        },
      };
    },
  },
  {
    id: "devops-monitoring",
    category: "devops",
    name: "Error tracking",
    description: "Project has error tracking (Sentry, etc.)",
    weight: 1.5,
    check: (facts) => {
      const pkg = facts.packageJson;
      const hasSentry = pkg?.dependencies?.["@sentry/nextjs"] || pkg?.dependencies?.["@sentry/node"];
      return {
        passed: !!hasSentry,
        score: hasSentry ? 1.5 : 0,
        maxScore: 1.5,
        details: hasSentry ? "Sentry configured" : "No error tracking",
        fix: !hasSentry ? {
          title: "Add error tracking",
          description: "Integrate Sentry for error monitoring",
          code: `npm install @sentry/nextjs\n\n# sentry.client.config.ts\nimport * as Sentry from '@sentry/nextjs'\nSentry.init({ dsn: process.env.SENTRY_DSN })`,
          files: ["sentry.client.config.ts", "package.json"],
          effort: "easy",
          impact: "high",
        },
      };
    },
  },
  {
    id: "devops-backup",
    category: "devops",
    name: "Database backup strategy",
    description: "Project documents or automates database backups",
    weight: 1.5,
    check: (facts) => {
      return {
        passed: false,
        score: 0,
        maxScore: 1.5,
        details: "Not checked in current ingestion",
        fix: {
          title: "Document backup strategy",
          description: "Add backup procedures to README or docs",
          effort: "easy",
          impact: "medium",
        },
      };
    },
  },
  {
    id: "devops-rollback",
    category: "devops",
    name: "Rollback strategy",
    description: "CD pipeline supports rollback",
    weight: 1.5,
    check: (facts) => {
      return {
        passed: false,
        score: 0,
        maxScore: 1.5,
        details: "Not checked in current ingestion",
        fix: {
          title: "Add rollback capability",
          description: "Implement deployment rollback in CD pipeline",
          effort: "moderate",
          impact: "high",
        },
      };
    },
  },
  {
    id: "devops-sbom",
    category: "devops",
    name: "SBOM generation",
    description: "Project generates Software Bill of Materials",
    weight: 1.5,
    check: (facts) => {
      const hasSbom = facts.githubActions.some(w => w.content.includes("sbom") || w.content.includes("cyclonedx") || w.content.includes("syft"));
      return {
        passed: hasSbom,
        score: hasSbom ? 1.5 : 0,
        maxScore: 1.5,
        details: hasSbom ? "SBOM generation found" : "No SBOM",
        fix: !hasSbom ? {
          title: "Add SBOM generation",
          description: "Generate SBOM in CI using Syft or CycloneDX",
          code: `# .github/workflows/sbom.yml\n- uses: anchore/sbom-action@v0\n  with:\n    format: cyclonedx-json\n    output-file: sbom.json`,
          files: [".github/workflows/sbom.yml"],
          effort: "easy",
          impact: "medium",
        },
      };
    },
  },

  // COMMUNITY (15 points, 10 checks = 1.5 each)
  {
    id: "comm-discussions",
    category: "community",
    name: "GitHub Discussions",
    description: "Repository has Discussions enabled",
    weight: 1.5,
    check: (facts) => {
      const passed = facts.discussions;
      return {
        passed,
        score: passed ? 1.5 : 0,
        maxScore: 1.5,
        details: passed ? "Discussions enabled" : "Discussions disabled",
        fix: !passed ? {
          title: "Enable GitHub Discussions",
          description: "Turn on Discussions in repository settings for community Q&A",
          effort: "trivial",
          impact: "medium",
        },
      };
    },
  },
  {
    id: "comm-issue-labels",
    category: "community",
    name: "Issue labels",
    description: "Repository uses organized issue labels",
    weight: 1.5,
    check: (facts) => {
      // Can't check via API easily
      return {
        passed: false,
        score: 0,
        maxScore: 1.5,
        details: "Not checked in current ingestion",
        fix: {
          title: "Add issue labels",
          description: "Create standard labels: bug, enhancement, documentation, good first issue, help wanted, priority:high, etc.",
          effort: "easy",
          impact: "medium",
        },
      };
    },
  },
  {
    id: "comm-good-first-issues",
    category: "community",
    name: "Good first issues",
    description: "Repository has 'good first issue' labeled issues",
    weight: 1.5,
    check: (facts) => {
      return {
        passed: false,
        score: 0,
        maxScore: 1.5,
        details: "Not checked in current ingestion",
        fix: {
          title: "Create good first issues",
          description: "Add 3-5 issues labeled 'good first issue' for newcomers",
          effort: "easy",
          impact: "medium",
        },
      };
    },
  },
  {
    id: "comm-release-notes",
    category: "community",
    name: "Release notes",
    description: "Releases have detailed release notes",
    weight: 1.5,
    check: (facts) => {
      const passed = facts.releases.length > 0 && facts.releases.every(r => r.body && r.body.length > 100);
      return {
        passed,
        score: passed ? 1.5 : (facts.releases.length > 0 ? 0.75 : 0),
        maxScore: 1.5,
        details: passed ? "Detailed release notes" : facts.releases.length > 0 ? "Releases exist but minimal notes" : "No releases",
        fix: !passed ? {
          title: "Write detailed release notes",
          description: "Add comprehensive release notes for each version",
          effort: "easy",
          impact: "medium",
        },
      };
    },
  },
  {
    id: "comm-responds-to-issues",
    category: "community",
    name: "Responsive to issues",
    description: "Maintainers respond to issues in reasonable time",
    weight: 1.5,
    check: (facts) => {
      return {
        passed: false,
        score: 0,
        maxScore: 1.5,
        details: "Not checked in current ingestion",
        fix: {
          title: "Improve issue response",
          description: "Set up issue triage process and response SLAs",
          effort: "moderate",
          impact: "medium",
        },
      };
    },
  },
  {
    id: "comm-contributors-md",
    category: "community",
    name: "Contributors recognition",
    description: "Project recognizes contributors (CONTRIBUTORS.md, all-contributors)",
    weight: 1.5,
    check: (facts) => {
      const readme = facts.readme?.toLowerCase() || "";
      const passed = readme.includes("contributors") || readme.includes("all-contributors");
      return {
        passed,
        score: passed ? 1.5 : 0,
        maxScore: 1.5,
        details: passed ? "Contributors recognized" : "No contributor recognition",
        fix: !passed ? {
          title: "Add contributor recognition",
          description: "Use all-contributors bot or add CONTRIBUTORS.md",
          code: `npm install --save-dev all-contributors-cli\n\n# Add to package.json\n"scripts": {\n  "contributors:add": "all-contributors add",\n  "contributors:generate": "all-contributors generate"\n}`,
          files: [".all-contributorsrc", "package.json"],
          effort: "easy",
          impact: "low",
        },
      };
    },
  },
  {
    id: "comm-social-links",
    category: "community",
    name: "Social links",
    description: "Repository has social links (Twitter, Discord, website)",
    weight: 1.5,
    check: (facts) => {
      const readme = facts.readme?.toLowerCase() || "";
      const hasLinks = readme.includes("discord") || readme.includes("twitter") || readme.includes("slack") || !!facts.homepage;
      return {
        passed: hasLinks,
        score: hasLinks ? 1.5 : 0,
        maxScore: 1.5,
        details: hasLinks ? "Social links found" : "No community links",
        fix: !hasLinks ? {
          title: "Add community links",
          description: "Add Discord, Twitter, or forum links to README",
          effort: "trivial",
          impact: "low",
        },
      };
    },
  },
  {
    id: "comm-funding",
    category: "community",
    name: "Funding/sponsorship",
    description: "Repository has funding.yml or sponsorship options",
    weight: 1.5,
    check: (facts) => {
      return {
        passed: false,
        score: 0,
        maxScore: 1.5,
        details: "Not checked in current ingestion",
        fix: {
          title: "Add funding options",
          description: "Create .github/FUNDING.yml for GitHub Sponsors",
          code: `# .github/FUNDING.yml\ngithub: [your-username]\npatreon: your-name\nopen_collective: your-org`,
          files: [".github/FUNDING.yml"],
          effort: "trivial",
          impact: "low",
        },
      };
    },
  },
  {
    id: "comm-readme-badges",
    category: "community",
    name: "Status badges",
    description: "README displays build, coverage, version badges",
    weight: 1.5,
    check: (facts) => {
      if (!facts.readme) return { passed: false, score: 0, maxScore: 1.5, details: "No README" };
      const badges = [
        /img\.shields\.io.*build/,
        /img\.shields\.io.*coverage/,
        /img\.shields\.io.*version/,
        /img\.shields\.io.*license/,
        /github\.com\/.*\/actions\/workflows/,
      ];
      const found = badges.filter(r => r.test(facts.readme!)).length;
      const passed = found >= 3;
      return {
        passed,
        score: passed ? 1.5 : (found / badges.length) * 1.5,
        maxScore: 1.5,
        details: `${found}/5 badge types`,
        fix: !passed ? {
          title: "Add status badges",
          description: "Add build, coverage, version, license badges to README",
          code: `[![Build](https://github.com/${facts.owner}/${facts.repo}/actions/workflows/ci.yml/badge.svg)](https://github.com/${facts.owner}/${facts.repo}/actions/workflows/ci.yml)\n[![Coverage](https://img.shields.io/codecov/c/github/${facts.owner}/${facts.repo})](https://codecov.io/gh/${facts.owner}/${facts.repo})\n[![Version](https://img.shields.io/github/v/release/${facts.owner}/${facts.repo})](https://github.com/${facts.owner}/${facts.repo}/releases)\n[![License](https://img.shields.io/github/license/${facts.owner}/${facts.repo})](LICENSE)`,
          files: ["README.md"],
          effort: "trivial",
          impact: "medium",
        },
      };
    },
  },
  {
    id: "comm-website",
    category: "community",
    name: "Project website",
    description: "Project has a dedicated website or docs site",
    weight: 1.5,
    check: (facts) => {
      const passed = !!facts.homepage && !facts.homepage.includes("github.com");
      return {
        passed,
        score: passed ? 1.5 : 0,
        maxScore: 1.5,
        details: passed ? `Website: ${facts.homepage}` : "No dedicated website",
        fix: !passed ? {
          title: "Create project website",
          description: "Deploy docs site with Next.js, VitePress, or Docusaurus",
          effort: "moderate",
          impact: "medium",
        },
      };
    },
  },
];

export async function runAudit(
  facts: RepoFacts,
  strictness: "lenient" | "balanced" | "strict" = "balanced"
): Promise<AuditResult> {
  const results = CHECKS.map(check => {
    const result = check.check(facts, strictness);
    return {
      id: check.id,
      category: check.category,
      name: check.name,
      description: check.description,
      weight: check.weight,
      ...result,
    };
  });

  const categoryScores = {
    docs: 0,
    "code-quality": 0,
    security: 0,
    devops: 0,
    community: 0,
  };

  let totalScore = 0;
  let passedChecks = 0;

  for (const r of results) {
    categoryScores[r.category as keyof typeof categoryScores] += r.score;
    totalScore += r.score;
    if (r.passed) passedChecks++;
  }

  const grade = calculateGrade(totalScore);

  const fixes = results
    .filter(r => r.fix)
    .map(r => ({
      checkId: r.id,
      title: r.fix!.title,
      description: r.fix!.description,
      code: r.fix!.code,
      files: r.fix!.files,
      effort: r.fix!.effort,
      impact: r.fix!.impact,
      priority: calculatePriority(r.fix!.impact, r.fix!.effort, r.weight),
    }))
    .sort((a, b) => b.priority - a.priority);

  return {
    score: Math.round(totalScore),
    grade,
    checks: results,
    summary: {
      docs: Math.round(categoryScores.docs),
      codeQuality: Math.round(categoryScores["code-quality"]),
      security: Math.round(categoryScores.security),
      devops: Math.round(categoryScores.devops),
      community: Math.round(categoryScores.community),
    },
    totalChecks: results.length,
    passedChecks,
    failedChecks: results.length - passedChecks,
    fixes,
    strictness,
    source: facts.source,
    auditedAt: new Date().toISOString(),
  };
}

function calculateGrade(score: number): "S" | "A" | "B" | "C" | "D" | "F" {
  if (score >= 95) return "S";
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

function calculatePriority(impact: string, effort: string, weight: number): number {
  const impactScore = { critical: 100, high: 75, medium: 50, low: 25 }[impact] || 0;
  const effortScore = { trivial: 1, easy: 2, moderate: 3, hard: 4 }[effort] || 4;
  return Math.round((impactScore * weight * 10) / effortScore);
}