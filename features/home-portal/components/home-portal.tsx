import {HomeFavorites} from './home-favorites';
import {HomeModuleGrid} from './home-module-grid';
import {HomePendingCards} from './home-pending-cards';
import {HomeRecents} from './home-recents';
import {HomeWelcome} from './home-welcome';
import type {HomePendingItem} from '../types';

export interface HomePortalProps {
  pendingItems: HomePendingItem[];
}

function HomePortal({pendingItems}: HomePortalProps) {
  return (
    <div className="flex flex-col gap-8 pb-6">
      <HomeWelcome />
      <HomeFavorites />
      <HomeRecents />
      <HomePendingCards items={pendingItems} />
      <HomeModuleGrid />
    </div>
  );
}

export {HomePortal};
