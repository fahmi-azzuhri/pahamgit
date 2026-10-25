# PahamGit

PahamGit is an interactive Git simulator for learning Git by running commands and seeing what they change. Practice in a simulated repository without affecting a real one.

## Why PahamGit

Git concepts like commits, branches, tags, and `HEAD` make more sense when you can try them out. PahamGit gives you a place to practice, inspect the repository history, and work through tasks one step at a time.

## What you can do

- Try Git commands without changing a real repository.
- See commits and branch positions in a repository graph.
- Follow a roadmap of tasks with step-by-step checklists.
- Use hints or view a suggested solution when you get stuck.
- Undo changes or reset the current task to try again.
- Sign in to save your progress and pick up where you left off.

## Features

- Interactive terminal with command history and `Tab` autocomplete.
- Practice branching, committing, merging, tagging, and recovering with reset.
- Select commits in the graph to inspect them or check them out.
- Track completed steps in each task's checklist.
- View roadmap progress and your highest completed level in your profile.

## Run the frontend

To use sign-in and sync progress, start the PahamGit backend first. Set `VITE_API_URL` to your API URL; it defaults to `http://localhost:8080`.

```bash
npm install
npm run dev
```

To create a production build:

```bash
npm run build
```
