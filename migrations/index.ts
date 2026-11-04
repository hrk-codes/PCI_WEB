import * as migration_20261104_112325_initial from './20261104_112325_initial';

export const migrations = [
  {
    up: migration_20261104_112325_initial.up,
    down: migration_20261104_112325_initial.down,
    name: '20261104_112325_initial'
  },
];
