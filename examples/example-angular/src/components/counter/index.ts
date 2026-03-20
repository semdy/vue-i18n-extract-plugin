import { Component, signal } from '@angular/core';
import { TranslatePipe } from '@/locales/TranslatePipe';

@Component({
  standalone: true,
  imports: [TranslatePipe],
  selector: 'app-counter',
  templateUrl: './index.html',
})
export class Counter {
  protected readonly count = signal(0);
  protected readonly t = (msg: string, values: Record<string, any>) => {
    return msg.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? name);
  };

  public increment() {
    this.count.update((c) => c + 1);
  }
}
