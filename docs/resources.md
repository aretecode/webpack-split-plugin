# example
http://stackoverflow.com/questions/38534624/split-vendor-libraries-into-multiple-chunks-with-webpack

# src/module
https://github.com/webpack/webpack/blob/f4f2b60408f185755dd8099f658a1431f52cc746/lib/MultiModule.js
https://github.com/webpack/webpack/blob/master/lib/NormalModule.js


# articles
https://jeremygayed.com/dynamic-vendor-bundling-in-webpack-528993e48aab
https://survivejs.com/webpack/building/bundle-splitting/
https://survivejs.com/webpack/building/bundle-splitting/#performing-a-more-granular-split
http://stackoverflow.com/questions/37408873/delete-or-not-create-a-file-for-each-entry-in-webpack/39401288#39401288
https://github.com/webpack/webpack/issues/1967
https://www.npmjs.com/package/on-build-webpack


# plugins
// calls plugins
https://github.com/webpack/webpack/blob/85dc98f17aa39d5d3337e3791bf25634a1f7e445/lib/Compilation.js

// existing plugin that almost does it
https://github.com/webpack/webpack/blob/cd1cd29fba46bd0133db0ca89acbe6c6c0240323/lib/optimize/CommonsChunkPlugin.js

// since it emitts for each asset...
https://github.com/webpack/webpack/blob/85dc98f17aa39d5d3337e3791bf25634a1f7e445/lib/ProgressPlugin.js

// reading data
https://github.com/webpack/docs/wiki/how-to-write-a-plugin#exploring-assets-chunks-modules-and-dependencies
https://github.com/webpack/docs/wiki/plugins

# src
https://github.com/webpack/webpack/blob/master/lib/Chunk.js

// WHAT IS THIS EVEN
https://github.com/webpack/webpack/blob/028c51301733836abbedc88be7483af2623f5943/lib/ModuleReason.js

--------

### todo
- [ ] lint
- [ ] editorconfig
- [ ] travis
- [ ] npm package
- [ ] split out
- [ ] see Chunker
- [ ] see CodeSplitter
- [ ] see webpack.config.js
