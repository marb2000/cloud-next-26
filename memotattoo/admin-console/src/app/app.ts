import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from './core/auth/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.html'
})
export class App {
  auth = inject(Auth);
  isSidebarExpanded = signal(true);

  toggleSidebar() {
    this.isSidebarExpanded.set(!this.isSidebarExpanded());
  }
}
