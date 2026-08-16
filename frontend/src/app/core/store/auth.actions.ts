import {createAction, props} from '@ngrx/store';
import {User} from '../models/user.model';

/** NgRx action to explicitly update the current user in store. */
export const setCurrentUser = createAction(
  '[Auth] Set Current User',
  props<{ user: User | null }>()
);

/** NgRx action triggering user login attempt. */
export const login = createAction(
  '[Auth] Login',
  props<{ email: string; password: string }>()
);

/** NgRx action emitted upon successful login. */
export const loginSuccess = createAction(
  '[Auth] Login Success',
  props<{ user: User; token: string }>()
);

/** NgRx action emitted upon login failure. */
export const loginFailure = createAction(
  '[Auth] Login Failure',
  props<{ error: string }>()
);

/** NgRx action triggering registration. */
export const register = createAction(
  '[Auth] Register',
  props<{ userData: Partial<User> }>()
);

/** NgRx action emitted upon successful registration. */
export const registerSuccess = createAction(
  '[Auth] Register Success',
  props<{ user: User; token: string }>()
);

/** NgRx action emitted upon registration failure. */
export const registerFailure = createAction(
  '[Auth] Register Failure',
  props<{ error: string }>()
);

/** NgRx action triggering user logout. */
export const logout = createAction('[Auth] Logout');

/** NgRx action confirming successful logout. */
export const logoutSuccess = createAction('[Auth] Logout Success');

/** NgRx action emitted upon logout failure. */
export const logoutFailure = createAction(
  '[Auth] Logout Failure',
  props<{ error: string }>()
);

/** NgRx action to hydrate authentication store from LocalStorage upon startup. */
export const initAuthFromStorage = createAction(
  '[Auth] Init Auth From Storage',
  props<{ token: string; user?: User | null }>()
);
