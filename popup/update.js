async function getVersions() {
	const manifest = chrome.runtime.getManifest();
	const updateElement = document.getElementById('update');
	updateElement.innerText = `v.${manifest.version}`

	let xml = new XMLHttpRequest();
	xml.open("GET", `https://api.deusperpetuum.ru/extensions/update.php?myshows=id%3D${chrome.runtime.id}%26v%3D${manifest.version}`);
	xml.responseType = "document";
	xml.send();

	xml.onload = () => {
		if (xml.readyState === xml.DONE && xml.status === 200) {
			let apps = xml.responseXML.getElementsByTagName('app');
            for (let i = 0; apps.length > i; i++) {
                let app = apps.item(i);
                if (app.getAttribute('appid') != chrome.runtime.id) continue;
				if(!app.children.item(0)) continue;
                let lastVersion = app.children.item(0).getAttribute('version');
                let lastCodebase = app.children.item(0).getAttribute('codebase');
				if(lastVersion <= manifest.version) return;
				updateElement.innerText = `${chrome.i18n.getMessage("update_to")} ${lastVersion}`;
				updateElement.setAttribute("href", lastCodebase);
            }
		}
	};
}

getVersions();
