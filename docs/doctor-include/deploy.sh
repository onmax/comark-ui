#!/bin/sh
#region build
pnpm build
#endregion build
#region ship
wrangler deploy
#endregion ship
