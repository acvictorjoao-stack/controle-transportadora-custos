'use client';

import {HomeModuleGrid} from './home-module-grid';
import {HomeWelcome} from './home-welcome';

function HomePortal() {
  return (
    <div className="flex flex-col gap-8 pb-8">
      <HomeWelcome />
      <HomeModuleGrid />
    </div>
  );
}

export {HomePortal};
