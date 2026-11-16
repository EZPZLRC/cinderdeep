#!/bin/sh
# Builds the zip to upload to CrazyGames (branch oathbyte-crazygames). The zip is the public/ folder as it is: index.html at the top,
# relative paths only. Online play still goes to https://oathbyte.onrender.com (see public/js/cg.js).
# Run from the repository folder:  sh tools/crazygames/pack.sh 0001   ->  oathbyte-crazygames-0001.zip
set -e
N=${1:-0001}; OUT="$(pwd)/oathbyte-crazygames-$N.zip"; rm -f "$OUT"
( cd public && zip -qr -9 "$OUT" . -x '*.DS_Store' )
echo "$OUT: $(unzip -l "$OUT" | tail -1 | awk '{print $2}') files, $(du -h "$OUT" | cut -f1)"
