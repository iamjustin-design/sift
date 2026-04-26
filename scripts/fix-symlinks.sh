#!/bin/sh
# Replace symlinks in .next/ with actual file copies (Cloudflare Pages can't follow symlinks)
find .next -type l | while read link; do
  target=$(readlink -f "$link")
  if [ -e "$target" ]; then
    rm "$link"
    cp -r "$target" "$link"
  fi
done
