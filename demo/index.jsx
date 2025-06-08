function TestCom({c}) {
    return <div>
        <div>{ $t("jsx文本") }</div>
        <div>{ $t("jsx文本, 带参数{name}", {name: 'jsx参数名test'}) }</div>
        <div>js纯文本</div>
        <div>{'jsx文本表达式'}</div>
        <div>{`jsx模板字符串`}</div>
        <div>{`jsx模板字符串拼接${$t("js模板拼接内容")}jsx结束`}</div>
        <div>{ c ? 'jsx成功' : 'jsx失败'}</div>
        <div>{ c ? $t('jsx成功2') : $t('jsx失败2,reason: {name}', {name: 'jsx失败2原因'})}</div>
        <CustomCom
            arg0="jsx arg0纯文本参数"
            arg1={'jsx arg1参数名test'}
            arg2={$t('jsx arg2参数')}
            arg3={$t('jsx arg3参数，带参数{name}', { name: 'jsx arg3参数name' })}>
            arg4={`arg4参数${$t('arg4参数插值')}arg4结束`}
            CustomCom 纯文本
        </CustomCom>
    </div>
}

export default TestCom;