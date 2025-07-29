#!/bin/bash

WORKLETS_DIR="$(dirname "$0")/../worklets"
echo "WORKLETS_DIR: $WORKLETS_DIR"
if [ ! -d "$WORKLETS_DIR" ]; then
  echo "Folder $WORKLETS_DIR does not exist"
  exit 1
fi

for dir in "$WORKLETS_DIR"/*/; do
  if [ -d "$dir" ]; then
    echo "change folder: $dir"
    (cd "$dir" && pnpm install)
  fi
done

echo "All worklets have been installed"
