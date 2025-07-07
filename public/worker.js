let counter = 0;
setInterval( () => {
  postMessage(++counter);
}, 10);
