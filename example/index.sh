#!/bin/sh

set -eu -o pipefail
cd $(dirname $(realpath $0))
set -x

./match.js departure <dep-72-elbphilharmonie-2020-11-29.json
./match.js departure <dep-rb81-wandsbek-2020-11-29.json
./match.js departure <dep-s31-dammtor-2020-11-29.json
./match.js departure <dep-u3-luebecker-str-2020-11-29.json
./match.js trip <trip-re70-2020-11-20.json
./match.js trip <trip-u1-2019-11-29.json
