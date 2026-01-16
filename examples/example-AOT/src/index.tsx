import React from 'react'

const TestCom: React.FC<{c: boolean}> = ({ c }) => {
    return (
        <div>
            <div>{ $t("tsx文本") }</div>
            <div>{ $t("tsx文本, 带参数{name}", {name: 'tsx参数名test'}) }</div>
            <div>js纯文本</div>
            <div>{'tsx文本表达式'}</div>
            <div>{`tsx模板字符串`}</div>
            <div>{`tsx模板字符串拼接${$t("js模板拼接内容")}tsx结束`}</div>
            <div>{ c ? 'tsx成功' : 'tsx失败'}</div>
            <div>{ c ? $t('tsx成功2') : $t('tsx失败2,reason: {name}', {name: 'tsx失败2原因'})}</div>
            <CustomCom
                arg0="tsx arg0纯文本参数"
                arg1={'tsx arg1参数名test'}
                arg2={$t('tsx arg2参数')}
                arg3={$t('tsx arg3参数，带参数{name}', { name: 'tsx arg3参数name' })}
                arg4={`arg4参数${$t('arg4参数插值')}arg4结束`}
            >
                CustomCom 纯文本
            </CustomCom>
        </div>
    )
}

export default TestCom;