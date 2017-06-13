const log = require('fliplog')

module.exports = chunks => {
  // this is blacklist, we also want to do whitelist
  // we'd like to keep `module`, `chunk`, `parnet`
  const cleanedChunks = log
    .cleaner(true)
    .obj(chunks)
    // .debug()
    .keys([
      /parser/,
      /loc/,
      /range/,
      /dependencies/,
      /dependenciesWarnings/,
      /strict/,
      /debug/,
      /loaders/,
      /assets/,
      /meta/,
      /warnings/,
      /used/,
      /rawRequest/,
      /resource/,
      /contextDependencies/,
      /_source/,
      /built/,
      /cachedSource/,
      /issuer/,
      /index/,
      /index2/,
      /id/,
      /portableId/,
      /lastId/,
      /cacheable/,
      /building/,
      /depth/,
      /buildTimestamp/,
      /optional/,
      /errors/,
      /variables/,
      /rendered/,
      /error/,
      /__NormalModuleFactoryCache/,
    ])
    .clean()

  log.verbose(100).data({cleanedChunks}).exit()
}
