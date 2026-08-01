#!/bin/bash
source ~/.cargo/env
pnpm tauri build --bundles rpm
sudo dnf reinstall ./src-tauri/target/release/bundle/rpm/taxon-*.rpm -y
