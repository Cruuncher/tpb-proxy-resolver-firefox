function banURL(url, callback = null) {
    if(callback === null) {
        callback = function () {};
    }
    chrome.storage.local.get({"banned_urls": []}, function(items) {
        banned_urls = items['banned_urls'];
        banned_urls.push(url);
        chrome.storage.local.set({"banned_urls": banned_urls});
    }, callback);
}

function unbanURL(url) {
    chrome.storage.local.get({"banned_urls": []}, function(items) {
        banned_urls = items['banned_urls'];
        new_banned_urls = []; 
        for(var i = 0 ; i < banned_urls.length ; i++) {
            if(banned_urls[i] !== url) {
                new_banned_urls.push(banned_urls[i])
            }
        }
        chrome.storage.local.set({"banned_urls": new_banned_urls});
    });
}

function clearSaved() {
    chrome.storage.local.remove(["saved_url", "saved_url_time"]);
}

function setSavedURL(url) {
    console.log("setting save url: " + url)
    now = new Date().getTime();
    chrome.storage.local.set({
        "saved_url": url,
        "saved_url_time": now
    });
}

function checkURL(url, success, fail) {
    console.log("checkURL: " + url)

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if(xhr.status !== 200) {
                fail(url);
            } else {
                success(url);
            }
        }
    } 
    xhr.open('GET', url);
    xhr.timeout = 5000;
    xhr.send(null);
}

function advanceToTPB(url) {
    chrome.tabs.create({
        url: url
    });
    checkURL(url, setSavedURL, banURL);
}

function withStorage(callback) {
    chrome.storage.local.get({
        'bannedList': [],
        'saved_url': "",
        "saved_url_time": 0
    }, callback)
}

function resolveBySaved(storage) {
    savedUrl = storage['saved_url'];
    savedUrlTime = storage['saved_url_time'];
    banned = storage['bannedList'];
    now = new Date().getTime();
    if(((now - savedUrlTime) < 360000) && (banned.indexOf(savedUrl) === -1)) {
        console.log("resolved url from saved_url: " + savedUrl);
        advanceToTPB(savedUrl);
        return true;
    } 
    return false;
} 

function resolveByLookup(storage) {
    proxyBayRequest(storage, function(doc) {
        handleProxyBayDocument(doc, storage, advanceToTPB);
    }, function(status) {
        alert("Proxy List Down. Status: " + status);
    });
}

function proxyBayRequest(storage, success, fail=null) {
    if(fail === null){
        fail = function () {};
    }

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if(xhr.status === 200) {
                success(xhr.responseXML);
            } else {
                fail(xhr.status);
            }
        }
    } 
    xhr.open('GET', 'https://proxybay.github.io/');
    xhr.responseType = "document";
    xhr.timeout = 2000;
    xhr.send(null);

}

function quietLookup(storage) {
    proxyBayRequest(storage, function(doc) {
        handleProxyBayDocument(doc, storage, function(url) {
            checkURL(url, setSavedURL, function(url) {
                banURL(url, function() {
                    withStorage(quietLookup);
                });
            });
        });
    });
}

function handleProxyBayDocument(doc, storage, callback) {
    bannedList = storage['bannedList'];
    proxyList = doc.getElementById('proxyList').rows;
    fastestTime = 999999;
    fastestProxy = "";
    for(var i = 1 ; i < proxyList.length ; i++) {
        theRow = proxyList[i];
        speed = theRow.getElementsByClassName('speed')[0].innerText 
        if(speed === 'N/A') {
            continue;
        }

        proxyUrl = theRow.cells[0].getElementsByTagName('a')[0].href;

        if(bannedList.indexOf(proxyUrl) !== -1) {
            console.log("skipping banned proxy: " + proxyUrl);
            continue;
        }

        if(speed < fastestTime) {
            fastestTime = speed;
            fastestProxy = proxyUrl
        }
    }

    if(fastestProxy === "") {
        alert("No available proxies for the pirate bay");
    } else {
        console.log("resolved proxy by lookup: " + fastestProxy)
        callback(fastestProxy);
    }
}

function resolveProxy(storage) {
    resolveBySaved(storage) || resolveByLookup(storage)
}

browser.browserAction.onClicked.addListener(function(tab) {
    withStorage(resolveProxy);
});

browser.runtime.onConnect.addListener(function(port) {
    port.onMessage.addListener(function(msg) {
        parts = msg.split("$$");
        if(parts[0] === "checkURL") {
            checkURL(parts);
        } else if(parts[0] === "unbanURL") {
            unbanURL(parts[1]);
        } else if(parts[0] === "clearSaved") {
            clearSaved();
        }
    });
});

withStorage(quietLookup);
