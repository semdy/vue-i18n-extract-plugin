import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './I18nService';

@Pipe({
  name: 't',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private i18n = inject(I18nService);

  transform(key: string): string;
  transform(key: string, defaultMsg: string): string;
  transform(key: string, values: Record<string, any>): string;
  transform(key: string, defaultMsg: string, values: Record<string, any>): string;
  transform(
    key: string,
    defaultMsg?: string | Record<string, any>,
    values?: Record<string, any>,
  ): string {
    return this.i18n.t(key, defaultMsg as any, values as any);
  }
}
