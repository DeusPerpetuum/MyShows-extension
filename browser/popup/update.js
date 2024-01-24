async function getVersions() {
	const manifest = browser.runtime.getManifest();
	const updateElement = document.getElementById('version');
	updateElement.innerText = `v.${manifest.version}`
}

getVersions();
