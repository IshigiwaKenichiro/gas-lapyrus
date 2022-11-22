/**
 * @typedef {{
 *  label : string; 
 *  code : string; 
 *  type : string; 
 *  parent : string | null;
 *  options : {
 *      label : string;
 *      index : number;
 *  }[];
 * }} Field
 */


/**
 * kintoneに関するメモ項目
 */
const UPDATED_PROP = '$$$kintone_updated';

/**
 * kintoneに関するメモ項目の、連携済みの時の値。
 */
const UPDATED_VAL = '連携済み';


/**
 * メイン関数
 */
function main() {

    _checkInitiation();

    const rng = SpreadsheetApp.getActive().getDataRange();

    let data = _rng2json(rng);

    const schema = getAppScheme();

    const cMax = rng.getLastColumn();

    for (let i in data) {
        const item = data[i];
        const r = Number(i) + 2;
        const keyValue = item['ファイル名']

        //連携済みの場合無視する。
        if (item[UPDATED_PROP] == UPDATED_VAL) continue;

        if (hasRecord(keyValue)) {
            _cyfetch({
                app: envs.app,
                record: conv4update(item, schema),
                updateKey: {
                    field: envs.idField,
                    value: item['ファイル名']
                }
            }, 'PUT', '/k/v1/record.json');
        } else {
            _cyfetch({
                app: envs.app,
                record: conv4create(item, schema)
            }, 'POST', '/k/v1/record.json');
        }
        rng.getCell(r, cMax).setValue(UPDATED_VAL);
    }

}


/**
 * DataRangeをRecord形式のデータとして取り出す。
 * @param {GoogleAppsScript.Spreadsheet.Range} rng 
 * @returns {{[key : string] : string}[]}
 */
function _rng2json(rng) {
    const rMax = rng.getLastRow();
    const cMax = rng.getLastColumn();


    const props = [];
    const data = [];

    for (let c = 1; c <= cMax; c++) {
        const name = rng.getCell(1, c).getValue();
        if (0 == name.length) continue;
        props.push(name);
    }

    for (let r = 2; r <= rMax; r++) {
        const rowData = {}
        for (let c = 1; c <= cMax; c++) {
            rowData[props[c - 1]] = rng.getCell(r, c).getValue()
        }

        data.push(rowData);
    }

    return data
}

/**
 * kintoneに関するメモ項目がない場合作成。
 */
function _checkInitiation() {
    const rng = SpreadsheetApp.getActive().getDataRange();

    const cMax = rng.getLastColumn();

    //kintone連携済み
    const updated = rng.getCell(1, cMax).getValue();

    Logger.log(updated);

    if (updated != UPDATED_PROP) {
        SpreadsheetApp.getActiveSheet().getRange(1, cMax + 1).setValue(UPDATED_PROP)
    }
}

function hasRecord(keyValue) {
    //kintone側にデータがあるか確認する。
    const kRecs = _cyfetch({
        app: envs.app,
        query: `${envs.idField} = "${keyValue}"`,
        fields: ["$id"]
    }, 'GET', '/k/v1/records.json');


    return kRecs.records.length > 0
}


/**
 * APIへアクセスする
 * @param {any} data 
 * @param {string} method 
 * @param {string} path 
 * @returns {any} パース済みJSON
 */
function _cyfetch(data, method, path) {
    const headers = {
        'authorization': `Basic ${Utilities.base64Encode(envs.basic)}`,
        // 'x-cybozu-authorization': Utilities.base64Encode(user),
        'x-cybozu-api-token': envs.apiToken,
        'x-http-method-override': method,
        'content-type': 'application/json'
    };
    const options = {
        "headers": headers,
        "Content-Type": "application/json",
        "method": "post",
        "payload": JSON.stringify(data)
    };

    Logger.log({ data, method, path });

    const resp = UrlFetchApp.fetch(`https://${envs.domain}${path}`, options);

    Logger.log(resp);

    const content = resp.getContentText();

    return JSON.parse(content);
}

/**
 * アプリの構造情報を取得する。
 * @returns 
 */
function getAppScheme() {

    const json = _cyfetch({ app: envs.app }, 'GET', '/k/v1/app/form/fields.json');

    /**@type {Field[]}*/
    const fields = [];

    function readField(field, uber) {
        if (field.type == 'SUBTABLE') {
            Object.values(field.fields).forEach(_field => readField(_field, field.code));
        } else {
            fields.push({
                label: field.label,
                code: field.code,
                type: field.type,
                parent: uber,
                options: Object.values(field.options ?? {})
            })
        }
    }

    Object.values(json.properties).forEach(field => readField(field, null));

    fields.sort((f1, f2) => f1.code.localeCompare(f2.code));

    fields.forEach(f => f.options.sort((o1, o2) => Number(o1.index) - Number(o2.index)));

    return fields;
}

/**
 * 
 * @param {any} item 
 * @param {Field[]} schema 
 */
function conv4create(item, schema) {

    const data = {};

    Object.entries(item).forEach(([key, value]) => {
        const field = schema.find(schema => schema.code == key);

        if (null == field) return;


        conv(data, field.code, value, field);
    })

    data[envs.idField] = {
        value: item['ファイル名']
    }

    return data;

}


/**
 * 
 * @param {any} item 
 * @param {Field[]} schema 
 */
function conv4update(item, schema) {

    const data = {};

    Object.entries(item).forEach(([key, value]) => {
        const field = schema.find(schema => schema.code == key);

        if (null == field || envs.idField == field.code) {
            return;
        }

        conv(data, field.code, value, field);

    })

    return data;

}

/**
 * LapyrusのGSからkintoneへのレコード変換。
 * @param {any} accData このデータを作りこむ
 * @param {string} itemCode GS側のラベル。1行目
 * @param {string} itemValue GS側の値。
 * @param {Field} field kintoneのフィールド
 */
function conv(accData, itemCode, itemValue, field) {
    if (["SINGLE_LINE_TEXT", 'NUMBER'].includes(field.type)) {
        accData[itemCode] = { value: itemValue };
    }

    if(["RADIO_BUTTON"].includes(field.type)){
        accData[itemCode] = {
            value : field.options[Number(itemValue) - 1]?.label
        }
    }
}