import {createAction, props} from '@ngrx/store';
import {User} from '../models/user.model';

/** Action NgRx de mise à jour explicite de l'utilisateur courant dans le store. */
export const setCurrentUser = createAction(
  '[Auth] Set Current User',
  props<{ user: User | null }>()
);

/** Action NgRx déclenchant la tentative de connexion d'un utilisateur. */
export const login = createAction(
  '[Auth] Login',
  props<{ email: string; password: string }>()
);

/** Action NgRx émise en cas de succès de la connexion. */
export const loginSuccess = createAction(
  '[Auth] Login Success',
  props<{ user: User; token: string }>()
);

/** Action NgRx émise en cas d'échec de la connexion. */
export const loginFailure = createAction(
  '[Auth] Login Failure',
  props<{ error: string }>()
);

/** Action NgRx déclenchant une inscription. */
export const register = createAction(
  '[Auth] Register',
  props<{ userData: Partial<User> }>()
);

/** Action NgRx émise après une inscription réussie. */
export const registerSuccess = createAction(
  '[Auth] Register Success',
  props<{ user: User; token: string }>()
);

/** Action NgRx émise en cas d'erreur d'inscription. */
export const registerFailure = createAction(
  '[Auth] Register Failure',
  props<{ error: string }>()
);

/** Action NgRx déclenchant la déconnexion. */
export const logout = createAction('[Auth] Logout');

/** Action NgRx confirmant la déconnexion réussie. */
export const logoutSuccess = createAction('[Auth] Logout Success');

/** Action NgRx émise en cas d'échec de déconnexion. */
export const logoutFailure = createAction(
  '[Auth] Logout Failure',
  props<{ error: string }>()
);

/** Action NgRx de réhydratation du store d'authentification depuis le LocalStorage au démarrage. */
export const initAuthFromStorage = createAction(
  '[Auth] Init Auth From Storage',
  props<{ token: string }>()
);
