const bundleName = window.location.search.match(/(?:\?|\&)run=([a-zA-Z]+)/)?.[1] || 'landscape';
const { main } = await import(`./${bundleName}.bundle.js?`);
await main(document.querySelector('#app canvas'));
