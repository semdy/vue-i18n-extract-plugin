<script lang="ts">
  import { t } from "@/locales";
  const foo = "foo";
  const condition = true;
  const text ="script文本";
</script>

<div>正常文本</div>
<div>{$t("纯文本测试")}</div>
<div>{$t("带插件：{name}, {v}", { name: "名字", v: "major" })}</div>
<div>前缀{$t("纯文本测试2")}后缀</div>
<div>{'测试1'}</div>
<div>{`测试2`}</div>
<div>{foo + '测试3'}</div>
<div>{`${foo}测试4`}</div>
<div>{`${condition ? '测试5' : '取消'}`}</div>
<div>{condition ? '测试6' : '取消'}</div>
<div>{error && "发生错误"}</div>
<div>{["苹果", "香蕉"].join(",")}</div>
<div>{!"苹果"}</div>
<div>{+"苹果"}</div>
<div>{-"苹果"}</div>
<div>{typeof "苹果"}</div>
<div>{("苹果", "香蕉")}</div>
<div>{(foo(), "苹果")}</div>

<CustomComponent
 a="正常属性"
 b={'插值属性'}
 c={`模板属性`}
 d={foo + '属性3'}
 e={`${foo}属性4`}
 f={`${condition ? '属性5' : '取消'}`}
 g={condition ? '属性6' : '取消'}
 h={$t("属性7")}
/>

<MyDialog>
  标题文本
  <div>对话框内容</div>
</MyDialog>

<div title="标题"></div>
<input placeholder="请输入用户名" />