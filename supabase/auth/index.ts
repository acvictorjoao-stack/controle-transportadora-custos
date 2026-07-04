export {
  getAuthClient,
  getClientSession,
  getClientUser,
  onAuthStateChange,
  signInWithPassword,
  signOutClient,
  signOutClientLocal,
} from './client';
export type {SignInCredentials} from './client';

export {getServerSession, getServerSupabase, getServerUser} from './server';

export {signInAction, signOutAction} from './actions';
export type {AuthActionResult} from './actions';

export {createRouteHandlerClient, getRouteHandlerUser} from './route-handler';
