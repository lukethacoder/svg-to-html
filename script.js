import _fs from 'fs'
import { rehype } from 'rehype'
import rehypeStringify from 'rehype-stringify'
import rehypeRewrite from 'rehype-rewrite'
import slugify from 'slugify'

const fs = _fs.promises

const FILE_PREFIX = 'icon-'

const EXTRA_PROPERTIES_TO_ADD = {
  onclick: '{_handleClick}',
  // add extra properties here
}

const SLUGIFY_CONFIG = {
  replacement: '_',
  strict: true,
}

main()

async function writeFile(fileName, fileContents, extension = 'html') {
  fs.writeFile(
    `${process.cwd()}${
      extension === 'html' ? '/html' : ''
    }/${fileName}.${extension}`,
    fileContents
  )
}

async function main() {
  const sourceFolder = await fs.readdir(`${process.cwd()}\\svgs`)

  console.log(`Reading ${sourceFolder.length} files from source folder.`)

  const fileNames = []

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

      await writeFile(
        `${FILE_PREFIX}${item.replace('.svg', '')}`,
        `<template>${withFixes}</template>`
      )

      fileNames.push(item)
    })
  )

  const javascriptFile = fileNames.reduce(
    (acc, item) => {
      const fileNameWithoutExtension = item.replace('.svg', '')
      return {
        imports: [
          ...acc.imports,
          `import _${slugify(
            fileNameWithoutExtension,
            SLUGIFY_CONFIG
          )} from './${FILE_PREFIX}${fileNameWithoutExtension}.html'`,
        ],
        object: [
          ...acc.object,
          `'${fileNameWithoutExtension}': _${slugify(
            fileNameWithoutExtension,
            SLUGIFY_CONFIG
          )}`,
        ],
      }
    },
    {
      imports: [],
      object: [],
    }
  )

  const fileString = `
${javascriptFile.imports.join('\n')}

export const ICONS = {
${javascriptFile.object.join(',\n')}
}
  `

  await writeFile(`icons`, fileString, 'js')
}
