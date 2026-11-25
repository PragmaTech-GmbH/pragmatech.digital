---
title: "A Composable Docker Environment for Every Claude Code Session"
summary: "How I work on several Spring Boot tasks in parallel: a Claude Code hook starts one Docker Compose environment per git worktree, and the status line shows its ports."
description: "Run parallel Spring Boot dev environments with Claude Code: git worktrees, Docker Compose, a SessionStart hook and dynamic ports in the status line."
date: 2026-11-25
lastmod: 2026-11-25
author: "philip"
share_image: "/images/blog/parallel-claude-code-sessions-share.png"
draft: true
---

I usually work on several things in parallel: a feature in one Claude Code session, a bug fix in another and an experiment in a third. [Git worktrees](https://code.claude.com/docs/en/worktrees) give each session its own copy of the code.

They don't give each session its own **running application**. As soon as I want to click through the UI or check which email the app sends, the sessions compete for port 8080, share one database and see each other's data and schema migrations.

My solution: every Claude Code session that starts in a worktree gets its own Docker Compose environment. A hook starts it in the background, and the Claude Code status line shows where to find it:

![Status line output while the environment starts and after the application is healthy, with the ports for the app, Mailpit and PostgreSQL](/generated/images/blog/claude-code-statusline.webp)

*The status line output for a sample worktree, shown in a plain terminal frame.*

With several sessions, this is the big picture:

![Three Claude Code terminal sessions, each connected to its own Docker Compose environment with Spring Boot, PostgreSQL and Mailpit on separate ports](/generated/images/blog/parallel-claude-code-sessions.webp)

This **closes the loop for agentic development**. The agent doesn't stop after writing code and running tests. It can restart the application, call the API, click through the UI with a browser tool such as [Playwright](https://playwright.dev/), check the emails in Mailpit and query the database. If something is wrong, it fixes the code and checks again, without waiting for me and without disturbing the other sessions.

The price is hardware. Every session brings its own JVM, Maven process, PostgreSQL and Mailpit. If you run several sessions at once, you need a beefier machine with enough memory and CPU, especially when multiple environments start or compile at the same time.

I built this for a larger client project. This article shows a slimmed-down version for a typical Spring Boot application with PostgreSQL and [Mailpit](https://mailpit.axllent.org/) as a local mail trap.

## The moving parts

The setup consists of a few files that you commit to your repository:

```text
.claude/
  settings.json          # registers the hooks and the status line
  hooks/
    session-start.sh     # starts the environment
    worktree-remove.sh   # destroys it together with the worktree
    statusline.sh        # shows state and ports
dev/
  compose.yaml           # app, PostgreSQL, Mailpit
  devenv.sh              # slots, ports and lifecycle
```

You need Docker with Compose, `jq`, `curl` and a Spring Boot application with the Maven setup and Spring Boot Actuator. Add `.devenv/` to your `.gitignore`, as this folder holds the state of each environment. Make `dev/devenv.sh` executable.

The most important design decision: **all logic lives in `dev/devenv.sh`, not in the hooks.** The script works without Claude Code, so my teammates, my own terminal and the agent use the same commands. The hooks are only thin adapters.

## The Docker Compose file

The whole stack runs in containers, including the Spring Boot application. Every host port comes from a variable:

```yaml {title="dev/compose.yaml"}
services:
  app:
    image: maven:3.9-eclipse-temurin-25
    working_dir: /workspace
    command: mvn --batch-mode spring-boot:run
    ports:
      - "127.0.0.1:${APP_PORT}:8080"
    volumes:
      - ..:/workspace
      # Keep the container build output away from the target/ folder of your IDE
      - target:/workspace/target
      - maven-repository:/root/.m2
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/app
      SPRING_DATASOURCE_USERNAME: app
      SPRING_DATASOURCE_PASSWORD: app
      SPRING_MAIL_HOST: mailpit
      SPRING_MAIL_PORT: "1025"
      # Cookies ignore the port, so each environment needs its own cookie name
      SERVER_SERVLET_SESSION_COOKIE_NAME: SESSION_${DEVENV_SLOT}
      # For absolute links, for example in emails (your own property)
      APP_BASE_URL: http://localhost:${APP_PORT}
    depends_on:
      postgres:
        condition: service_healthy
      mailpit:
        condition: service_started

  postgres:
    image: postgres:18
    ports:
      - "127.0.0.1:${DB_PORT}:5432"
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
    volumes:
      - postgres-data:/var/lib/postgresql
    healthcheck:
      # -h 127.0.0.1: the temporary server during the first init only uses the socket
      test: ["CMD-SHELL", "pg_isready -h 127.0.0.1 -U app -d app"]
      interval: 3s
      retries: 20

  mailpit:
    image: axllent/mailpit:v1.29
    ports:
      - "127.0.0.1:${MAIL_PORT}:8025"

volumes:
  postgres-data:
  target:
  # Shared by all worktrees, so only the first start downloads the dependencies
  maven-repository:
    name: devenv-maven-repository
    external: true
```

What makes this file safe to run several times in parallel:

- **No `container_name`.** Compose prefixes containers, networks and volumes with the project name. A fixed name breaks this isolation, and the second environment fails to start.
- **Each environment has its own database volume.** You can run a destructive Flyway migration in one worktree without affecting the others.
- **Inside and outside use different addresses.** The containers talk to `postgres:5432`. Only your browser, IDE and the agent use the dynamic host ports.
- **Ports bind to `127.0.0.1`.** These services use throwaway credentials, so nobody else in your network should reach them.
- **The Maven repository is shared.** This saves a full dependency download per worktree. Maven doesn't guarantee safe concurrent writes by default, so if you see corrupt downloads, give each environment its own volume.

## One slot per worktree

You could let Docker pick random host ports and ask for them with `docker compose port`. I prefer ports that I can read and that stay the same after a restart.

Each environment claims a **slot** between 1 and 99, and the slot defines all ports:

| Service    | Port           | Slot 1 | Slot 2 |
|------------|----------------|--------|--------|
| App        | 8000 + slot    | 8001   | 8002   |
| PostgreSQL | 15000 + slot   | 15001  | 15002  |
| Mailpit UI | 20000 + slot   | 20001  | 20002  |

A small registry in `~/.devenv/slots` records which worktree owns which slot. A stopped environment keeps its slot. The script also skips a slot if any of its three ports is in use by another process. This happened right away in my test: another project on my machine was listening on port 20001, so the first environment got slot 2.

```bash {title="dev/devenv.sh"}
#!/usr/bin/env bash
# One Docker Compose environment per git worktree.
# usage: dev/devenv.sh up|wait|status|logs|restart|down|destroy|gc
set -euo pipefail

devDir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
rootDir="$(dirname "$devDir")"
stateDir="$rootDir/.devenv"
stateFile="$stateDir/state.env"
slotsDir="${DEVENV_HOME:-$HOME/.devenv}/slots"

# Folder name plus a path checksum: readable and unique
projectName() {
  local folderName pathChecksum
  folderName="$(basename "$rootDir" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9\n' '-')"
  pathChecksum="$(printf '%s' "$rootDir" | cksum | cut -d' ' -f1)"
  printf 'devenv-%s-%s' "$folderName" "$pathChecksum"
}

# Linux: prefer ss, because lsof does not show the sockets of other users
portBusy() {
  if command -v ss >/dev/null 2>&1; then
    ss -Hltn "sport = :$1" | grep -q .
  else
    lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
  fi
}

# Slot 3 means: app 8003, database 15003, mail UI 20003
claimSlot() {
  local slot basePort
  mkdir -p "$slotsDir"
  for slot in $(seq 1 99); do
    for basePort in 8000 15000 20000; do
      if portBusy $((basePort + slot)); then continue 2; fi
    done
    # noclobber makes this atomic: two parallel sessions cannot get the same slot
    if (set -o noclobber; printf '%s\n%s\n' "$rootDir" "$(projectName)" > "$slotsDir/$slot") 2>/dev/null; then
      mkdir -p "$stateDir"
      cat > "$stateFile" <<ENV
COMPOSE_PROJECT_NAME=$(projectName)
DEVENV_SLOT=$slot
APP_PORT=$((8000 + slot))
DB_PORT=$((15000 + slot))
MAIL_PORT=$((20000 + slot))
ENV
      return 0
    fi
  done
  echo "No free slot" >&2
  return 1
}

compose() {
  [ -f "$stateFile" ] || { echo "No environment yet, run: dev/devenv.sh up" >&2; exit 1; }
  docker compose --env-file "$stateFile" -f "$devDir/compose.yaml" "$@"
}

printStatus() {
  [ -f "$stateFile" ] || { echo "No environment yet, run: dev/devenv.sh up" >&2; exit 1; }
  # shellcheck disable=SC1090
  . "$stateFile"
  cat <<STATUS
Slot $DEVENV_SLOT ($COMPOSE_PROJECT_NAME)
  App         http://localhost:$APP_PORT
  Mailpit     http://localhost:$MAIL_PORT
  PostgreSQL  localhost:$DB_PORT (app/app)
STATUS
}

waitForApp() {
  # shellcheck disable=SC1090
  . "$stateFile"
  for _ in $(seq 1 180); do
    if curl -sf -m 2 "http://localhost:$APP_PORT/actuator/health" >/dev/null; then
      printStatus
      return 0
    fi
    sleep 5
  done
  echo "App is not healthy, check: dev/devenv.sh logs app" >&2
  return 1
}

# Remove environments of worktrees that no longer exist
collectGarbage() {
  local slotFile ownerDir ownerProject
  for slotFile in "$slotsDir"/*; do
    [ -f "$slotFile" ] || continue
    ownerDir="$(sed -n 1p "$slotFile")"
    ownerProject="$(sed -n 2p "$slotFile")"
    if [ -z "$ownerDir" ] || [ -d "$ownerDir" ]; then continue; fi
    echo "Removing orphaned environment $ownerProject"
    # Labels work even though the compose file is gone
    local filter="label=com.docker.compose.project=$ownerProject"
    # --volumes also removes anonymous volumes that an image declares
    docker ps -aq --filter "$filter" | xargs -r docker rm --force --volumes >/dev/null
    docker volume ls -q --filter "$filter" | xargs -r docker volume rm >/dev/null
    docker network ls -q --filter "$filter" | xargs -r docker network rm >/dev/null
    rm -f "$slotFile"
  done
}

command="${1:-}"
[ $# -gt 0 ] && shift

case "$command" in
  up)
    [ -f "$stateFile" ] || claimSlot
    docker volume create devenv-maven-repository >/dev/null
    compose up -d
    printStatus
    ;;
  wait)    waitForApp ;;
  status)  printStatus; compose ps ;;
  logs)    compose logs -f --tail 200 "$@" ;;
  restart) compose restart "${@:-app}" ;;
  down)    compose stop ;;
  destroy)
    if [ -f "$stateFile" ]; then
      # shellcheck disable=SC1090
      . "$stateFile"
      compose down --volumes --remove-orphans
      rm -f "$slotsDir/$DEVENV_SLOT"
      rm -rf "$stateDir"
    fi
    ;;
  gc)      collectGarbage ;;
  *)       echo "usage: dev/devenv.sh up|wait|status|logs|restart|down|destroy|gc" >&2; exit 1 ;;
esac
```

After a Java change, `dev/devenv.sh restart app` restarts the application, and Maven compiles the new code on startup.

## Start the environment with a SessionStart hook

Claude Code [hooks](https://code.claude.com/docs/en/hooks) are commands that run at fixed points of a session. The `SessionStart` hook receives JSON on stdin, including the `cwd` of the session.

My hook answers three questions: Does this repository have a dev environment script? Is this a linked worktree? Is Docker running? If all answers are yes, it starts the environment.

```bash {title=".claude/hooks/session-start.sh"}
#!/usr/bin/env bash
# SessionStart hook: start the dev environment when the session runs in a worktree.
set -uo pipefail

# Use cwd from the hook input: CLAUDE_PROJECT_DIR can point to another checkout
sessionDir="$(jq -r '.cwd // empty')"
[ -d "$sessionDir" ] || exit 0

rootDir="$(git -C "$sessionDir" rev-parse --show-toplevel 2>/dev/null)" || exit 0
devenvScript="$rootDir/dev/devenv.sh"
[ -x "$devenvScript" ] || exit 0

# Only linked worktrees: their git dir is <main checkout>/.git/worktrees/<name>
gitDir="$(git -C "$rootDir" rev-parse --absolute-git-dir)"
case "$gitDir" in */worktrees/*) ;; *) exit 0 ;; esac

stateDir="$rootDir/.devenv"
pidFile="$stateDir/up.pid"
logFile="$stateDir/up.log"

if ! docker info >/dev/null 2>&1; then
  message="Dev environment not started: Docker is not running. Start Docker, then run dev/devenv.sh up."
elif [ -f "$pidFile" ] && kill -0 "$(cat "$pidFile")" 2>/dev/null; then
  message="Dev environment is still starting, log: .devenv/up.log."
else
  mkdir -p "$stateDir"
  # Detached and fully redirected, so the hook returns at once
  nohup bash -c '"$0" gc; "$0" up' "$devenvScript" > "$logFile" 2>&1 < /dev/null &
  echo $! > "$pidFile"
  message="A Docker Compose environment for this worktree starts in the background (app, PostgreSQL, Mailpit), log: .devenv/up.log. Before you check the UI or call the API, run dev/devenv.sh wait. Get the ports with dev/devenv.sh status and never assume port 8080."
fi

jq -n --arg context "$message" \
  '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $context}}'
```

Three details matter here:

1. **Don't block the session.** The first start pulls images and downloads dependencies. The hook starts `devenv.sh up` with `nohup`, redirects all output to a log file and returns, so I can start prompting right away.
2. **Tell the agent what happened.** Claude Code adds the `additionalContext` text to the context of the session. Without it, the agent doesn't know that an environment exists and may try `localhost:8080`, which can belong to a different branch. It would then "verify" its change against the wrong application.
3. **Use `cwd`, not `CLAUDE_PROJECT_DIR`, to find the worktree.** The [documentation](https://code.claude.com/docs/en/hooks) notes that `CLAUDE_PROJECT_DIR` stays at the project root where the session started, even when Claude moves into a worktree later.

**Why not use a `WorktreeCreate` hook?** It replaces the way Claude Code creates worktrees, and it also covers worktrees for subagents. I don't want a full stack for each short-lived subagent.

## Show the ports in the status line

With three environments, I can't remember which one runs on which port. The [status line](https://code.claude.com/docs/en/statusline) solves this. It's a script that gets session data as JSON on stdin and prints what Claude Code shows below the prompt.

```bash {title=".claude/hooks/statusline.sh"}
#!/usr/bin/env bash
# Status line: directory, branch and the state of the dev environment.
# It runs often, so it only reads files and probes localhost. No docker calls.
input="$(cat)"
currentDir="$(printf '%s' "$input" | jq -r '.workspace.current_dir')"
rootDir="$(git -C "$currentDir" rev-parse --show-toplevel 2>/dev/null)"
branch="$(git -C "$currentDir" rev-parse --abbrev-ref HEAD 2>/dev/null)"

printf '\033[36m%s\033[0m' "$(basename "$currentDir")"
[ -n "$branch" ] && printf ' \033[34m(%s)\033[0m' "$branch"

stateDir="$rootDir/.devenv"
[ -n "$rootDir" ] && [ -d "$stateDir" ] || exit 0

# OSC 8 escape sequence: a clickable link in terminals that support it
link() { printf '\033]8;;%s\a%s\033]8;;\a' "$1" "$2"; }

if [ -f "$stateDir/state.env" ]; then
  # shellcheck disable=SC1091
  . "$stateDir/state.env"
  # An HTTP check on purpose: Docker opens the published port before the app listens
  if curl -sf -m 0.3 "http://localhost:$APP_PORT/actuator/health" >/dev/null 2>&1; then
    printf ' \033[32m● env %s\033[0m ' "$DEVENV_SLOT"
    link "http://localhost:$APP_PORT" "app:$APP_PORT"
    printf ' '
    link "http://localhost:$MAIL_PORT" "mail:$MAIL_PORT"
    printf ' db:%s' "$DB_PORT"
    exit 0
  fi
fi

if [ -f "$stateDir/up.pid" ] && kill -0 "$(cat "$stateDir/up.pid")" 2>/dev/null; then
  printf ' \033[33m◌ env starting\033[0m'
elif [ -f "$stateDir/state.env" ]; then
  # Stopped, still booting or broken
  printf ' \033[33m○ app:%s not ready, see .devenv/up.log\033[0m' "$APP_PORT"
else
  printf ' \033[31m✗ env failed, see .devenv/up.log\033[0m'
fi
```

In terminals with [OSC 8 support](https://code.claude.com/docs/en/statusline), such as iTerm2, Kitty or WezTerm, `app:8002` and `mail:20002` are clickable. On macOS, Cmd+click opens the UI of exactly this worktree.

**Keep this script cheap.** Claude Code runs it often, and a slow script delays the status line. Calling `docker compose ps` on every update is too much, so the script reads two small files and sends one request to localhost with a short timeout.

## Wire it up

All three scripts are registered in the project settings:

```json {title=".claude/settings.json"}
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/session-start.sh\"",
            "timeout": 30
          }
        ]
      }
    ],
    "WorktreeRemove": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/worktree-remove.sh\"",
            "timeout": 120
          }
        ]
      }
    ]
  },
  "statusLine": {
    "type": "command",
    "command": "bash \"$(git rev-parse --show-toplevel)/.claude/hooks/statusline.sh\"",
    "refreshInterval": 5
  }
}
```

The `startup` matcher limits the hook to new sessions. It doesn't run again when you resume or compact a session. If you resume after a reboot, or move into a worktree in the middle of a session, run `dev/devenv.sh up` yourself.

The `refreshInterval` re-runs the status line every five seconds. Otherwise it mainly updates on session activity and wouldn't notice that the app became ready while the session is idle.

A project `statusLine` takes precedence over your personal one. If your team doesn't want that, move this block to `.claude/settings.local.json`.

Then start a session in a new worktree:

```bash
claude --worktree feature-invoices
```

Claude Code creates the worktree under `.claude/worktrees/feature-invoices/`, and the hook starts the environment. A new worktree doesn't contain gitignored files. If your application needs a local `.env` file, list it in [`.worktreeinclude`](https://code.claude.com/docs/en/worktrees) so that Claude Code copies it.

## Clean up when the worktree goes away

Starting environments is easy. Forgetting them fills your disk with database volumes and your memory with idle JVMs.

```bash {title=".claude/hooks/worktree-remove.sh"}
#!/usr/bin/env bash
# WorktreeRemove hook. It REPLACES the default removal of Claude Code,
# so it has to delete the worktree itself.
set -uo pipefail

worktreeDir="$(jq -r '.worktree_path // empty')"
[ -d "$worktreeDir" ] || exit 0

if [ -x "$worktreeDir/dev/devenv.sh" ]; then
  # A failure here must not block the removal, "devenv.sh gc" cleans up later
  "$worktreeDir/dev/devenv.sh" destroy >&2 || echo "destroy failed" >&2
fi

commonGitDir="$(git -C "$worktreeDir" rev-parse --path-format=absolute --git-common-dir)"
mainCheckout="${commonGitDir%/.git}"
# Twice --force also removes locked worktrees
git -C "$mainCheckout" worktree remove --force --force "$worktreeDir" >&2
```

Watch out for this one: **a `WorktreeRemove` hook replaces the default removal.** If your script only stops the containers and exits successfully, the worktree stays on disk. If you register it in your user settings instead of the project settings, it runs for all your repositories, so it must handle those without a `dev/devenv.sh` too.

The hook doesn't cover everything. You might run `git worktree remove` yourself or delete the folder. That's why the `SessionStart` hook runs `devenv.sh gc` before it starts an environment. `gc` stands for garbage collection: it removes the containers, volumes and networks of worktrees that no longer exist and frees their slots.

## Pitfalls with parallel environments

### Docker runs out of networks

Each Compose project creates its own network, and Docker only has a limited number of subnets for them. My machine has networks from many projects, and the second test environment failed with:

```text
failed to create network devenv-feature-b-2183867701_default: Error response from daemon: all predefined address pools have been fully subnetted
```

First, check `docker network ls` for networks that you no longer need. `docker network prune` removes all networks that no container uses.

For a permanent fix, give Docker a larger address pool with smaller subnets in `daemon.json` (in Docker Desktop under **Settings > Docker Engine**), then restart Docker. Pick a range that doesn't collide with your company network or VPN:

```json {title="daemon.json"}
{
  "default-address-pools": [
    { "base": "10.200.0.0/16", "size": 24 }
  ]
}
```

In my client setup I went a different way: all services share the network namespace of the PostgreSQL container (`network_mode: service:postgres`, similar to a Kubernetes pod), so no environment needs a network of its own. It works well but makes the Compose file harder to read, so start with the standard approach.

### You get logged out when you switch tabs

Browsers [don't isolate cookies by port](https://www.rfc-editor.org/rfc/rfc6265#section-8.5). `localhost:8001` and `localhost:8002` share the same cookies, so with the default name `JSESSIONID`, logging in to one environment overwrites the session of the other.

That's why the Compose file sets `SERVER_SERVLET_SESSION_COOKIE_NAME` per slot. If you use Spring Session or your own cookies, such as a remember-me or token cookie, make their names depend on the slot as well.

### Links point to the wrong environment

Inside the container, the application listens on port 8080. Your browser uses the port of the slot. Every URL that leaves the application, such as a link in an email or an OAuth redirect URI, needs the host port. Build these links from `APP_BASE_URL`, and open the email in Mailpit to check them.

### Every environment costs resources

Each slot runs a JVM, Maven, PostgreSQL and Mailpit. Check the memory limit of Docker before you start many sessions, and use `dev/devenv.sh down` for environments that you don't need right now. Their data and ports stay.

## What about Spring Boot's Docker Compose support and Testcontainers?

Spring Boot's [Docker Compose support](https://docs.spring.io/spring-boot/reference/features/dev-services.html) is a good fit if you run the application on your host and want Spring Boot to start the backing services and wire the connections. Here, I want one command that manages the whole stack, including the application, with predictable ports per worktree.

This setup is also **not a replacement for Testcontainers**. It's for exploring: clicking through the UI, checking an email or inspecting data. Your automated tests should still create their own infrastructure, so that they behave the same on every machine and in CI.

## Summary

The workflow now looks like this:

1. `claude --worktree <name>` creates an isolated copy of the code.
2. The `SessionStart` hook starts a matching environment in the background and tells the agent about it.
3. The status line shows when the app is ready and where it runs.
4. Removing the worktree destroys the environment, and `gc` catches the leftovers.

I no longer stop one application to look at another. The agent also gets a real running system to verify its work against, with a database that it can't damage for anyone else.

You don't have to type these scripts from scratch. Give your coding agent this article and ask it to adapt the setup to your stack. Then review the result, especially the cleanup part, before you let it delete anything.

Joyful testing,\
Philip
