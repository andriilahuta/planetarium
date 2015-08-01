set babel=C:\Users\"Evil Genius"\AppData\Roaming\npm\babel.cmd
start %babel% js\planetarium.es6 --watch --out-file js\planetarium.js
start %babel% js\planetarium-element.es6 --watch --out-file js\planetarium-element.js
python -m http.server