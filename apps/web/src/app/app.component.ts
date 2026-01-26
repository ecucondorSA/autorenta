import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'web';
}

export interface AppConfig {
  // An empty interface declaration allows any non-nullish value, including literals like `0` and `""`.
  // If that's what you want, disable this lint rule with an inline comment or configure the 'allowInterfaces' rule option.
  // If you want a type meaning "any object", you probably want `object` instead.
  // If you want a type meaning "any value", you probably want `unknown` instead
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  // {}
  // {} should be replaced with object or unknown
}
