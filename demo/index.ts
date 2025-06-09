const $t = (msg: string, values?: Record<string, string>): string => {
    return msg.replace(/\{([^}]+)\}/g, (match, key) => {
        return values?.[key] || ''
    })
}

function TestMethod(): string {
    const a = "ts a变量名"
    const b = $t("ts b变量名, {name}", { name: 'ts 变量b名称' })
    const c = $t("ts c变量名")
    const d = `ts模板内容${$t("ts 模板字符串")}结束`
    const e = `ts纯模板字符串` 

    return a + b + c + d + e;
}

export default TestMethod;