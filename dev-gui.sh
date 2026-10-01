#!/usr/bin/env bash
set -e

# Source Cargo environment if available
if [ -f "$HOME/.cargo/env" ]; then
  # shellcheck source=/dev/null
  . "$HOME/.cargo/env"
fi

# Run Tauri dev in GUI mode
exec pnpm tauri dev -c src-tauri/tauri.dev.conf.json -- -- --gui "$@"
