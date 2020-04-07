const algorithmia = require('algorithmia');
const sentenceBoundaryDetection = require('sbd');

const algorithmiaApiKey = require('../credentials/algorithmia.json').apiKey;
const watsonApiKey = require('../credentials/watson-nlu.json').apikey;

const NaturalLanguageUnderstandingV1 = require('ibm-watson/natural-language-understanding/v1.js');
const { IamAuthenticator } = require('ibm-watson/auth');

const nlu = new NaturalLanguageUnderstandingV1({
    authenticator: new IamAuthenticator({ apikey: watsonApiKey }),
    version: '2018-04-05',
    url: 'https://api.eu-gb.natural-language-understanding.watson.cloud.ibm.com/instances/af06c7f7-0129-4585-ad0c-4a6ef2dc6b57'//tem que ser a mesma das credenciais
});

const state = require('./state.js');


async function robot() {
    const content = state.load();//carregar o state do robo de input

    await fetchContentFromWikipedia(content);//Baixar conteúdo do Wikipedia
    sanitizeContent(content);//Limpar o conteúdo
    breakContentIntoSentences(content);//Separar em sentenças
    limitMaximumSentences(content);//Limite max de sentenças para o Watson
    await fetchKeywordsOfAllSentences(content);//Buscar palavra chave da sentença 

    state.save(content);//salva mais info 

    async function fetchContentFromWikipedia(content) {
        const algorithmiaAuthenticated = algorithmia(algorithmiaApiKey);

        const wikipediaAlgorithm = algorithmiaAuthenticated.algo('web/WikipediaParser/0.1.2');
        const wikipediaResponse = await wikipediaAlgorithm.pipe({
            //manda para o algoritmo do wikipedia e ele vai buscar no wikipedia oficial
            "lang": content.lang,
            "articleName": content.searchTerm
        });
        const wikipediaContent = wikipediaResponse.get();//resposta cai aqui dentro(conteudo do wikipedia)

        content.sourceContentOriginal = wikipediaContent.content;
    };

    function sanitizeContent(content) {
        const withoutBlankLinesAndMarkdown = removeBlankLinesAndMarkdown(content.sourceContentOriginal);
        const withoutDatesInParentheses = removeDatesInParentheses(withoutBlankLinesAndMarkdown);

        content.sourceContentSanitized = withoutDatesInParentheses;

        function removeBlankLinesAndMarkdown(text) {
            const allLines = text.split('\n');

            const withoutBlankLinesAndMarkdown = allLines.filter((line) => {
                if (line.trim().length === 0 || line.trim().startsWith('=')) {
                    return false;
                }

                return true;
            });

            return withoutBlankLinesAndMarkdown.join(' ');
        };

        function removeDatesInParentheses(text) {
            return text.replace(/\((?:\([^()]*\)|[^()])*\)/gm, '').replace(/  /g, ' ')
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
    
    async function limitMaximumSentences(content) {
        content.sentences = content.sentences.slice(0, content.maximumSentences);
        
    }

    async function fetchKeywordsOfAllSentences(content) {
        for (const sentence of content.sentences) {
            sentence.keywords = await fetchWatsonAndReturnKeywords(sentence.text);
        }
    }

    async function fetchWatsonAndReturnKeywords(sentence) {
        return new Promise((resolve, reject) => {
            nlu.analyze({
                text: sentence,
                features: {
                    keywords: {}
                }
            }, (error, response) => {
                if(error) {
                    throw error;
                }

                const keywords = response.result.keywords.map((keyword) => {
                    return keyword.text;
                });
                
                resolve(keywords);
            });
        });
    }
}

module.exports = robot;