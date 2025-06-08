function TestMethod() {
    const a = "js a变量名"
    const b = $t("js b变量名, {name}", { name: 'js 变量b名称' })
    const c = $t("js c变量名")
    const d = `js模板内容${$t("js 模板字符串")}结束`
    const e = `js纯模板字符串` 

    return a + b + c + d + e;
}

export default TestMethod;