function testHasRecord(){
    const testValue = 'aaa';
    
    Logger.log(envs);

    Logger.log(`hasRecord : ${hasRecord(testValue)}`)

}

function testConv(){
    const item = {
        'ファイル名' : 'aaa',
        'テキストボックス' : 'example',
        'ラジオボタン' : '1'
    }
    const schema = getAppScheme();

    Logger.log({schema, item});
    Logger.log(`conv4update : ${JSON.stringify(conv4update(item, schema), null, '   ')}`);
    Logger.log(`conv4create : ${JSON.stringify(conv4create(item, schema), null, '   ')}`);
}

function testUpdate(){
    const item = {
        'ファイル名' : 'aaa',
        'テキストボックス' : 'example',
        'ラジオボタン' : 'sample1'
    }
    const schema = getAppScheme();

    Logger.log({schema, item});
    Logger.log(`conv4update : ${JSON.stringify(conv4update(item, schema), null, '   ')}`);
    Logger.log(`conv4create : ${JSON.stringify(conv4create(item, schema), null, '   ')}`);
}


