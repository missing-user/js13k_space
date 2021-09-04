# Wasted Space

My entry to the 2021 JS13K competition. Most of the space is wasted on textures (~8kb), followed by the games code (~4kb). Music takes up the least space after compression (~1kb).

Interesting findings: 
- A single png image compresses better than multiple small ones (relatively unsiprising)
- The image compression improved, when all sprites were arranged in a square, instad of a rectangle, even though the total pixel count barely changed
- A well minified code with lots of redundancy compressed better than a 10% smaller minification using eval statements, but had less redundancy