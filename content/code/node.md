---
title: "node"
tags: code, js
---

Serve app on Github

https://www.youtube.com/watch?v=yo2bMGnIKE8

	export default {
	  base: "/suttapitaka-chart/",
	}

deploy.sh

	#!/usr/bin/env sh
	
	npm run build
	git add dist -f
	git commit -m "deploy"
	git subtree push --prefix dist origin gh-page
