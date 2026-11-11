
const observer = new MutationObserver(function(mutationsList) {
    for (let mutation of mutationsList) {
        if (mutation.addedNodes) {
            for (let addedNode of mutation.addedNodes) {
                if (addedNode.nodeType == Node.ELEMENT_NODE) {
                    /* TODO: implement */
                }
            }
        }
    }
});
observer.observe(document.body, { childList: true, subtree: true });
