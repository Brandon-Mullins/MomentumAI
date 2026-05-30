# Momentum Helper

Momentum Helper is a starter external plugin for [RuneLite](https://runelite.net/) and Old School RuneScape.

The initial plugin keeps the behavior intentionally small: it loads in the RuneLite developer client and can send a configurable login reminder when the player reaches the logged-in game state. This gives us a safe foundation for future OSRS helper features.

## Project layout

```text
src/main/java/com/momentum/osrs/
  MomentumPlugin.java       RuneLite plugin entry point
  MomentumConfig.java       Plugin configuration
src/main/resources/
  runelite-plugin.properties
src/test/java/com/momentum/osrs/
  MomentumPluginTest.java   Developer launcher
```

## Requirements

- Java 11 or newer
- The included Gradle wrapper, or an IDE with Gradle support

## Run locally

From this directory:

```sh
./gradlew run
```

The `run` task starts RuneLite in developer mode with Momentum Helper loaded as a built-in external plugin.

If you use a Jagex account, follow RuneLite's development-client instructions for logging in with Jagex accounts.

## Next feature ideas

- Session goal reminders
- Skill or activity checklists
- Configurable AFK nudges
- Lightweight loot/session summaries
