function setProfileInfo(url, login) {
	const avatar = document.getElementsByClassName("avatar").item(0);
	const name = document.getElementById("login");
	const login_not = chrome.i18n.getMessage("login_not_exist");

	avatar.src = url != null ? url : "imgs/avatar.png";
	name.textContent = login != null ? login : login_not;
}

function updateSeries(data) {
	let series = document.getElementById("series");
	let progress = document.getElementById("progress");
	let show_container = document.getElementsByClassName("series_container").item(0);
	const not_found = chrome.i18n.getMessage("not_found");
	const seasonText = chrome.i18n.getMessage("season");
	const episodeText = chrome.i18n.getMessage("episode");

	function nullAll() {
		series.innerText = not_found;
		progress.style.width = 0;
		show_container.firstChild.style.display = "none";
		return;
	}

	if (!data) return nullAll();

	if (data.episode == undefined && data.season == undefined) return nullAll();
	if (data.episode == 0 && data.season == 0) return nullAll();

	show_container.firstChild.style.display = "block";

	series.innerText = `${navigator.language == "ru-RU" ? data.name_localized : data.name},  ${data.season} ${seasonText} ${
		data.episode
	} ${episodeText}`;

	if (data.progress) progress.style.width = data.progress + "%";
}

function Init() {
	chrome.storage.sync.get(["token", "avatar", "login"]).then((result) => {
		if ((result.token != undefined || result.token != null) && result.token != "error") return setProfileInfo(result.avatar, result.login);

		const info = document.getElementsByClassName("container").item(0);
		info.style.display = "none";

		const authLink = document.getElementsByTagName("a").item(0);
		authLink.setAttribute(
			"href",
			`https://myshows.me/oauth/authorize?response_type=code&redirect_uri=https%3A%2F%2Fapi.myshows.me%2Fshared%2Fdoc%2Fo2c.html&client_id=apidoc&scope=basic&state=${Math.random()}`
		);
		authLink.style.display = "block";
		authLink.innerText = chrome.i18n.getMessage("login");

		document.body.appendChild(authLink);
	});

	(async () => {
		let response = await chrome.runtime.sendMessage({ method: "get_activity" });
		updateSeries(response);
	})();
}

Init();
