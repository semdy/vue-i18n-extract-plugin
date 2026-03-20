import { on } from '@ember/modifier'
import { fn } from '@ember/helper';
import { tracked } from '@glimmer/tracking';
import Component from '@glimmer/component';

export default class extends Component {
  @tracked currentPerson;

  showPerson = (person) => {
    this.currentPerson = person;
  };

  isCurrentPerson = (person) => {
    log("log测试")
    return this.currentPerson === person;
  };

  <template>
    <h2>{{@title}}</h2>
    <div title="你好">
      欢迎 {{name}}
      {{concat "今天是" day}}
      <div>{{t "测试"}}</div>
      <div>{{t "计数器{n}" n=this.count}}</div>
      <div>{{isVip ? "VIP用户" : "普通用户"}}</div>
      <input placeholder="请输入用户名">
      <MyComp @dataInfo={{hash label="商品标题" desc="商品描述"}} />
    </div>
  </template>
}