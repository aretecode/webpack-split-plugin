
# props

#### debug

> used to set debug output from the plugin, default false, though it is quite pretty

`'verbose' | 'spinner' | false`

#### names  

> as with commonchunks plugin, there are some options

can use any or all of the following:
- name: string
- names: string[]
- filename: this the name template, used to keep splitting unique when needed

-----

## custom

operates in order of specificity, most specific first, most general last.

available as shorthand `splits`

#### splits

```js
const {custom} = require('webpack-split-plugin')

custom.splits({
  igloo: [file => (/plx/).test(file)],
  eh: ['moment'],
  react: ['react'],
  moose: [/noop/],
  canada: ['src/*.js'],
}),
```

#### split (chain)
```js
const {custom} = require('webpack-split-plugin')

custom: custom
  .split('css')
  .test(['css*'])
  .onMatch((file, splitter) => {
    splitter.setCurrent('css').getCurrentGroup().add(file)
  })
  .split('material')
  .test(['material-*'])
  .onMatch((file, splitter) => {
    splitter.setCurrent('material').getCurrentGroup().add(file)
  })
  .split('vendor')
  .test([/react/, x => x.filename.includes('node_modules')])
  .onMatch((file, splitter) => {
    splitter.setCurrent('vendor').getCurrentGroup().add(file)
  })
  // passing in no `onMatch` callback
  // will do what is done in the above ^ by default
  .split('js')
  .test(['*.js'])
  .end(),
```

#### obj
```js
const {match} = require('webpack-split-plugin')

const customObj = {
  override: {
    next() {},
    getCurrentGroup(splitter) {
      return splitter.current
    },
    handle(file, splitter) {
      // splitter.group()
      // -> name
      splitter.addGroupIfEmpty('css')
      splitter.addGroupIfEmpty('babs')
      splitter.addGroupIfEmpty('js')
      splitter.addGroupIfEmpty('material')
      const content = file.content

      const isStyle =
        (/css|sass|scss/).test(file.filename) || content.includes('yellow')
      const isBabel = (/babel/).test(file.filename)

      const isMaterial = match
        .input(file.filename)
        .pattern('material-*')
        .isMatch()

      if (isMaterial) {
        log.yellow('IS material ' + file.filename).data().echo()
        splitter.setCurrent('material')
      } else if (isStyle) {
        log
          .magenta('IS styles ' + file.filename)
          .data(file.filename.includes('css'))
          .echo(echo)

        splitter.setCurrent('css')
        // splitter.setCurrent(groups.css)
      } else if (isBabel) {
        log
          .bold('IS BABS ' + file.filename)
          .data(file.filename.includes('css'))
          .echo(echo)

        splitter.setCurrent('babs') // groups.babs
      } else {
        log
          .cyan('js... ' + file.filename)
          .data(file.filename.includes('css'))
          .echo(echo)

        // splitter.addGroupIfEmpty('js')
        // splitter.current = splitter.get('js')

        splitter.setCurrent('js') // groups.js
        // splitter.tap('group', group => 2)
        // splitter.group()
      }

      splitter.getCurrentGroup().add(file)
      return splitter
    },
    // start() {},
    // done() {},
  },
  // call this when events happen
  events: {},
}
```
