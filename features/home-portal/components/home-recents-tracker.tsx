'use client';

import {useTrackHomeRecents} from '../hooks/use-home-recents';

/** Registra navegação para a seção de recentes da Home. */
function HomeRecentsTracker() {
  useTrackHomeRecents();
  return null;
}

export {HomeRecentsTracker};
