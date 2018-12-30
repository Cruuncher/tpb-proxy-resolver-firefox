# This repo has been deprecated
https://github.com/Cruuncher/tpb-proxy-resolver now supports chrome and firefox through a build script. 
This repo will no further be updated

# tpb-proxy-resolver-firefox

This is a firefox port of tpb-proxy-resolver built for Google Chrome. The extension which adds a toolbar button for opening a working proxy to the pirate bay. 

The list of proxies is scraped from https://proxybay.github.io/. The proxy with the smallest number in the speed column is used. 

The extension automatically builds and maintains a banlist of proxies. Given that ISPs can ban proxies, they may work for others and not you. If a timeout of 5 seconds is experienced while attempting to access a proxy, it will automatically be added to the banlist and will be ignored the next time the action button is clicked. 
