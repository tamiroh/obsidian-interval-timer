# Interval Timer for Obsidian 🕔

[![CI](https://github.com/tamiroh/obsidian-interval-timer/actions/workflows/ci.yml/badge.svg)](https://github.com/tamiroh/obsidian-interval-timer/actions/workflows/ci.yml) [![codecov](https://codecov.io/gh/tamiroh/obsidian-interval-timer/graph/badge.svg?token=SJIYQOXPYV)](https://codecov.io/gh/tamiroh/obsidian-interval-timer)

A configurable work/break cycle timer for [Obsidian](https://obsidian.md/). It works out of the box for the [Pomodoro Technique](https://www.pomodorotechnique.com/), but it is not limited to it — any minute-scale work/rest rhythm fits.

## Features

- Start, pause, and reset the timer (Of course, it's a timer!)
- Tracks completed focus intervals and sets, always visible on your status bar
- Configurable work and break intervals
- Notify with system notification when the timer is done

## Example configurations

The timer follows one schema: repeat (focus → short break) and take a long break every _n_ focus intervals. By tuning the settings, it covers methods beyond the Pomodoro Technique:

| Method                       | Focus | Short break | Long break | Long break after |
| ---------------------------- | ----- | ----------- | ---------- | ---------------- |
| Pomodoro Technique (default) | 25    | 5           | 15         | 4                |
| 52/17 method                 | 52    | —           | 17         | 1                |
| Ultradian rhythm             | 90    | —           | 20         | 1                |
| Simple 25/5, no long break   | 25    | 5           | 999        | 999              |

Setting "Long break after" to 1 turns the cycle into a simple two-phase work/break loop.

## Installation

Currently, you can install with [BRAT](https://github.com/TfTHacker/obsidian42-brat).
