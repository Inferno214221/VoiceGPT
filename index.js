#!/usr/bin/node
const cwd = __dirname + "/";
var vosk = require('vosk');
const fs = require("fs");
var mic = require("mic");
const { Configuration, OpenAIApi } = require("openai");
const tts = require('gtts');
const { exec } = require("child_process");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

MODEL_PATH = cwd + "model"
SAMPLE_RATE = 16000

if (!fs.existsSync(MODEL_PATH)) {
    console.log("Please download the model from https://alphacephei.com/vosk/models and unpack as " + MODEL_PATH + " in the current folder.")
    process.exit()
}

vosk.setLogLevel(0);
const model = new vosk.Model(MODEL_PATH);
const rec = new vosk.Recognizer({ model: model, sampleRate: SAMPLE_RATE });

var micInstance = mic({
    rate: String(SAMPLE_RATE),
    channels: '1',
    debug: false,
    device: 'default'
});

var micInputStream = micInstance.getAudioStream();

micInputStream.on('data', data => {
    if (rec.acceptWaveform(data)) {
        const text = rec.result()['text']
        console.log("You: " + text);
        doChatGPT(text);
    }
});

async function doChatGPT(text) {
    const result = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: text,
        temperature: 0,
    });
    console.log("ChatGPT: " + result.data.choices[0].text);
    var gtts = new tts(result.data.choices[0].text, 'en');
    gtts.save('output.mp3', function (err, result){
        if(err) { throw new Error(err); }
        exec("play " + cwd + "output.mp3");
    });
}

micInputStream.on('audioProcessExitComplete', function () {
    rec.free();
    model.free();
});

process.on('SIGINT', function () {
    micInstance.stop();
})

micInstance.start();