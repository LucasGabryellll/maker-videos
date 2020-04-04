const algorithmia = require('algorithmia');
const algorithmiaApiKey = require('../credentials/algorithmia.json').apiKey;
const sentenceBoundaryDetection = require('sbd');

async function robot(content) {
    await fetchContentFromWikipedia(content);//Baixar conteúdo do Wikipedia
    sanitizeContent(content);//Limpar o conteúdo
    breakContentIntoSentences(content);//Separar em sentenças

    async function fetchContentFromWikipedia(content) {
        const algorithmiaAuthenticated = algorithmia(algorithmiaApiKey);
        
        const wikipediaAlgorithm = algorithmiaAuthenticated.algo('web/WikipediaParser/0.1.2');
        const WikipediaResponde = await wikipediaAlgorithm.pipe(content.searchTerm);//manda para o algoritmo do wikipedia e ele vai buscar no wikipedia oficial
        const wikipediaContent = WikipediaResponde.get();//resposta cai aqui dentro(conteudo do wikipedia)

        content.sourceContentOriginal = wikipediaContent.content;
    };

    function sanitizeContent(content) {
        const withoutBlankLinesAndMarkdown = removeBlankLinesAndMarkdown(content.sourceContentOriginal);
        const withoutDatesInParentheses = removeDatesInParentheses(withoutBlankLinesAndMarkdown);

        content.sourceContentSanitized = withoutDatesInParentheses;

        function removeBlankLinesAndMarkdown(text) {
            const allLines = text.split('\n');

            const withoutBlankLinesAndMarkdown = allLines.filter((line) => {
                if(line.trim().length === 0 || line.trim().startsWith('=')) {
                    return false;
                }

                return true;
            });

            return withoutBlankLinesAndMarkdown.join(' ');
        };
        
        function removeDatesInParentheses(text) {
            return text.replace(/\((?:\([^()]*\)|[^()])*\)/gm, '').replace(/  /g,' ')
        }
    };
    function breakContentIntoSentences(content) {
        content.sentences = [];

        const sentences = sentenceBoundaryDetection.sentences(content.sourceContentSanitized)
        
        sentences.forEach((sentence) => {
            content.sentences.push({
                text: sentence,
                keywords: [],
                image: []
            });
        });
    }
};

module.exports = robot;