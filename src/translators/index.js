const { Translator } = require('./translator')
const { GoogleTranslator } = require('./google')
const { YoudaoTranslator } = require('./youdao')
const { BaiduTranslator } = require('./baidu')
const { EmptyTranslator } = require('./scan')
const { VolcEngineTranslator } = require('./volcengine')

module.exports = {
    Translator,
    GoogleTranslator,
    YoudaoTranslator,
    BaiduTranslator,
    EmptyTranslator,
    VolcEngineTranslator
}
