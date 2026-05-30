# Bank Gear Helper

Bank Gear Helper is an external plugin for [RuneLite](https://runelite.net/) and Old School RuneScape.

It recommends monster gear setups using only items already found in your bank. The plugin is display-only: it scans RuneLite's bank item container, compares owned items against preset priority lists, and shows recommendations in a side panel. It does not click, equip, withdraw, or otherwise interact with the game.

## Included monsters

- Vorkath
- Zulrah
- Corporeal Beast
- Abyssal Demons
- Gargoyles
- Demonic Gorillas
- General Graardor
- Commander Zilyana
- K'ril Tsutsaroth
- Kree'arra

## Project layout

```text
src/main/java/com/bankgearhelper/
  BankGearHelperPlugin.java RuneLite plugin entry point and toolbar wiring
  data/MonsterPresets.java  Built-in monster gear presets
  model/                    Preset, bank, and recommendation models
  service/                  Bank scanner and gear recommendation logic
  ui/BankGearHelperPanel.java
src/main/resources/
  runelite-plugin.properties
src/test/java/com/bankgearhelper/
  BankGearHelperPluginTest.java Developer launcher
```

## Requirements

- Java 11 or newer
- The included Gradle wrapper, or an IDE with Gradle support

## Run locally

From this directory:

```sh
./gradlew run
```

The `run` task starts RuneLite in developer mode with Bank Gear Helper loaded as a built-in external plugin.

If you use a Jagex account, follow RuneLite's development-client instructions for logging in with Jagex accounts.
