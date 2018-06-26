#!/bin/sh

failed=0;

#(make release USE_CODEC_VORBIS=1 USE_FREETYPE=1 LDFLAGS=-lpthread) || failed=1;
(LDFLAGS='-lpthread'; make release) || failed=1;

if [ $failed -eq 1 ]; then
	echo "Build failure.";
else
	echo "All builds successful.";
fi

exit $failed;

