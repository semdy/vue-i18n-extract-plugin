const { Translator } = require('./translator')

/**
 * 空翻译器，不翻译文本，用于配合某些特殊的操作
 */
class EmptyTranslator extends Translator {
    constructor(option = {}) {
        const resultOption = {
            name: '空翻译器',
            fetchMethod: async (text, _from, _to, separator) => {
                // 相当于把翻译结果统一设置为空串
                const value = text.split(separator).fill('')
                return value.join(separator)
            },
            ...option
        }
        super(resultOption)
    }
    // TODO: 后续可以作为基类，提供更多的配置选项
}

module.exports = {
    EmptyTranslator
}
