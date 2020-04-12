const express = require('express');
const google = require('googleapis').google;
const youtube = google.youtube({ version: 'v3' });
const OAuth2 = google.auth.OAuth2;
const state = require('./state.js');
const fs = require('fs');


async function robot() {
    console.log('> [youtube-robot] Iniciando...')
    const content = state.load();

    await authenticateWithOAuth();
    const videoInformation = await uploadVideo(content);
    await uploadThumbnail(videoInformation);

    async function authenticateWithOAuth() {
        const webServer = await startWebServer();
        const OAuthClient = await createOAuthClient();
        requestUserConsent(OAuthClient);
        const authorizationToken = await waitForGoogleCallBack(webServer);
        await requestGoogleForAccessTokens(OAuthClient, authorizationToken);
        await setGlobalGoogleAuthentication(OAuthClient);
        await stopWebServer(webServer);

        async function startWebServer() {
            return new Promise((resolve, reject) => {
                const port = 5000;
                const app = express();

                const server = app.listen(port, () => {
                    console.log(`> [youtube-robot] Listening on http://localhost:${port}`);

                    resolve({
                        app,
                        server
                    });
                });
            });
        };

        async function createOAuthClient() {
            //Puxa as credenciais e cria um novo cliente OAuth
            const credentials = require('../credentials/google-youtube.json');

            const OAuthClient = new OAuth2(
                credentials.web.client_id,
                credentials.web.client_secret,
                credentials.web.redirect_uris[0]
            );

            return OAuthClient;
        };

        function requestUserConsent(OAuthClient) {
            //Gera uma URL e nela pede o consentimento do User
            const consenUrl = OAuthClient.generateAuthUrl({
                access_type: 'offline',
                scope: ['https://www.googleapis.com/auth/youtube']
            });

            console.log(`> [youtube-robot] Por favor, dê o seu consentimento: ${consenUrl}`)
        };

        async function waitForGoogleCallBack(webServer) {
            return new Promise((resolve, reject) => {
                console.log('>[youtube-robot] Aguardando consentimento do usuário...')

                webServer.app.get('/oauth2callback', (req, res) => {
                    const authCode = req.query.code;
                    console.log(`> [youtube-robot] Consentimento dado: ${authCode}`);

                    res.send('<h1>Obrigado!</h1><p>Agora feche essa guia.</p>');
                    resolve(authCode);
                });
            });
        };

        async function requestGoogleForAccessTokens(OAuthClient, authorizationToken) {
            //Recebe os tokens de autorização
            return new Promise((resolve, reject) => {
                OAuthClient.getToken(authorizationToken, (error, tokens) => {
                    if (error) {
                        return reject(error);
                    };

                    console.log('> [youtube-robot] Tokens de acesso recebidos:');
                    
                    OAuthClient.setCredentials(tokens);
                    resolve();
                });
            });
        };

        function setGlobalGoogleAuthentication(OAuthClient) {
            //Injeta o OAthClient na função (google)
            google.options({
                auth: OAuthClient
            });
        };

        async function stopWebServer(webServer) {
            //Fecha todas as conexões e outras coisas(portas...) 
            return new Promise((resolve, reject) => {
                webServer.server.close(() => {
                    resolve();
                });
            });
        };
 
    };

    async function uploadVideo(content) {
        const videoFilePath = './content/output.mov';
        const videoFileSize = fs.statSync(videoFilePath).size;
        const videoTitle = `${content.prefix} ${content.searchTerm}`;
        const videoTags = [content.searchTerm, ...content.sentences[0].keywords];
        const videoDescription = content.sentences.map((sentence) => {
            return sentence.text;
        }).join('\n\n');

        const requestParameters = {
            part: 'snippet, status',
            requestBody: {
                snippet: {
                    title: videoTitle,
                    description: videoDescription,
                    tags: videoTags
                },
                status: {
                    privacyStatus: 'unlisted'
                }
            },
            media: {
                body: fs.createReadStream(videoFilePath)
            }
        };
        console.log('> [youtube-robot] Iniciando o upload do video para o YouTube')
        const youtubeResponse = await youtube.videos.insert(requestParameters, {
            onUploadProgress: onUploadProgress
        });

        console.log(`> [youtube-robot] Video disponível em: https://youtu.be/${youtubeResponse.data.id}`);
        return youtubeResponse.data;

        function onUploadProgress(event) {
            const progress = Math.round( ( event.bytesRead / videoFileSize )* 100 );
            console.log(`> [youtube-robot] ${progress}% completo`)
        };
    };

    async function uploadThumbnail(videoInformation) {
        const videoId = videoInformation.id;
        const videoThumbnailFilePath = './content/youtube-thumbnail.jpg';

        const requestParameters = {
            videoId: videoId,
            media: {
                mimeType: 'image/jpeg',
                body: fs.createReadStream(videoThumbnailFilePath)
            }
        };

        const youtubeResponse = await youtube.thumbnails.set(requestParameters);
        console.log('> [youtube-robot] Thumbnail Carregada!')
    };
    
};

module.exports = robot;