'use client';

import {HomeModuleGrid} from './home-module-grid';
import {HomeWelcome} from './home-welcome';

function HomePortal() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <HomeWelcome />
      <HomeModuleGrid />
    </div>
  );
}

export {HomePortal};
