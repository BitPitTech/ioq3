//
//  sys_emscripten.c
//  ioquake3
//
//  Created by Krunoslav Zaher on 4/30/18.
//  Copyright © 2018 ioquake. All rights reserved.
//

#include "../qcommon/q_shared.h"
#include "../qcommon/qcommon.h"

char    *Sys_SteamPath(void) {
    return "/";
}
char    *Sys_GogPath(void) {
    return "/";
}

qboolean Sys_DllExtension( const char *name ) {
	if ( COM_CompareExtension( name, ".js" ) ) {
		return qtrue;
	}

	return qfalse;
}
