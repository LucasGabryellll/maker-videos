const fs = require('fs');
const contentFilePath = './content.json';

function save(content) {
    const contentString = JSON.stringify(content);//transforma o obj em uma String
    return fs.writeFileSync(contentFilePath, contentString);//salva de forma sincrona no contentFilePath
};

function load() {
    const fileBuffer = fs.readFileSync(contentFilePath, 'utf-8');//ler arquivo
    const contentJson = JSON.parse(fileBuffer);//transforma de volta em obj javaScript
    return contentJson;
};

module.exports = {
    save,
    load
};