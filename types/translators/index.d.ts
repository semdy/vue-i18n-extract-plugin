import tunnel from 'tunnel';
import { AxiosProxyConfig } from 'axios';

interface TranslatorOption {
    /** Translator版本，用于做后续的功能迭代 */
    version?: number;
    /**
     * 实际的请求方法
     * @param text 被翻译的文本
     * @param fromKey 源语言
     * @param toKey 目标语言
     * @param separator 分隔符
     * @returns 翻译后的文本
     */
    fetchMethod: (text: string, fromKey: string, toKey: string, separator: string) => Promise<string>;
    name: string;
    /** 单次最大翻译文本长度 */
    maxChunkSize?: number;
    /** 执行间隔（默认不开启） */
    interval?: number;
    /**
     * 错误处理函数，主要是打印提示
     * @param err 抛出的异常
     * @param defaultErrorHandler 默认的错误处理函数
     * @returns 如果在这里抛出异常会中断翻译
     */
    onError?: (err: unknown, defaultErrorHandler: (error: unknown) => void) => void;
}
declare class Translator {
    option: Required<TranslatorOption>;
    constructor(option: TranslatorOption);
    private defaultErrorHandler;
    private getResultOption;
    protected getErrorMessage(error: unknown): string;
    translate(text: string, fromKey: string, toKey: string, separator: string): Promise<string>;
}

interface GoogleTranslatorOption {
    proxyOption?: tunnel.ProxyOptions;
}
/**
 * 谷歌翻译器
 *
 * 基于@vitalets/google-translate-api，需要翻墙，不稳定，但是免费
 *
 * 使用方式：
 * ```ts
 * vitePluginsAutoI18n({
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
declare class GoogleTranslator extends Translator {
    constructor(option: GoogleTranslatorOption);
}

interface YoudaoTranslatorOption {
    appId: string;
    appKey: string;
    /** 网络代理配置 */
    proxy?: AxiosProxyConfig;
    /** 翻译api执行间隔，默认为1000 */
    interval?: number;
}
/**
 * 有道翻译器
 *
 * api文档：https://ai.youdao.com/DOCSIRMA/html/trans/api/wbfy/index.html
 *
 * 使用方式：
 * ```ts
 * vitePluginsAutoI18n({
    ...
    translator: new YoudaoTranslator({
        appId: '你申请的appId',
        appKey: '你申请的appKey'
    })
})
 * ```
 */
declare class YoudaoTranslator extends Translator {
    /** 有道的语言类型映射不标准，需要手动控制 */
    private readonly YOUDAO_TRANSLATE_KEY_CONVERT_MAP;
    private truncate;
    private getTranslateKey;
    constructor(option: YoudaoTranslatorOption);
}

interface BaiduTranslatorOption {
    appId: string;
    appKey: string;
    /** 网络代理配置 */
    proxy?: AxiosProxyConfig;
    /** 翻译api执行间隔，默认为1000 */
    interval?: number;
}
/**
 * 百度翻译器
 *
 * api文档：https://api.fanyi.baidu.com/product/113
 *
 * 使用方式：
 * ```ts
 * vitePluginsAutoI18n({
    ...
    translator: new BaiduTranslator({
        appId: '你申请的appId',
        appKey: '你申请的appKey'
    })
})
 * ```
 */
declare class BaiduTranslator extends Translator {
    /** 百度的语言类型映射不标准，需要手动控制 */
    protected readonly BAIDU_TRANSLATE_KEY_CONVERT_MAP: Record<string, string>;
    protected getTranslateKey(key: string): string;
    constructor(option: BaiduTranslatorOption);
}

/**
 * 空翻译器，不翻译文本，用于配合某些特殊的操作
 */
declare class EmptyTranslator extends Translator {
    constructor(option?: Partial<TranslatorOption>);
}
/** @deprecated 别名导出，兼容旧版本 */
declare const ScanTranslator: typeof EmptyTranslator;

interface VolcengineTranslatorOption {
    apiKey: string;
    /** 使用的ai模型，可选值请参阅火山引擎控制台的模型列表，如`doubao-1-5-pro-32k-250115`，并请确保使用前已在控制台开通了对应模型 */
    model: string;
    /** 对本项目的简短描述，在有描述的情况下大模型的翻译结果可能会更加准确 */
    desc?: string;
    /** 网络代理配置 */
    proxy?: AxiosProxyConfig;
    /** 翻译api执行间隔，默认为1000 */
    interval?: number;
}
/**
 * 火山引擎翻译器，内置豆包、deepseek等模型
 *
 * 火山引擎大模型介绍：https://www.volcengine.com/docs/82379/1099455
 *
 * api文档：https://www.volcengine.com/docs/82379/1298454
 *
 * 使用方式：
 * ```ts
 * vitePluginsAutoI18n({
    ...
    translator: new VolcengineTranslator({
        apiKey: '你申请的apiKey',
        model: '你要调用的模型，如：`doubao-1-5-pro-32k-250115`，请确保使用前已在控制台开通了对应模型'
    })
})
 * ```
 */
declare class VolcengineTranslator extends Translator {
    constructor(option: VolcengineTranslatorOption);
}


export {
    BaiduTranslator,
    BaiduTranslatorOption,
    EmptyTranslator,
    GoogleTranslator,
    GoogleTranslatorOption,
    ScanTranslator,
    Translator,
    TranslatorOption,
    VolcengineTranslator,
    VolcengineTranslatorOption,
    YoudaoTranslator,
    YoudaoTranslatorOption
};