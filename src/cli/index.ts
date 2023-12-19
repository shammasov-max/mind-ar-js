#!/usr/bin/env -S ts-node --transpile-only --swc
import { program } from '@commander-js/extra-typings';
import { OfflineCompiler } from '../image-target/offline-compiler.js';
import * as Path from 'path'
import { writeFile,readFile } from 'fs/promises'
import { loadImage } from 'canvas';
import {init} from "ramda";
import {compressDataList} from "../image-target/compiler-base";

const getFileBase = (filePath: string) => init(filePath.split('.')).join('.')
const fileForImage = (ext: string) => (filePath: string) => getFileBase(filePath) + ext
const loadImageFiles = (files: string[]) => Promise.all(files.map( f=> loadImage(f)))

const getIOPaths = ({files, path}:{files: string[], path?: string}) => {

    const fullFiles =  files.map(f => Path.join(path, f))     // command-arguments and options are fully typed
    const outputFile = Path.join(path, 'target.mind')
}

const recompileFiles = async (files: string[], output: string) => {
    const images = await loadImageFiles(files)
    const compiler = new OfflineCompiler();
    await compiler.compileImageTargets(images, console.log);
    const buffer = compiler.exportData();
    await writeFile(output, buffer);
}

const composeMindFiles = async (files: string[], output: string) => {
    const compilers = await Promise.all(files.map( async file => {
            const compiler = new OfflineCompiler()
             compiler.attachMindData(await readFile(file))
            return compiler
        }
    ))
    const result = new OfflineCompiler()
    compilers.forEach(c => result.attachMindData(c.exportData()))
    const buffer = result.exportData();
    await writeFile(output, buffer)
}

const convertFilesWithSingleCompiler = async (files: string[]) => {
    const images = await loadImageFiles(files);
    const compiler = new OfflineCompiler();
    await compiler.compileImageTargets(images, console.log);
    const dataList = compiler.getDataList()
    await Promise.all(
        dataList.map( async (data,i) =>
            await writeFile(fileForImage('-single.mind')(files[i]),compressDataList([data])
            )
        )
    )
}
const convertFilesWithManyCompilers = async (files: string[]) => {
    const images = await loadImageFiles(files);

    await Promise.all(
        images.map( async (image,i) => {
            const compiler = new OfflineCompiler();
            await compiler.compileImageTargets([image], console.log);
            const dataList = compiler.getDataList()
           return  await writeFile(fileForImage('.mind')(files[i]), compressDataList(dataList))

        })
    )
}



program.command('convert-to-minds <files...>')
    .addHelpText('afterAll',`ts-node ./src/cli/index.ts compile -p ./convert-to-minds    ./1.jpg 2.jpg 3.jpg`)
    .option('-s, --single-compiler', 'Использовать один компеилятор последовательно для всех картинок')
    .requiredOption('-p, --path <string>', 'title to use before name')
    .description(`Конвертирует изображения в mind файлы, результаты размещаются рядом с изображениями, названиеФайла.mind`)
    .action(async (files, {path = '', singleCompiler}) => {
        console.log('files',files)
        console.log({path,singleCompiler})
        const imgs = files.map(f => Path.join(path, f))
        singleCompiler
            ? await convertFilesWithSingleCompiler(imgs)
            : await convertFilesWithManyCompilers(imgs)
        // command-arguments and options are fully typed
    });


program.command('build <files...>')
    .addHelpText('afterAll',`ts-node ./src/cli/index.ts build -p ./images    ./1.mind 2.mind 3.mind`)
    .option('-o, --output <string>','Название результирующего файла','target.mind')
    .requiredOption('-p, --path <string>', 'Базовый путь для сбора mind файлов, и папка для результирующего target.mind файла')
    .description(`Объёдиняет данные из mind файлов в один`)
    .action(async (files, {path, output}) => {

        const fullFiles =  files.map(f => Path.join(path, f))     // command-arguments and options are fully typed
        const outputFile = Path.join(path, output)
        await composeMindFiles(fullFiles, outputFile)
    });


program.command('compile-from-scratch <files...>')
    .addHelpText('afterAll',`ts-node ./src/cli/index.ts compile -p ./compile-from-scratch   ./1.jpg 2.jpg 3.jpg`)
    .option('-o, --output <string>','Название результирующего файла','target.mind')
    .requiredOption('-p, --path <basePath>', 'Базовый путь для чтения файлов изображений. mind файлов, и папка для результирующего target.mind файла')
    .description(`С нуля конвертирует все изображения по порядку. в один mind файл`)
    .action(async (files, {path='', output}) => {
        const fullFiles =  files.map(f => Path.join(path, f))     // command-arguments and options are fully typed
        const outputFile = Path.join(path, output)
        await recompileFiles(fullFiles,outputFile)
        // command-arguments and options are fully typed
    });
program.parse()
