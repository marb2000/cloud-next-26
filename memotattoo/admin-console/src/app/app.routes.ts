import { Routes } from '@angular/router';
import { adminGuard } from './core/auth/admin-guard';
import { Dashboard } from './features/dashboard/dashboard';
import { FlashcardStudio } from './features/flashcard-studio/flashcard-studio';
import { FlashcardLibrary } from './features/flashcard-library/flashcard-library';
import { Auth } from './features/auth/auth';
import { LogsComponent } from './features/logs/logs';
import { GameSimulation } from './features/game-simulation/game-simulation';
import { DeckModeration } from './features/deck-moderation/deck-moderation';
import { UsersComponent } from './features/users/users';

export const routes: Routes = [
  { path: 'auth', component: Auth },
  {
    path: '',
    component: Dashboard,
    canActivate: [adminGuard]
  },

  {
    path: 'flashcard-studio',
    component: FlashcardStudio,
    canActivate: [adminGuard]
  },
  {
    path: 'flashcard-library',
    component: FlashcardLibrary,
    canActivate: [adminGuard]
  },
  {
    path: 'deck-moderation',
    component: DeckModeration,
    canActivate: [adminGuard]
  },
  {
    path: 'logs',
    component: LogsComponent,
    canActivate: [adminGuard]
  },
  {
    path: 'users',
    component: UsersComponent,
    canActivate: [adminGuard]
  },
  {
    path: 'game',
    component: GameSimulation,
    canActivate: [adminGuard]
  },
  {
    path: 'game/:deckId',
    component: GameSimulation,
    canActivate: [adminGuard]
  },
  { path: '**', redirectTo: '' }
];
