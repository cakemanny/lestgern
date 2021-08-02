
window.importData = function () {
    let input = document.createElement('input');
    input.type = 'file';
    input.onchange = function () {
        const file = input.files[0];
        if (file) {
          file.text().then(text => {
            window.importedData = JSON.parse(text);
            console.log(
              'use the console to manually move keys from window.importedData',
              'to localStorage'
            )
            console.log('the following copies all keys');
            console.log(
              'for (let k of Object.keys(importedData)) { localStorage[k] = importedData[k] }'
            )
          });
        }
    }
    document.body.appendChild(input);
}


window.exportData = function () {
  let dataToExport = {};
  for (let k in localStorage) {
    if (k.startsWith('lestgern_')) {
      dataToExport[k] = localStorage[k];
    }
  }

  let blob = new Blob([JSON.stringify(dataToExport)], {type:"octet/stream"});

  let a = document.createElement("a");
  a.style = "display: none";
  document.body.appendChild(a);

  let url = URL.createObjectURL(blob);
  a.href = url;
  a.download = "lestgern-data.json";
  a.click();
  URL.revokeObjectURL(url);
}

