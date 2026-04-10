<h1 align="center"><img src="public/favicon.svg" alt="" width="32" height="32" align="center" /> Nikado</h1>

<p align="center">A visual tool for the <a href="https://understandlegacycode.com/blog/a-process-to-do-safe-changes-in-a-complex-codebase">Mikado Method</a>.<br /><a href="https://understandlegacycode.com/blog/visual-tool-mikado-method/">Read the announcement blog post</a></p>

<p align="center">
	<!-- prettier-ignore-start -->
	<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
	<a href="#contributors" target="_blank"><img alt="👪 All Contributors: 2" src="https://img.shields.io/badge/%F0%9F%91%AA_all_contributors-2-21bb42.svg" /></a>
<!-- ALL-CONTRIBUTORS-BADGE:END -->
	<!-- prettier-ignore-end -->
	<a href="https://github.com/nicoespeon/nikado/blob/main/.github/CODE_OF_CONDUCT.md" target="_blank"><img alt="🤝 Code of Conduct: Kept" src="https://img.shields.io/badge/%F0%9F%A4%9D_code_of_conduct-kept-21bb42" /></a>
	<a href="https://github.com/nicoespeon/nikado/blob/main/LICENSE.md" target="_blank"><img alt="📝 License: MIT" src="https://img.shields.io/badge/%F0%9F%93%9D_license-MIT-21bb42.svg" /></a>
</p>

Stuck on a big change with no end in sight? The Mikado Method helps you break unknown problems down so you can make steady progress without breaking things.

1. **Set your goal.** The big change you want to make.
2. **Break it down.** Add sub-tasks. You don't need to figure it all out upfront.
3. **Work from the leaves.** Start with tasks that have no children. Mark them done, then move up.
4. **Timebox your work.** Give yourself ~15 min per task. If you can't finish, break it into smaller tasks, revert your changes, and pick a new leaf.
5. **Share your progress.** Copy the URL. It contains your graph.

No backend. All state lives in the URL.

![Screenshot of a graph in Nikado](public/example-graph.png)

> 💁 [Click here to open this graph](https://nikado.app/#N4Ig5g9ghgNgkgExALhFAHAZgKYDYBmU+AtAMYDsALAIzGUCsATJcelLtsQtevQAwBOeh3zU+IADQgALlADOAazkoA2qACWSVBhwEiZKrQbNW7Tt16Dh2UeKkwoAI2wwUIAKIA7UlAAOcgFcHaWwAAgAxdRhsABEAIVDpCFDnUKdoxOS5AHd1aVIAC1CEKFlHeWxJEDlZaQDlVF9sTwR1TzAQAF8JDS0QdFxcSnJMKFo+Sj5GOkYoAVZsclxiPj4oUnRKBHR8Kfoqh2dXVAAlbF8HUjDI6PjQ3OkimNKnCtC2kIAnQivQ-AhPqEYNAEAAKACUAHoagDsBCqjVSvU3E0Wm0Ot1em4SggBIx8KR6MRyAJcJg6HM+MRHARaAJSHjGJhqAhHIw+LgDk4XG4zgBbCAANzCAEFfL5QnJsNIAMpJT5QMDYG5w8GhJWy+WK5VRVWhPnSgoQBDKKSIuoNECo1rtLo9ECaNzUGgTJmcKCYUjLShjKDEAQDBDEXCMHjUWb0BkbLlHNwABSCMFCAQlpE+2FK6ggnlCEHwEV1dySQKgAW8BWwnwRtWRjWaNox9sdqFIjHI60cAipwwQ3ZJ5GIcy2xGZ+Gw9CE1GwmHo1BjPNQAFUpcUXuUVx9Kz8wm1Qou4NWkZaENnKpiHX11tQaTPptRcK26Gsqeg+OQia-MBz8ENMAHSPOxwgAAwumpRhCUZRvJu3zrGE-yAiq8QAHTAlAYJQjC6bwmaNbHqedpYqg6COM+npBowCA0HQ+CUYO9CUMsmCOCSrYCOwuD0Eg9jckBwHZvg6hgAE6Z-LqfwAgWtwJLupDZjUnwBKQ8qHha2IEZ0AC6UgIOc9bNKQ6jYA0aggPgnwQHybg6HghAkBQ1HGCwbAcFwPD8EIIhiFUSRuAMQwjGMKyTNMlCzPM6CLMsqzrJs2y7Iw+znuZlnWVgtn6A5RhMM5ZhuZYnk2N5Ui+agOJ4gSRIkmSFJdtStL+gyjBMiybIcoRZkWVZZXoRVhLEqS5I+nVNKiI1jLMqy7KciVEBOi6YU4IOnrer6-qBsGoboOGUCRvS6AdSl3X9IMwyjOMIUzHMCxLCsawbFsOx7D5c0tm2HZ1T2fYCAOQ5BqO46TtOs6HV1bitu2pCdn2vZ0P2g4CMOAMTrOwNzrN1mkNeZJMMQ96PpMUAvm+H58F+BC-v+oOpW9kPQ3DsPDD9CNI9QY4o1OM7ozIr39KRRPkcQlGObRQa7YxI4sfSjDsYMXFdJpnRAA)

## Getting started

Prerequisites: [Node.js](https://nodejs.org/) (>=20.19.0) and [pnpm](https://pnpm.io/) (10.x). If you use [asdf](https://asdf-vm.com/), the `.tool-versions` file has you covered.

```sh
pnpm install
pnpm dev
```

## Scripts

You'll mostly run `pnpm dev` to run the app locally.

If you change the code, `pnpm test` and `pnpm lint` will be helpful.

Code formatting should run automatically when you commit anyway.

| Command               | What it does                            |
| --------------------- | --------------------------------------- |
| `pnpm dev`            | Start the dev server                    |
| `pnpm test`           | Run tests in watch mode                 |
| `pnpm test --run`     | Single test run (use before committing) |
| `pnpm lint`           | Run the linter, zero warnings allowed   |
| `pnpm build`          | TypeScript check + Production build     |
| `pnpm format --write` | Format code with Prettier               |

## Architecture

Three layers, strictly separated:

```
src/model/       Pure functions & types. No React, no side effects.
src/store/       Zustand store. Thin adapter over model functions.
src/components/  React + ReactFlow rendering. Minimal logic.
```

Data flows one way: user interaction > component > store action > model function (pure) > new state > re-render.

## Tooling

- [Vite](https://vite.dev/) for dev server and builds
- [React Flow](https://reactflow.dev/) for the interactive graph
- [Zustand](https://zustand.docs.pmnd.rs/) for state management
- [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) for tests
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Husky](https://typicode.github.io/husky/) + [lint-staged](https://github.com/lint-staged/lint-staged) for pre-commit hooks (Prettier on staged files)

## Author

Built by [Nicolas Carlo](https://understandlegacycode.com). Made with 💜 in Canada 🇨🇦

[Bluesky](https://bsky.app/profile/nicoespeon.com) · [LinkedIn](https://www.linkedin.com/in/nicolas-carlo-095b243b/) · [GitHub](https://github.com/nicoespeon)

## Contributors

<!-- spellchecker: disable -->
<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/erikbjoern"><img src="https://avatars.githubusercontent.com/u/61984272?v=4?s=100" width="100px;" alt="Erik Björn"/><br /><sub><b>Erik Björn</b></sub></a><br /><a href="https://github.com/nicoespeon/nikado/issues?q=author%3Aerikbjoern" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://understandlegacycode.com/"><img src="https://avatars.githubusercontent.com/u/1094774?v=4?s=100" width="100px;" alt="Nicolas Carlo"/><br /><sub><b>Nicolas Carlo</b></sub></a><br /><a href="https://github.com/nicoespeon/nikado/commits?author=nicoespeon" title="Code">💻</a> <a href="https://github.com/nicoespeon/nikado/commits?author=nicoespeon" title="Documentation">📖</a> <a href="#ideas-nicoespeon" title="Ideas, Planning, & Feedback">🤔</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->
<!-- spellchecker: enable -->

## License

[MIT](LICENSE.md)
