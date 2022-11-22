const figlet = require("figlet");
const fs = require('fs-extra');
const rl = require('readline');
const cp = require('child_process');
const path = require('path');

/**
 * 標準入力を取得する
 */
const question = (question) => {

    const readlineInterface = rl.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        readlineInterface.question(question, (answer) => {
            resolve(answer);
            readlineInterface.close();
        });
    });
};

function write(fig) {
    return new Promise((res) => {
        figlet(fig, function (err, data) {
            console.log(data);
            res();
        });
    })
}

(async () => {

    await write("! LAPYRUS-KINTONE !")


    const domain = await question(`domain(like "sat.cybozu.com") = `);
    const basic = await question(`basic id:pass = `);
    const app = await question(`appId = `);
    const idField = await question(`apps idField(required & unique ) = `);
    const apiToken = await question(`apps apiToken = `);
    const scriptId = await question(`GAS's script_id : `)
    const needsClasp = await question(`needs clasp?  (global install y/N) : `);
    // console.log({ domain, basic, app, idField, apiToken });

    const ok = await question(`is it ok?(y/N) : `);

    if (ok.toLowerCase() != 'y') {
        return;
    }


    if (needsClasp.toLowerCase() == 'y') {
        cp.execSync(`npm i @google/clasp -g`, {
            stdio: 'inherit'
        });
    }


    cp.execSync(`clasp login`, {
        stdio: 'inherit'
    })

    if (!fs.existsSync("src")) {
        fs.mkdirSync('src')
    }

    const absPath = path.normalize(path.resolve('src'))

    cp.execSync(`clasp clone ${scriptId} --rootDir ${absPath}`);


    fs.copyFileSync(path.join(__dirname, '..', '.files/main.js'), 'src/main.js');
    fs.copyFileSync(path.join(__dirname, '..', '.files/main.test.js'), 'src/main.test.js');
    fs.writeFileSync('src/envs.js',
        `
const envs = ${JSON.stringify({ domain, basic, app, idField, apiToken }, null, '\t')}
`   );


    console.log("**** done. ****");

    console.log(`enjoy developing =b`);


})()


