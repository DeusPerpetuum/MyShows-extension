function request(token, body) {
	let headers = new Headers();
	headers.append("Content-Type", "application/json");
	headers.append("Accept", "application/json");
	if (token) headers.append("Authorization2", `Bearer ${token}`);
	headers.append("host", "myshows.me");

	let requestOptions = {
		method: "POST",
		headers: headers,
		body: JSON.stringify(body),
		redirect: "follow",
	};

	return fetch("https://myshows.me/v3/rpc/", requestOptions)
		.then((response) => {
			return response.json();
		})
		.catch((error) => {
			return error;
		});
}

function refteshToken(refreshToken) {
	var myHeaders = new Headers();
	myHeaders.append("Accept", "*/*");
	myHeaders.append("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
	myHeaders.append("Sec-Fetch-Site", "same-site");
	myHeaders.append("Sec-Fetch-Mode", "cors");
	myHeaders.append("host", "myshows.me");

	var urlencoded = new URLSearchParams();
	urlencoded.append("client_id", "apidoc");
	urlencoded.append("client_secret", "apidoc");
	urlencoded.append("refresh_token", refreshToken);
	urlencoded.append("grant_type", "refresh_token");
	urlencoded.append("redirect_uri", "https%3A%2F%2Fapi.myshows.me%2Fshared%2Fdoc%2Fo2c.html");

	var requestOptions = {
		method: "POST",
		headers: myHeaders,
		body: urlencoded,
		redirect: "follow",
	};

	fetch("https://myshows.me/oauth/token", requestOptions).then((result) => {
		result.json().then((data) => {
			chrome.storage.sync
				.set({
					token: data.access_token,
					refresh_token: data.refresh_token,
					token_expires_in: Date.now() + data.expires_in,
				})
				.then(() => {
					checkToken();
				});
		});
	});
}

let watchedList = {};
let activity = {};
let token = "";
let login = "";
let avatar = "";
let activeShow_data = {};
let lastData = {};

function checkToken() {
	chrome.storage.sync.get(["token", "refresh_token", "token_expires_in"]).then((result) => {
		if (result.token == "" || !result.token || result.token == "error")
			return chrome.storage.sync.set({ token: "error" });

		if (!result.refresh_token) return chrome.storage.sync.set({ token: "error" });

		if (result.token_expires_in < Date.now()) return refteshToken(result.refresh_token);

		token = result.token;

		getProfileInfo();
	});
}

checkToken();

function getProfileInfo() {
	if (token == "" || token == "error") return;

	request(token, {
		jsonrpc: "2.0",
		method: "profile.Get",
		id: 1,
	}).then((profileData) => {
		avatar = profileData.result.user.avatar;
		login = profileData.result.user.login;
	});
}

function findShow(title) {
	return request(token, {
		jsonrpc: "2.0",
		method: "shows.Search",
		params: {
			query: title,
		},
		id: 1,
	}).then((show) => {
		return show.result[0];
	});
}

function getEpisodes(showID) {
	return request(token, {
		jsonrpc: "2.0",
		method: "shows.GetById",
		params: {
			showId: showID,
			withEpisodes: true,
		},
		id: 1,
	}).then((show) => {
		return show.result.episodes;
	});
}

function getEpisode(season, episode) {
	activeShow_data.episodes.forEach((ep) => {
		if (ep.seasonNumber == season && ep.episodeNumber == episode) {
			activeShow_data["currentEpisode"] = ep;
		}
	});
}

function checkEpisode(episodeID) {
	return request(token, {
		jsonrpc: "2.0",
		method: "manage.CheckEpisode",
		params: {
			id: episodeID,
			rating: 0,
		},
		id: 1,
	}).then((result) => {
		if (result.error) {
			if (result.error.code == 401) chrome.storage.sync.set({ token: "error" });
			return false;
		}

		return true;
	});
}

function getWatchedEpisodes(showID) {
	return request(token, {
		jsonrpc: "2.0",
		method: "profile.Episodes",
		params: {
			showId: showID,
		},
		id: 1,
	}).then((episodes) => {
		return episodes.result;
	});
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	switch (request.method) {
		case "get_activity":
			if (activeShow_data)
				if (activeShow_data.episodes) {
					let episodesWithoutSpecials = 0;

					activeShow_data.episodes.forEach((episode) => {
						if (!episode.isSpecial) episodesWithoutSpecials++;
					});

					activity.progress =
						(watchedList[activeShow_data.title].length * 100) / episodesWithoutSpecials;
				}

			sendResponse(activity);
			break;
		case "token_update":
			checkToken();
			break;
		case "get_profile_info":
			sendResponse({ url: avatar, login: login });
			break;
		case "set_activity":
			let msg = request.data;

			if (msg == null) {
				activity = {};
				activeShow_data = {};
				lastData = {};
				watchedList = {};
				return;
			}

			if (msg.episode == 0 && msg.season == 0) return (activity = {});

			if (lastData.SeriesName == msg.SeriesName)
				if (lastData.season == msg.season)
					if (lastData.episode == msg.episode)
						if (lastData.watched == msg.watched) return;

			if (lastData.watched == true) {
				msg.watched = false;
			}

			lastData = msg;

			if (msg.SeriesName.endsWith("Кинопоиск") || msg.SeriesName.endsWith("Кинопоиске")) {
				if (activeShow_data) if (activeShow_data.episodes) activity = {};
				return;
			}

			let seriesTitle = msg.SeriesName;

			seriesTitle.replace("— смотреть онлайн в хорошем качестве — Кинопоиск", "");
			seriesTitle.trimEnd();

			if (activeShow_data === undefined) activeShow_data = {};

			if (activeShow_data.title != seriesTitle) {
				checkToken();

				findShow(seriesTitle).then((show) => {
					activeShow_data = show;

					activity.name_ru = show.title;
					activity.name = show.titleOriginal;

					getEpisodes(activeShow_data.id, msg.episode, msg.season).then((episodes) => {
						if (!episodes) return;

						activeShow_data["episodes"] = episodes;

						if (watchedList[show.title]) return;
						getWatchedEpisodes(activeShow_data.id).then((watchedEpisodes) => {
							watchedList[activeShow_data.title] = watchedEpisodes;
						});
					});
				});
			}

			if (!activity.name) activity.name = activeShow_data.titleOriginal;
			if (!activity.name_ru) activity.name_ru = activeShow_data.title;
			activity.episode = msg.episode;
			activity.season = msg.season;

			if (msg.watched != true) return;
			getEpisode(msg.season, msg.episode);

			if (
				!JSON.stringify(watchedList[activeShow_data.title]).includes(
					`${activeShow_data.currentEpisode.id}`
				)
			) {
				checkToken();

				checkEpisode(activeShow_data.currentEpisode.id).then((result) => {
					watchedList[activeShow_data.title].push(activeShow_data.currentEpisode);
				});
			}

			break;
	}
});
