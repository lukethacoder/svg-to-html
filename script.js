import _fs from 'fs'
import { rehype } from 'rehype'
import rehypeStringify from 'rehype-stringify'
import rehypeRewrite from 'rehype-rewrite'

const fs = _fs.promises

const FILE_PREFIX = 'icon-'

const EXTRA_PROPERTIES_TO_ADD = {
  onclick: '{_handleClick}',
  // add extra properties here
}

main()

async function writeHtmlFile(fileName, fileContents) {
  fs.writeFile(`${process.cwd()}/html/${fileName}.html`, fileContents)
}

async function main() {
  const sourceFolder = await fs.readdir(`${process.cwd()}\\svgs`)

  console.log(`Reading ${sourceFolder.length} files from source folder.`)

  await Promise.all(
    sourceFolder.map(async (item) => {
      const svgFile = await fs.readFile(`${process.cwd()}\\svgs\\${item}`)

      const htmlFile = await rehype()
        .data('settings', { fragment: true })
        .use(rehypeRewrite, {
          rewrite: (node) => {
            if (node.tagName == 'svg') {
              node.properties = {
                ...node.properties,
                ...EXTRA_PROPERTIES_TO_ADD,
              }
            }
          },
        })
        .use(rehypeStringify)
        .process(svgFile.toString())

      // Drops the extra `"` around the functions above
      const withFixes = Object.keys(EXTRA_PROPERTIES_TO_ADD).reduce(
        (acc, item) => {
          return acc.replace(
            `"${EXTRA_PROPERTIES_TO_ADD[item]}"`,
            EXTRA_PROPERTIES_TO_ADD[item]
          )
        },
        String(htmlFile)
      )

      await writeHtmlFile(
        `${FILE_PREFIX}${item.replace('.svg', '')}`,
        `<template>${withFixes}</template>`
      )
    })
  )
}
