const { translate } = require('@vitalets/google-translate-api')
const { Translator } = require('./translator')
const tunnel = require('tunnel')

/**
 * 谷歌翻译器
 * 
 * 基于@vitalets/google-translate-api，需要翻墙，不稳定，但是免费
 * 
 * 使用方式：
 * ```ts
 * VitePluginI18n({
    ...
    translator: translator: new GoogleTranslator({
        proxyOption: {
            // 如果你本地的代理在127.0.0.0:8899
            host: '127.0.0.1',
            port: 8899,
            headers: {
                'User-Agent': 'Node'
            }
        }
    })
})
 * ```
 */
class GoogleTranslator extends Translator {
    constructor(option = {}) {
        super({
            name: 'Google翻译',
            fetchMethod: async (text, fromKey, toKey) => {
                let data = await translate(text, {
                    from: fromKey,
                    to: toKey,
                    ...(option.proxyOption
                        ? {
                              fetchOptions: {
                                  agent: tunnel.httpsOverHttp({
                                      proxy: option.proxyOption
                                  })
                              }
                          }
                        : {})
                })
                return data['text'] || ''
            },
            onError: (error, cb) => {
                cb(error)
                if (error instanceof Object && 'code' in error && error.code === 'ETIMEDOUT') {
                    console.error('❗ 请求超时，请确保你的网络可以访问google ❗')
                }
            }
        })
    }
}

module.exports = {
    GoogleTranslator
}