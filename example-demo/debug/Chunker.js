const log = require('fliplog')
const CollectionManager = require('./ChunkSplitter')
const Cleaner = require('./cleaner')

const collection = new CollectionManager()
let nextIdent = 0

/**
 * @see https://github.com/webpack/webpack/blob/cd1cd29fba46bd0133db0ca89acbe6c6c0240323/lib/optimize/CommonsChunkPlugin.js
 * @TODO
 * - [ ] NEEDS ASYNC
 * - [ ] finish this
 * - [ ] needs merge with CollectionManager
 * - [ ] needs to be split out of the example demo
 * - [ ] setup debug config *levels*
 * - [ ] see todos in .apply
 * - [ ] need to add runtime to the chunks
 *
 *
 * ------
 * in (non-async chunking) CommonChunksPlugin
 *  seems to take the runtime out of the entry
 *  and put it into the chunk
 *  then load the chunk first
 */
class SpecificChunkPlugin {
  constructor(options) {
    this.ident = __filename + nextIdent++
  }

  apply(compiler) {
    // ------------------------------------------------------------
    compiler.plugin('this-compilation', compilation => {
      // this will happen for each file
      compilation.plugin(['build-module'], module => {
        collection.handle(module)
        // @TODO @FIXME @HACK remove this, just for debugging the output
        // let timeout = 0
        // clearTimeout(timeout)
        // timeout = setTimeout(() => {
        //   log.verbose(1000).data(collection).bold('dun').exit()
        // }, 1000)
        // log.verbose(1).data(Object.keys(module)).bold('build it ').echo()
        // log.verbose(1).data(deps).bold('build it ').echo()
        // log.verbose(1).data(module).bold('build it ').echo()
      })

      // this will happen when we are all done!
      compilation.plugin(
        ['optimize-chunks', 'optimize-extracted-chunks'],
        chunks => {
          // only optimize once
          if (compilation[this.ident]) return
          compilation[this.ident] = true
          collection.complete()

          // @TODO should be more dynamic
          const chunk1 = compilation.addChunk('chunk1')
          chunk1.filenameTemplate = 'chunk1.js'

          // const chunk2 = compilation.addChunk('chunk2')
          // chunk2.filenameTemplate = 'chunk2.js'

          // @TODO - careful:
          //  should be more careful with this,
          //  like check .entryPoints.length
          const entryModule = chunks[0]
          const entryChunks = chunks.filter(
            chunk => chunk.isInitial() || chunk.hasEntryModule()
          )[0] // shouldn't be [0]
          const entryChunk = entryChunks

          const groups = collection.getCollections()
          const group1 = groups[1].concat(groups[0])
          const group2 = groups[0]
          const usedChunks = [entryChunk] // [entryChunk, chunk1] // [chunk1, chunk2]

          // this is so we can remove grouped chunks from entry point
          // map groups to get back modules
          // map modules to userRequest, to simplify filtering entries
          // flatten
          const filenames = [].concat(
            ...groups.map(group => group.map(file => file.filename))
          )

          // log.verbose(2).data({ groups }).echo()
          // log.verbose(2).data({ group1 }).echo()

          // @see @todo above with dynamic
          group1.forEach(file => {
            const module = file.module
            log.red('REMOVING MODULE').data(file.filename).echo()

            chunk1.addModule(module)
            module.addChunk(chunk1)
            entryChunks.removeModule(module)
          })
          const targetChunk = chunk1
          // group2.forEach(file => {
          //   const module = file.module
          //   chunk2.addModule(module)
          //   module.addChunk(chunk2)
          //   entryChunks.removeModule(module)
          // })

          log
            .blue('length of modules before filter:')
            .data(entryModule.modules.length)
            .echo()
            .green('all filenames:')
            .verbose(500)
            .data(filenames)
            .echo(false)

          // SO THE DIFF IS IT ISN'T BEING EXTRACTED NOW WITH JUST A COUPLE DEPS
          // this.debug(usedChunks)

          // looping `chunks` here will do infinite loop
          const commonChunk = chunk1
          for (let chunk of usedChunks) {
            // set commonChunk as new sole parent
            chunk.parents = [commonChunk] // WAS THIS

            // THIS IS WRONG, IF LOOPING OVER USED CHUNKS
            // THEN USED IS INDEX AND INDEX HAVING PARENT INDEX
            // IS WHY IT WAS INFINITE
            // chunk.parents = [entryChunks]

            // only works for async chunks?
            // chunks.addParent(entryChunks)

            // only works for other chunks? or modules?
            // entryChunks.insertChunk(chunk)
            //
            // throws error with `no before chunk found`
            // position 1 is undefined
            // entryChunks.entrypoints[0].insertChunk(chunk)

            // add chunk to commonChunk
            // commonChunk.addChunk(chunk) // WAS THIS
            entryChunks.addChunk(commonChunk)

            // is already done earlier?
            // targetChunk.addChunk(chunk)
            // if (!targetChunk.chunks.includes(chunk)) {
            //   targetChunk.addChunk(chunk)
            // }

            let inserted = []
            // const stringify = require('javascript-stringify')
            // this.debug(chunk.entrypoints.length)
            // @TODO
            for (let entrypoint of chunk.entrypoints) {
              // hash it so only once
              // @TODO @HACK should be better than this
              // const hash = stringify({ targetChunk, entrypoint })
              const hash = { targetChunk, entrypoint }
              if (inserted.indexOf(hash) > -1) {
                console.log('CONTINUED YAY')
                throw new Error('ugh')
                continue
              }
              // if (inserted.length) {
              //   continue
              // }

              // this.debug(entrypoint)
              entrypoint.insertChunk(targetChunk, chunk)

              // to not add it twice
              inserted.push(hash)
              // this.debug(inserted)

              log
                .bold('adding entrypoints, inserting chunk')
                .verbose(5)
                .data({
                  parents: chunk.parents,
                  entrypoints: chunk.entrypoints,
                })
                .echo()
            }
            // for (let chunk of usedChunks) {
            //   // set targetChunk as new sole parent
            //   chunk.parents = [targetChunk]
            //   // add chunk to targetChunk
            //   targetChunk.addChunk(chunk)
            //
            //   for (let entrypoint of chunk.entrypoints) {
            //     entrypoint.insertChunk(targetChunk, chunk)
            //   }
            //   log
            //     .verbose(5)
            //     .data({
            //       parents: chunk.parents,
            //       entrypoints: chunk.entrypoints,
            //     })
            //     .echo()
            // }

            // log
            //   .verbose(4)
            //   .bold('looping usedChunks')
            //   .data({ parents: chunk.parents, entrypoints: chunk.entrypoints })
            //   .echo()
          }

          // for (let chunk of usedChunks) {
          //   for (let block of chunk.blocks) {
          //     block.chunks.unshift(chunk2)
          //     chunk2.addBlock(block)
          //   }
          // }

          // console.log('wut')
          // doing this after adding 2 chunks understandably shows 3
          // defaults to 1 if calling before doing so
          // doing this after updating chunks understandably shows not empty
          const queried = chunks.map(chunk => {
            return {
              isInitial: chunk.isInitial(),
              hasRuntime: chunk.hasRuntime(),
              hasEntryModule: chunk.hasEntryModule(),
              isEmpty: chunk.isEmpty(),
              modulesSize: chunk.modulesSize(),
              str: chunk.toString(),
              name: chunk.name,
              // origins: chunk.origins,
            }
          })

          // log.verbose(100).data({ queried }).exit()

          // this.extractModulesAndReturnAffectedChunks()

          // @TODO better way?:
          // is this the best way?
          // should call .removeModule from all entry points??
          // ENSURE INTEGRITY OF ALL MODULE REFERENCES IN ENTRY
          // entryModule.modules = entryModule.modules.filter(entryChunk => {
          //   const request = entryChunk.userRequest
          //
          //   // undefined on entry chunk
          //   log
          //     .dim('request: ' + request)
          //     .data(filenames.includes(request))
          //     .echo()
          //
          //   return !filenames.includes(request)
          // })

          log.bold('after:').data(entryModule.modules.length).echo()

          // remove all the modules from memory
          // collection.collections.clear()

          // log.verbose(3).data({ chunks }).exit()
          log.verbose(2).data(chunks).bold('chunk it ' + this.ident).echo()
          return true

          // ------------------------------------------------------------
        }
      )
    })
  }

  debug(chunks) {
    // this is blacklist, we also want to do whitelist
    // we'd like to keep `module`, `chunk`, `parnet`
    const cleanedChunks = Cleaner.init(chunks)
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

    // log.verbose(100).data({ chunks }).exit()
    log.verbose(100).data({ cleanedChunks }).exit()
    // log.verbose(100).data({ cleanedChunks, chunks }).exit()
    // log.verbose(1).data({ cleanedChunks, chunks }).exit()
  }

  extractModulesAndReturnAffectedChunks(reallyUsedModules, usedChunks) {
    return reallyUsedModules.reduce((affectedChunksSet, module) => {
      for (let chunk of usedChunks) {
        // removeChunk returns true if the chunk was contained and succesfully removed
        // false if the module did not have a connection to the chunk in question
        if (module.removeChunk(chunk)) {
          affectedChunksSet.add(chunk)
        }
      }
      return affectedChunksSet
    }, new Set())
  }
}

module.exports = SpecificChunkPlugin
