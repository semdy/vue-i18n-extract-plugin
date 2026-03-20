import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Counter } from '@/components/counter';
import { TranslatePipe } from '@/locales/TranslatePipe';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [TranslatePipe, RouterOutlet, Counter, LanguageSwitcher],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('angular');
}
