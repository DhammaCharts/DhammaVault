---
title: "VIPS"
tags: code
---

	2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536

# Get size info

	vipsheader -a input.svg

# Resize to a power of 2

	vipsthumbnail input.png --size 16384x -o output.png --vips-progress
	
# Make PNGtiles

VIPS will extend your input to get a "power of 2" size.

If you want to maximize your zoom wihle scaling and keeping the same coordinates with Overlay, make sure your inital input size is of a power of 2 minus 1 (not sure about that)

	vips dzsave 'kn.svg[scale=15]'  tiledir --layout google --centre --suffix .png --vips-progress
	vips dzsave 'suttapitaka.svg[scale=8]'  maptilesHD --layout google --centre --suffix .png --tile-size 1024 --vips-progress

# Extend with white

	vips gravity input.png south-west 8192 8192 --extend white --vips-progress
	vips gravity input.png centre 8192 8192 --extend white --vips-progress

# Copy

	vips copy 'input.svg[dpi=10, scale=10]' output.png --vips-progress	
	vips copy 'dark.svg[scale=5]' dark.png --vips-progress
	
# TIFF Tiles

[large image](https://stackoverflow.com/questions/11948084/vips-is-failing-on-large-image)

# Calcul scale

	2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536

	size = width > height ? width : height
	factor = 32768 / size

	width=$(vipsheader -f width somefile.tif)
	height=$(vipsheader -f height somefile.tif)
	size=$((width > height ? width : height))
	factor=$(bc <<< "scale=10; 32768 / $size")
	vips resize somefile.tif huge.tif $factor



