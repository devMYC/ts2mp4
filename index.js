'use strict'

const fs = require('fs')
const logger = require('log4js').getLogger()
const mime = require('mime')
const path = require('path')
const { spawn } = require('child_process')

const args = process.argv

if (args.length < 4) {
  logger.warn('Videos directory and ffmpeg path are required')
  process.exit(0)
}

const [ dir, ffmpeg, rmOriginal ] = args.length === 4 ? args.slice(-2) : args.slice(-3)
let files

if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
  files = fs.readdirSync(dir)
} else {
  logger.warn('No such directory:', dir)
  process.exit(0)
}

if (!fs.existsSync(ffmpeg)) {
  logger.warn('Can not find:', ffmpeg)
  process.exit(0)
} else if (!fs.statSync(ffmpeg).isFile()) {
  logger.warn(`${ffmpeg} is not a file`)
  process.exit(0)
}

files
  .filter(file => mime.lookup(path.join(dir, file)) === 'video/mp2t')
  .map(file => path.join(dir, file))
  .reduce((chain, file) =>
    chain.then(_ => {
      return new Promise(resolve => {
        const convert = spawn(ffmpeg, [
          '-i',
          file,
          '-strict',
          '-2',
          '-bsf:a',
          'aac_adtstoasc',
          '-vcodec',
          'copy',
          /\.ts$/.test(file) ? file.replace('.ts', '.mp4') : `${file}.mp4`
        ])

        convert.stderr.on('data', data => {
          logger.debug(data.toString())
        })

        convert.on('close', code => {
          logger.debug(`${file} conversion process exited with code ${code}`)
          rmOriginal === 'yes' && fs.unlinkSync(file)
          resolve(0)
        })
      })
    })
  , Promise.resolve(0))
