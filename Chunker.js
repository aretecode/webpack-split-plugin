const log = require('fliplog')
const CollectionManager = require('./ChunkSplitter')
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
 */
class SpecificChunkPlugin {
  constructor(options) {
    const normalizedOptions = this.normalizeOptions(options)

    this.chunkNames = normalizedOptions.chunkNames
    this.filenameTemplate = normalizedOptions.filenameTemplate
    this.minChunks = normalizedOptions.minChunks
    this.selectedChunks = normalizedOptions.selectedChunks
    this.children = normalizedOptions.children
    this.async = normalizedOptions.async
    this.minSize = normalizedOptions.minSize
    this.ident = __filename + nextIdent++
  }

  normalizeOptions(options) {
    if (Array.isArray(options)) {
      return {
        chunkNames: options,
      }
    }

    if (typeof options === 'string') {
      return {
        chunkNames: [options],
      }
    }

    // options.children and options.chunk may not be used together
    if (options.children && options.chunks) {
      throw new Error(
        'You can\'t and it does not make any sense to use "children" and "chunk" options together.'
      )
    }

    /**
		 * options.async and options.filename are also not possible together
		 * as filename specifies how the chunk is called but "async" implies
		 * that webpack will take care of loading this file.
		 */
    if (options.async && options.filename) {
      throw new Error(
        `You can not specify a filename if you use the \"async\" option.
You can however specify the name of the async chunk by passing the desired string as the \"async\" option.`
      )
    }

    /**
		 * Make sure this is either an array or undefined.
		 * "name" can be a string and
		 * "names" a string or an array
		 */
    const chunkNames = options.name || options.names
      ? [].concat(options.name || options.names)
      : undefined
    return {
      chunkNames: chunkNames,
      filenameTemplate: options.filename,
      minChunks: options.minChunks,
      selectedChunks: options.chunks,
      children: options.children,
      async: options.async,
      minSize: options.minSize,
    }
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
          const chunk2 = compilation.addChunk('chunk2')
          const groups = collection.getCollections()
          const group1 = groups[0]
          const group2 = groups[1]

          // this is so we can remove grouped chunks from entry point
          // map groups to get back modules
          // map modules to userRequest, to simplify filtering entries
          // flatten
          const filenames = [].concat(
            ...groups.map(group => group.map(file => file.filename))
          )

          // @TODO - careful:
          //  should be more careful with this,
          //  like check .entryPoints.length
          const entryModule = chunks[0]

          log.verbose(2).data({ groups }).echo()

          // @see @todo above with dynamic
          group1.forEach(file => {
            const module = file.module
            chunk1.addModule(module)
            module.addChunk(chunk1)
          })
          group2.forEach(file => {
            const module = file.module
            chunk2.addModule(module)
            module.addChunk(chunk2)
          })

          log
            .blue('length of modules before filter:')
            .data(entryModule.modules.length)
            .echo()
            .green('all filenames:')
            .verbose(500)
            .data(filenames)
            .echo(false)

          // @TODO better way?:
          // is this the best way?
          // should call .removeModule from all entry points??
          // ENSURE INTEGRITY OF ALL MODULE REFERENCES IN ENTRY
          entryModule.modules = entryModule.modules.filter(entryChunk => {
            const request = entryChunk.userRequest

            // undefined on entry chunk
            log
              .dim('request: ' + request)
              .data(filenames.includes(request))
              .echo()

            return !filenames.includes(request)
          })

          log.bold('after:').data(entryModule.modules.length).echo()

          // remove all the modules from memory
          collection.collections.clear()

          // log.verbose(3).data({ chunks }).exit()
          log.verbose(2).data(chunks).bold('chunk it ' + this.ident).echo()
          return true

          // ------------------------------------------------------------

          /**
  				 * Creates a list of "common"" chunks based on the options.
  				 * The list is made up of preexisting or newly created chunks.
  				 * - If chunk has the name as specified in the chunkNames it is put in the list
  				 * - If no chunk with the name as given in chunkNames exists a new chunk is created and added to the list
  				 *
  				 * These chunks are the "targets" for extracted modules.
  				 */
          const targetChunks = this.getTargetChunks(
            chunks,
            compilation,
            this.chunkNames,
            this.children,
            this.async
          )

          // iterate over all our new chunks
          targetChunks.forEach((targetChunk, idx) => {
            /**
  					 * These chunks are subject to get "common" modules extracted and moved to the common chunk
  					 */
            const affectedChunks = this.getAffectedChunks(
              compilation,
              chunks,
              targetChunk,
              targetChunks,
              idx,
              this.selectedChunks,
              this.async,
              this.children
            )

            // bail if no chunk is affected
            if (!affectedChunks) {
              return
            }

            // If we are async create an async chunk now
            // override the "commonChunk" with the newly created async one and use it as commonChunk from now on
            let asyncChunk
            if (this.async) {
              asyncChunk = this.createAsyncChunk(
                compilation,
                this.async,
                targetChunk
              )
              targetChunk = asyncChunk
            }

            /**
  					 * Check which modules are "common" and could be extracted to a "common" chunk
  					 */
            const extractableModules = this.getExtractableModules(
              this.minChunks,
              affectedChunks,
              targetChunk
            )

            // If the minSize option is set check if the size extracted from the chunk is reached
            // else bail out here.
            // As all modules/commons are interlinked with each other, common modules would be extracted
            // if we reach this mark at a later common chunk. (quirky I guess).
            if (this.minSize) {
              const modulesSize = this.calculateModulesSize(extractableModules)
              // if too small, bail
              if (modulesSize < this.minSize) return
            }

            // Remove modules that are moved to commons chunk from their original chunks
            // return all chunks that are affected by having modules removed - we need them later (apparently)
            const chunksWithExtractedModules = this.extractModulesAndReturnAffectedChunks(
              extractableModules,
              affectedChunks
            )

            // connect all extracted modules with the common chunk
            this.addExtractedModulesToTargetChunk(
              targetChunk,
              extractableModules
            )

            // set filenameTemplate for chunk
            if (this.filenameTemplate)
              targetChunk.filenameTemplate = this.filenameTemplate

            // if we are async connect the blocks of the "reallyUsedChunk" - the ones that had modules removed -
            // with the commonChunk and get the origins for the asyncChunk (remember "asyncChunk === commonChunk" at this moment).
            // bail out
            if (this.async) {
              this.moveExtractedChunkBlocksToTargetChunk(
                chunksWithExtractedModules,
                targetChunk
              )
              asyncChunk.origins = this.extractOriginsOfChunksWithExtractedModules(
                chunksWithExtractedModules
              )
              return
            }

            // we are not in "async" mode
            // connect used chunks with commonChunk - shouldnt this be reallyUsedChunks here?
            this.makeTargetChunkParentOfAffectedChunks(
              affectedChunks,
              targetChunk
            )
          })
          return true
        }
      )
    })
  }

  getTargetChunks(allChunks, compilation, chunkNames, children, asyncOption) {
    const asyncOrNoSelectedChunk = children || asyncOption

    // we have specified chunk names
    if (chunkNames) {
      // map chunks by chunkName for quick access
      const allChunksNameMap = allChunks.reduce((map, chunk) => {
        if (chunk.name) {
          map.set(chunk.name, chunk)
        }
        return map
      }, new Map())

      // Ensure we have a chunk per specified chunk name.
      // Reuse existing chunks if possible
      return chunkNames.map(chunkName => {
        if (allChunksNameMap.has(chunkName)) {
          return allChunksNameMap.get(chunkName)
        }
        // add the filtered chunks to the compilation
        return compilation.addChunk(chunkName)
      })
    }

    // we dont have named chunks specified, so we just take all of them
    if (asyncOrNoSelectedChunk) {
      return allChunks.filter(chunk => !chunk.isInitial())
    }

    /**
		 * No chunk name(s) was specified nor is this an async/children commons chunk
		 */
    throw new Error(
      `You did not specify any valid target chunk settings.
Take a look at the "name"/"names" or async/children option.`
    )
  }

  getAffectedChunks(
    compilation,
    allChunks,
    targetChunk,
    targetChunks,
    currentIndex,
    selectedChunks,
    asyncOption,
    children
  ) {
    const asyncOrNoSelectedChunk = children || asyncOption

    if (Array.isArray(selectedChunks)) {
      return allChunks.filter(chunk => {
        const notCommmonChunk = chunk !== targetChunk
        const isSelectedChunk = selectedChunks.indexOf(chunk.name) > -1
        return notCommmonChunk && isSelectedChunk
      })
    }

    if (asyncOrNoSelectedChunk) {
      // nothing to do here
      if (!targetChunk.chunks) {
        return []
      }

      return targetChunk.chunks.filter(chunk => {
        // we can only move modules from this chunk if the "commonChunk" is the only parent
        return asyncOption || chunk.parents.length === 1
      })
    }

    /**
		 * past this point only entry chunks are allowed to become commonChunks
		 */
    if (targetChunk.parents.length > 0) {
      compilation.errors.push(
        new Error(
          "SpecificChunkPlugin: While running in normal mode it's not allowed to use a non-entry chunk (" +
            targetChunk.name +
            ')'
        )
      )
      return
    }

    /**
		 * If we find a "targetchunk" that is also a normal chunk (meaning it is probably specified as an entry)
		 * and the current target chunk comes after that and the found chunk has a runtime*
		 * make that chunk be an 'affected' chunk of the current target chunk.
		 *
		 * To understand what that means take a look at the "examples/chunkhash", this basically will
		 * result in the runtime to be extracted to the current target chunk.
		 *
		 * *runtime: the "runtime" is the "webpack"-block you may have seen in the bundles that resolves modules etc.
		 */
    return allChunks.filter(chunk => {
      const found = targetChunks.indexOf(chunk)
      if (found >= currentIndex) return false
      return chunk.hasRuntime()
    })
  }

  createAsyncChunk(compilation, asyncOption, targetChunk) {
    const asyncChunk = compilation.addChunk(
      typeof asyncOption === 'string' ? asyncOption : undefined
    )
    asyncChunk.chunkReason = 'async commons chunk'
    asyncChunk.extraAsync = true
    asyncChunk.addParent(targetChunk)
    targetChunk.addChunk(asyncChunk)
    return asyncChunk
  }

  // If minChunks is a function use that
  // otherwhise check if a module is used at least minChunks or 2 or usedChunks.length time
  getModuleFilter(minChunks, targetChunk, usedChunksLength) {
    if (typeof minChunks === 'function') {
      return minChunks
    }
    const minCount = minChunks || Math.max(2, usedChunksLength)
    const isUsedAtLeastMinTimes = (module, count) => count >= minCount
    return isUsedAtLeastMinTimes
  }

  getExtractableModules(minChunks, usedChunks, targetChunk) {
    if (minChunks === Infinity) {
      return []
    }

    // count how many chunks contain a module
    const commonModulesToCountMap = usedChunks.reduce((map, chunk) => {
      for (let module of chunk.modules) {
        const count = map.has(module) ? map.get(module) : 0
        map.set(module, count + 1)
      }
      return map
    }, new Map())

    // filter by minChunks
    const moduleFilterCount = this.getModuleFilter(
      minChunks,
      targetChunk,
      usedChunks.length
    )
    // filter by condition
    const moduleFilterCondition = (module, chunk) => {
      if (!module.chunkCondition) {
        return true
      }
      return module.chunkCondition(chunk)
    }

    return Array.from(commonModulesToCountMap)
      .filter(entry => {
        const module = entry[0]
        const count = entry[1]
        // if the module passes both filters, keep it.
        return (
          moduleFilterCount(module, count) &&
          moduleFilterCondition(module, targetChunk)
        )
      })
      .map(entry => entry[0])
  }

  calculateModulesSize(modules) {
    return modules.reduce((totalSize, module) => totalSize + module.size(), 0)
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

  addExtractedModulesToTargetChunk(chunk, modules) {
    for (let module of modules) {
      chunk.addModule(module)
      module.addChunk(chunk)
    }
  }

  makeTargetChunkParentOfAffectedChunks(usedChunks, commonChunk) {
    for (let chunk of usedChunks) {
      // set commonChunk as new sole parent
      chunk.parents = [commonChunk]
      // add chunk to commonChunk
      commonChunk.addChunk(chunk)

      for (let entrypoint of chunk.entrypoints) {
        entrypoint.insertChunk(commonChunk, chunk)
      }
    }
  }

  moveExtractedChunkBlocksToTargetChunk(chunks, targetChunk) {
    for (let chunk of chunks) {
      for (let block of chunk.blocks) {
        block.chunks.unshift(targetChunk)
        targetChunk.addBlock(block)
      }
    }
  }

  extractOriginsOfChunksWithExtractedModules(chunks) {
    const origins = []
    for (let chunk of chunks) {
      for (let origin of chunk.origins) {
        const newOrigin = Object.create(origin)
        newOrigin.reasons = (origin.reasons || []).concat('async commons')
        origins.push(newOrigin)
      }
    }
    return origins
  }
}

module.exports = SpecificChunkPlugin
