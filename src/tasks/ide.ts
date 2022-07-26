import { LisaType, job } from '../utils/lisa_ex';
import { join } from 'path';
import {
     copy, writeFile, readJson, pathExists
} from 'fs-extra';



export default ({ application, cli }: LisaType) => {
    job('ide', {
        title: '生成vscode 配置文件',
        async task(ctx, task) {
            //查看现有的.vscode 文件夹
            //如果有  追加launch.json
            //覆盖文件
            const targetDir = join(process.cwd(), '.vscode');
            const formDir = join(__dirname, '..', '..', 'vscode','csk6');
            const Launchfile = join(targetDir, 'launch.json');
            const newLaunchfile = join(formDir, 'launch.json');
            cli.action.start('正在为您生成vscode 配置文件')
            if (await pathExists(Launchfile)) {
                //原来那份
                const launchJson = await readJson(Launchfile)
                const NewlaunchJson = await readJson(newLaunchfile)
                await copy(formDir, targetDir)
                const configurations = launchJson.configurations || []
                launchJson.configurations = configurations.concat(NewlaunchJson.configurations)
                await writeFile(Launchfile, JSON.stringify(launchJson, null, "\t"));
            } else {
                await copy(formDir, targetDir)
            }
            cli.action.start('vscode 配置文件生成完毕')
        },

    });
}
