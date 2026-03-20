import { Component, Input, Output, EventEmitter, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { languageList, SupportLocale, I18nService } from '@/locales/I18nService';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './index.html',
})
export class LanguageSwitcher {
  @Input() options?: Array<{ label: string; value: string }>;

  @Output() change = new EventEmitter<string>();

  public i18nService = inject(I18nService);

  normalizedOptions = computed(() => {
    if (this.options?.length) return this.options;
    return languageList;
  });

  onChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value as SupportLocale;
    this.i18nService.setLocale(value);
    this.change.emit(value);
  }
}
