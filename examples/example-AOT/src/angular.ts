import { Component, signal } from "@angular/core";
import { TranslatePipe } from "@/locales/TranslatePipe";

@Component({
  standalone: true,
  selector: "app-app2",
  imports: [TranslatePipe],
  template: `<div>纯文本测试</div>`
})
export class App {
  protected readonly title = signal("angular");
}
