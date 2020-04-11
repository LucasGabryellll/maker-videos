const fs = require('fs');
const contentFilePath = './content.json';
const scriptFilePath = './content/after-effects-script.js';

function save(content) {
    const contentString = JSON.stringify(content);//transforma o obj em uma String
    return fs.writeFileSync(contentFilePath, contentString);//salva de forma sincrona no contentFilePath
};

function saveScript(content) {
    const contentString = JSON.stringify(content);
    const scriptString = `var content = ${contentString}`;
    return fs.writeFileSync(scriptFilePath, scriptString);
};

function load() {
    const fileBuffer = fs.readFileSync(contentFilePath, 'utf-8');//ler arquivo
    const contentJson = JSON.parse(fileBuffer);//transforma de volta em obj javaScript
    return contentJson;
};

module.exports = {
    save,
    saveScript,
    load
};